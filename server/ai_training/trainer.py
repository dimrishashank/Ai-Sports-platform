"""
AI Training Module — Extracts exercise patterns from labeled videos
and builds reference models used to verify new athlete submissions.

This is the SINGLE source of truth for all AI training logic.
Called by:
  - routes/training.py  (HeadAdmin video upload API)
  - CLI:  python -m ai_training.trainer --test_type Pushups --label correct --video path.mp4

Flow:
  1. HeadAdmin uploads labeled video (correct / foul)
  2. extract_exercise_pattern() runs MediaPipe on every frame
  3. save_pattern_to_db() persists the extracted pattern
  4. _update_reference_patterns() recompiles gold-standard thresholds
  5. video_analysis.py uses those thresholds when scoring new uploads

Feature Set (v2 — Enhanced):
  - Bilateral joint angles (left + right averaged)
  - Full angle timeseries (stored for temporal analysis)
  - Angular velocity & acceleration
  - Per-rep quality metrics (depth, consistency, symmetry)
  - Body stability / sway measurement
  - Rep cadence regularity
  - Range-of-motion completeness
"""
import os
import sys
import math
import argparse
from datetime import datetime

import cv2
import numpy as np

try:
    import mediapipe as mp
    mp_pose = mp.solutions.pose
    HAS_MEDIAPIPE = True
except ImportError:
    HAS_MEDIAPIPE = False


# ── Joint configs per exercise ────────────────────────────────────
# Each exercise tracks primary, secondary, body_line angles on BOTH sides
JOINT_CONFIGS = {
    "pushups": {
        "primary_left": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
        "primary_right": ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
        "secondary_left": ["LEFT_HIP", "LEFT_SHOULDER", "LEFT_ELBOW"],
        "secondary_right": ["RIGHT_HIP", "RIGHT_SHOULDER", "RIGHT_ELBOW"],
        "body_line_left": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_ANKLE"],
        "body_line_right": ["RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_ANKLE"],
        "hip_sag": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],  # detects hip sagging
        "down_threshold": 120,
        "up_threshold": 140,
    },
    "sit-ups": {
        "primary_left": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        "primary_right": ["RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_KNEE"],
        "secondary_left": ["LEFT_HIP", "LEFT_SHOULDER", "LEFT_KNEE"],
        "secondary_right": ["RIGHT_HIP", "RIGHT_SHOULDER", "RIGHT_KNEE"],
        "body_line_left": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        "body_line_right": ["RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_KNEE"],
        "hip_sag": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        "down_threshold": 90,
        "up_threshold": 130,
    },
    "pull-ups": {
        "primary_left": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
        "primary_right": ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
        "secondary_left": ["LEFT_HIP", "LEFT_SHOULDER", "LEFT_ELBOW"],
        "secondary_right": ["RIGHT_HIP", "RIGHT_SHOULDER", "RIGHT_ELBOW"],
        "body_line_left": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        "body_line_right": ["RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_KNEE"],
        "hip_sag": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        "down_threshold": 100,
        "up_threshold": 145,
    },
}

LANDMARK_MAP = {
    "LEFT_SHOULDER": 11, "RIGHT_SHOULDER": 12,
    "LEFT_ELBOW": 13, "RIGHT_ELBOW": 14,
    "LEFT_WRIST": 15, "RIGHT_WRIST": 16,
    "LEFT_HIP": 23, "RIGHT_HIP": 24,
    "LEFT_KNEE": 25, "RIGHT_KNEE": 26,
    "LEFT_ANKLE": 27, "RIGHT_ANKLE": 28,
}


# ── Helpers ───────────────────────────────────────────────────────

def calculate_angle(a, b, c):
    """Calculate angle at point b given three 2-D landmarks (a, b, c)."""
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    dot = ba[0] * bc[0] + ba[1] * bc[1]
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    if mag_ba * mag_bc == 0:
        return 0
    cos_angle = max(-1, min(1, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))


def get_joint_points(landmarks, joint_names, frame_shape):
    h, w = frame_shape[:2]
    points = []
    visibilities = []
    for name in joint_names:
        idx = LANDMARK_MAP.get(name, 0)
        lm = landmarks[idx]
        points.append((lm.x * w, lm.y * h))
        visibilities.append(lm.visibility)
    return points, visibilities


def _safe_angle(landmarks, joint_names, frame_shape):
    """Compute angle only if all three joints are reasonably visible."""
    pts, vis = get_joint_points(landmarks, joint_names, frame_shape)
    if min(vis) < 0.3:
        return None
    return calculate_angle(pts[0], pts[1], pts[2])


def _bilateral_angle(landmarks, left_joints, right_joints, frame_shape):
    """Average left and right side angles for bilateral symmetry. 
    Falls back to whichever side is visible."""
    left = _safe_angle(landmarks, left_joints, frame_shape)
    right = _safe_angle(landmarks, right_joints, frame_shape)
    
    if left is not None and right is not None:
        return (left + right) / 2.0, abs(left - right)
    elif left is not None:
        return left, 0.0
    elif right is not None:
        return right, 0.0
    return None, None


def _array_stats(arr):
    """Compute comprehensive stats for a numpy array."""
    if len(arr) == 0:
        return {"min": 0, "max": 0, "mean": 0, "std": 0, "range": 0, "median": 0, "q25": 0, "q75": 0, "iqr": 0}
    a = np.array(arr)
    q25, q75 = np.percentile(a, [25, 75])
    return {
        "min": float(np.min(a)),
        "max": float(np.max(a)),
        "mean": float(np.mean(a)),
        "std": float(np.std(a)),
        "range": float(np.max(a) - np.min(a)),
        "median": float(np.median(a)),
        "q25": float(q25),
        "q75": float(q75),
        "iqr": float(q75 - q25),
    }


# ── Core extraction ───────────────────────────────────────────────

def extract_exercise_pattern(video_path: str, test_type: str) -> dict:
    """
    Extract detailed pose pattern from a video file.

    Returns a rich pattern dict containing:
      - Bilateral angle timeseries & stats
      - Angular velocity & acceleration
      - Per-rep quality metrics
      - Body stability / sway
      - Rep cadence regularity
      - Visibility stats
    """
    if not HAS_MEDIAPIPE:
        return {"error": "MediaPipe not available"}

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": f"Cannot open video: {video_path}"}

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps if fps > 0 else 0

    # Sample at ~15 fps for good temporal resolution
    sample_rate = max(1, int(fps / 15))

    # Resolve config key
    test_lower = test_type.lower().replace("-", "").replace(" ", "")
    config_key = None
    for key in JOINT_CONFIGS:
        if key.replace("-", "").replace(" ", "") in test_lower or test_lower in key.replace("-", "").replace(" ", ""):
            config_key = key
            break
    if not config_key:
        config_key = "pushups"

    config = JOINT_CONFIGS[config_key]

    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    # ── Collection arrays ──
    primary_angles = []        # bilateral averaged primary angle
    secondary_angles = []      # bilateral averaged secondary angle
    body_line_angles = []      # bilateral averaged body alignment
    hip_sag_angles = []        # hip sag detection
    bilateral_diffs = []       # left-right asymmetry per frame
    visibility_scores = []     # per-frame visibility
    timestamps = []            # seconds from start
    
    # Per-landmark tracking for stability
    shoulder_y_positions = []  # vertical shoulder position for sway detection

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % sample_rate != 0:
            frame_idx += 1
            continue

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb)

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark

            # Primary angle (bilateral)
            pa, pa_diff = _bilateral_angle(
                landmarks, config["primary_left"], config["primary_right"], frame.shape
            )
            if pa is not None:
                primary_angles.append(pa)
                bilateral_diffs.append(pa_diff)

                # Secondary angle
                sa, _ = _bilateral_angle(
                    landmarks, config["secondary_left"], config["secondary_right"], frame.shape
                )
                secondary_angles.append(sa if sa is not None else 0)

                # Body line angle
                bl, _ = _bilateral_angle(
                    landmarks, config["body_line_left"], config["body_line_right"], frame.shape
                )
                body_line_angles.append(bl if bl is not None else 0)

                # Hip sag
                hip = _safe_angle(landmarks, config["hip_sag"], frame.shape)
                hip_sag_angles.append(hip if hip is not None else 0)

                # Visibility
                vis = sum(1 for lm in landmarks if lm.visibility > 0.5) / 33.0
                visibility_scores.append(vis)

                timestamps.append(frame_idx / fps)

                # Shoulder tracking for stability
                left_sh = landmarks[LANDMARK_MAP["LEFT_SHOULDER"]]
                right_sh = landmarks[LANDMARK_MAP["RIGHT_SHOULDER"]]
                avg_sh_y = (left_sh.y + right_sh.y) / 2.0
                shoulder_y_positions.append(avg_sh_y)

        frame_idx += 1

    cap.release()
    pose.close()

    if len(primary_angles) < 5:
        return {"error": "Too few frames with detected pose"}

    # ── Compute derived features ──
    angles = np.array(primary_angles)
    
    # Angular velocity (degrees per second)
    if len(timestamps) > 1:
        dt = np.diff(timestamps)
        da = np.diff(angles)
        angular_velocity = da / np.where(dt > 0, dt, 0.001)
    else:
        angular_velocity = np.array([0])

    # Angular acceleration (degrees per second^2)
    if len(angular_velocity) > 1:
        dt2 = np.diff(timestamps[:-1]) if len(timestamps) > 2 else np.array([1])
        dv = np.diff(angular_velocity)
        angular_acceleration = dv / np.where(dt2[:len(dv)] > 0, dt2[:len(dv)], 0.001)
    else:
        angular_acceleration = np.array([0])

    # Rep counting with per-rep quality metrics
    rep_count, rep_metrics, rep_durations = _count_reps_enhanced(
        angles, timestamps, config.get("down_threshold", 100), config.get("up_threshold", 150)
    )

    # Body stability: std dev of shoulder position (lower = more stable)
    shoulder_stability = float(np.std(shoulder_y_positions)) if shoulder_y_positions else 0

    # Cadence regularity: std dev of rep durations (lower = more consistent)
    cadence_regularity = float(np.std(rep_durations)) if len(rep_durations) > 1 else 0

    # Smoothness score: inverse of mean absolute acceleration (higher = smoother)
    mean_abs_accel = float(np.mean(np.abs(angular_acceleration)))
    smoothness = 1.0 / (1.0 + mean_abs_accel / 100.0)

    pattern = {
        "test_type": test_type,
        "config_key": config_key,
        "frame_count": frame_idx,
        "analyzed_frames": len(primary_angles),
        "fps": fps,
        "duration_sec": round(duration_sec, 2),
        "rep_count": rep_count,

        # ── Angle statistics ──
        "angle_stats": {
            "primary": _array_stats(primary_angles),
            "secondary": _array_stats(secondary_angles),
            "body_line": _array_stats(body_line_angles),
            "hip_sag": _array_stats(hip_sag_angles),
        },

        # ── Bilateral symmetry ──
        "bilateral_symmetry": {
            "mean_diff": float(np.mean(bilateral_diffs)) if bilateral_diffs else 0,
            "max_diff": float(np.max(bilateral_diffs)) if bilateral_diffs else 0,
            "std_diff": float(np.std(bilateral_diffs)) if bilateral_diffs else 0,
        },

        # ── Angular velocity ──
        "angular_velocity": {
            "mean": float(np.mean(np.abs(angular_velocity))),
            "max": float(np.max(np.abs(angular_velocity))),
            "std": float(np.std(angular_velocity)),
        },

        # ── Angular acceleration ──
        "angular_acceleration": {
            "mean": float(np.mean(np.abs(angular_acceleration))),
            "max": float(np.max(np.abs(angular_acceleration))),
        },

        # ── Visibility ──
        "visibility": {
            "mean": float(np.mean(visibility_scores)),
            "min": float(np.min(visibility_scores)),
            "std": float(np.std(visibility_scores)),
        },

        # ── Per-rep metrics (up to 20 reps) ──
        "rep_metrics": rep_metrics[:20],
        "rep_durations": rep_durations[:20],
        "rep_duration_stats": {
            "mean": float(np.mean(rep_durations)) if rep_durations else 0,
            "std": float(np.std(rep_durations)) if rep_durations else 0,
            "min": float(np.min(rep_durations)) if rep_durations else 0,
            "max": float(np.max(rep_durations)) if rep_durations else 0,
        },

        # ── Derived quality scores ──
        "quality_scores": {
            "shoulder_stability": round(shoulder_stability, 6),
            "cadence_regularity": round(cadence_regularity, 4),
            "smoothness": round(smoothness, 4),
            "bilateral_score": round(1.0 - min(1.0, (float(np.mean(bilateral_diffs)) if bilateral_diffs else 0) / 30.0), 4),
        },

        # ── Full timeseries (trimmed to first 500 points for storage) ──
        "timeseries": {
            "primary_angles": [round(a, 2) for a in primary_angles[:500]],
            "timestamps": [round(t, 3) for t in timestamps[:500]],
        },
    }

    return pattern


def _count_reps_enhanced(angles, timestamps, down_thresh, up_thresh):
    """Count reps with per-rep quality metrics.
    
    Rep rule: wait for first stable UP position, then
    UP -> DOWN -> UP = 1 rep counted on return to UP.
    
    For each rep, we record:
      - min_angle (how deep the rep went)
      - max_angle (how high the return was)
      - range (depth of movement)
      - duration (seconds)
      - symmetry (how similar down-phase vs up-phase durations are)
    """
    kernel_size = 5
    if len(angles) >= kernel_size:
        kernel = np.ones(kernel_size) / kernel_size
        smoothed = np.convolve(angles, kernel, mode='same')
    else:
        smoothed = np.array(angles, dtype=float)

    # Wait for first stable "up" before counting
    phase = None
    reps = 0
    
    # Track phase transitions for per-rep metrics
    rep_data = []
    current_rep = {"start_idx": None, "down_idx": None, "end_idx": None, "angles": []}

    for i in range(len(smoothed)):
        if phase is None:
            if smoothed[i] > up_thresh:
                phase = "up"
                current_rep = {"start_idx": i, "down_idx": None, "end_idx": None, "angles": [smoothed[i]]}
        elif phase == "up":
            current_rep["angles"].append(smoothed[i])
            if smoothed[i] < down_thresh:
                phase = "down"
                current_rep["down_idx"] = i
        elif phase == "down":
            current_rep["angles"].append(smoothed[i])
            if smoothed[i] > up_thresh:
                phase = "up"
                reps += 1
                current_rep["end_idx"] = i
                rep_data.append(current_rep)
                current_rep = {"start_idx": i, "down_idx": None, "end_idx": None, "angles": [smoothed[i]]}

    # Build per-rep metrics
    rep_metrics = []
    rep_durations = []
    
    for rd in rep_data:
        start = rd["start_idx"]
        end = rd["end_idx"]
        down = rd["down_idx"]
        rep_angles = np.array(rd["angles"])
        
        if start is None or end is None:
            continue
            
        duration = timestamps[min(end, len(timestamps)-1)] - timestamps[start]
        rep_durations.append(float(duration))
        
        # Down-phase vs up-phase duration symmetry
        down_duration = timestamps[min(down, len(timestamps)-1)] - timestamps[start] if down else duration / 2
        up_duration = duration - down_duration
        symmetry = 1.0 - abs(down_duration - up_duration) / max(duration, 0.001)
        
        rep_metrics.append({
            "min_angle": float(np.min(rep_angles)),
            "max_angle": float(np.max(rep_angles)),
            "range": float(np.max(rep_angles) - np.min(rep_angles)),
            "duration": round(duration, 3),
            "down_duration": round(down_duration, 3),
            "up_duration": round(up_duration, 3),
            "symmetry": round(max(0, symmetry), 4),
            "mean_angle": round(float(np.mean(rep_angles)), 2),
        })

    return reps, rep_metrics, rep_durations


# ── Database persistence ──────────────────────────────────────────

def save_pattern_to_db(db, pattern: dict, label: str, video_name: str, expected_reps: int = None, gdrive_file_id: str = ""):
    """
    Save extracted pattern to MongoDB and update reference thresholds.
    
    Args:
        db: pymongo database instance
        pattern: output of extract_exercise_pattern()
        label: "correct" or "foul"
        video_name: name of the source video file
        expected_reps: admin-provided ground truth rep count (optional)
        gdrive_file_id: Google Drive file ID for video playback
    """
    ai_reps = pattern.get("rep_count", 0)
    quality = pattern.get("quality_scores", {})

    doc = {
        "test_type": pattern["test_type"],
        "label": label,
        "video_name": video_name,
        "pattern": pattern,
        "ai_rep_count": ai_reps,
        "expected_reps": expected_reps,
        "verified_rep_count": expected_reps if expected_reps is not None else ai_reps,
        "gdrive_file_id": gdrive_file_id,
        "quality_scores": quality,
        "created_at": datetime.utcnow(),
    }

    result = db.exercise_patterns.insert_one(doc)
    print(f"Pattern saved (ID: {result.inserted_id})")

    stats = pattern.get("angle_stats", {}).get("primary", {})
    print(f"   Test: {pattern['test_type']} | Label: {label}")
    print(f"   AI Reps: {ai_reps}")
    if expected_reps is not None:
        diff = abs(ai_reps - expected_reps)
        print(f"   Expected Reps: {expected_reps} (diff: {diff})")
    print(f"   Angle range: {stats.get('min', 0):.0f} - {stats.get('max', 0):.0f}")
    print(f"   Visibility: {pattern.get('visibility', {}).get('mean', 0):.0%}")
    print(f"   Smoothness: {quality.get('smoothness', 0):.2f}")
    print(f"   Bilateral: {quality.get('bilateral_score', 0):.2f}")
    print(f"   Stability: {quality.get('shoulder_stability', 0):.6f}")

    _update_reference_patterns(db, pattern["test_type"])


def _update_reference_patterns(db, test_type: str):
    """Compile all correct samples for a test type into rich reference thresholds."""
    correct_patterns = list(db.exercise_patterns.find({
        "test_type": {"$regex": test_type, "$options": "i"},
        "label": "correct"
    }))
    foul_patterns = list(db.exercise_patterns.find({
        "test_type": {"$regex": test_type, "$options": "i"},
        "label": "foul"
    }))

    if not correct_patterns:
        print("   No 'correct' samples yet -- need at least 1 to build reference")
        return

    # Collect stats from all correct patterns
    correct_mins = [p["pattern"]["angle_stats"]["primary"]["min"] for p in correct_patterns]
    correct_maxs = [p["pattern"]["angle_stats"]["primary"]["max"] for p in correct_patterns]
    correct_ranges = [p["pattern"]["angle_stats"]["primary"]["range"] for p in correct_patterns]
    correct_body = [p["pattern"]["angle_stats"]["body_line"]["mean"] for p in correct_patterns]
    correct_vis = [p["pattern"]["visibility"]["mean"] for p in correct_patterns]
    
    # Quality metrics from correct patterns
    correct_smoothness = [p["pattern"].get("quality_scores", {}).get("smoothness", 0) for p in correct_patterns]
    correct_stability = [p["pattern"].get("quality_scores", {}).get("shoulder_stability", 0) for p in correct_patterns]
    correct_bilateral = [p["pattern"].get("quality_scores", {}).get("bilateral_score", 0) for p in correct_patterns]
    correct_cadence = [p["pattern"].get("quality_scores", {}).get("cadence_regularity", 0) for p in correct_patterns]

    # Velocity stats
    correct_velocities = [p["pattern"].get("angular_velocity", {}).get("mean", 0) for p in correct_patterns]

    correct_durations = []
    for p in correct_patterns:
        d = p["pattern"].get("rep_duration_stats", {}).get("mean", 0)
        if d > 0:
            correct_durations.append(d)

    # Foul pattern stats (for contrast learning)
    foul_stats = {}
    if foul_patterns:
        foul_mins = [p["pattern"]["angle_stats"]["primary"]["min"] for p in foul_patterns]
        foul_maxs = [p["pattern"]["angle_stats"]["primary"]["max"] for p in foul_patterns]
        foul_stats = {
            "angle_min_mean": float(np.mean(foul_mins)),
            "angle_max_mean": float(np.mean(foul_maxs)),
            "sample_count": len(foul_patterns),
        }

    reference = {
        "test_type": test_type,
        "correct_samples": len(correct_patterns),
        "foul_samples": len(foul_patterns),
        
        # ── Angle thresholds ──
        "thresholds": {
            "angle_min_range": [float(np.min(correct_mins) - 10), float(np.max(correct_mins) + 10)],
            "angle_max_range": [float(np.min(correct_maxs) - 10), float(np.max(correct_maxs) + 10)],
            "angle_rom_range": [float(np.min(correct_ranges) * 0.7), float(np.max(correct_ranges) * 1.3)],
            "body_alignment_range": [float(np.mean(correct_body) - 20), float(np.mean(correct_body) + 20)],
            "min_visibility": float(np.min(correct_vis) * 0.8),
            "rep_duration_range": [
                float(np.mean(correct_durations) * 0.4) if correct_durations else 0.3,
                float(np.mean(correct_durations) * 2.5) if correct_durations else 8.0,
            ],
        },

        # ── Quality benchmarks (from correct samples) ──
        "quality_benchmarks": {
            "smoothness_min": float(np.min(correct_smoothness)) * 0.7 if correct_smoothness else 0,
            "smoothness_mean": float(np.mean(correct_smoothness)) if correct_smoothness else 0,
            "stability_max": float(np.max(correct_stability)) * 1.5 if correct_stability else 1.0,
            "stability_mean": float(np.mean(correct_stability)) if correct_stability else 0,
            "bilateral_min": float(np.min(correct_bilateral)) * 0.7 if correct_bilateral else 0,
            "cadence_max": float(np.max(correct_cadence)) * 2.0 if correct_cadence else 5.0,
            "velocity_mean": float(np.mean(correct_velocities)) if correct_velocities else 0,
            "velocity_max": float(np.max(correct_velocities)) * 1.5 if correct_velocities else 0,
        },

        # ── Foul contrast data ──
        "foul_stats": foul_stats,

        "updated_at": datetime.utcnow(),
    }

    db.reference_patterns.update_one(
        {"test_type": test_type},
        {"$set": reference},
        upsert=True
    )

    print(f"   Reference updated ({len(correct_patterns)} correct, {len(foul_patterns)} foul)")


def get_training_status(db) -> list:
    """Get training sample counts for every active test type."""
    test_types = list(db.test_types.find({"status": "active"}, {"_id": 0, "name": 1}))
    result = []

    for tt in test_types:
        name = tt["name"]
        correct = db.exercise_patterns.count_documents({
            "test_type": {"$regex": name, "$options": "i"},
            "label": "correct"
        })
        foul = db.exercise_patterns.count_documents({
            "test_type": {"$regex": name, "$options": "i"},
            "label": "foul"
        })
        ref = db.reference_patterns.find_one(
            {"test_type": {"$regex": name, "$options": "i"}},
            {"_id": 0, "updated_at": 1, "correct_samples": 1, "foul_samples": 1}
        )
        result.append({
            "test_type": name,
            "correct_samples": correct,
            "foul_samples": foul,
            "total_samples": correct + foul,
            "has_reference": ref is not None,
            "last_trained": ref["updated_at"].isoformat() if ref and ref.get("updated_at") else None,
        })

    return result


# ── CLI entry point ───────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train AI from sample exercise videos")
    parser.add_argument("--test_type", required=True, help="Test type: Pushups, Sit-ups, or Pull-ups")
    parser.add_argument("--label", required=True, choices=["correct", "foul"], help="correct = good form, foul = bad form")
    parser.add_argument("--video", required=True, help="Path to the video file")

    args = parser.parse_args()

    if not os.path.exists(args.video):
        print(f"Video file not found: {args.video}")
        sys.exit(1)

    # DB connection for CLI usage
    from pymongo import MongoClient
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
    load_dotenv(env_path)
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai_sports")
    client = MongoClient(mongo_uri, tls=True, tlsAllowInvalidCertificates=True)
    db = client.get_default_database()

    print(f"\nProcessing: {args.video}")
    print(f"   Test: {args.test_type} | Label: {args.label}")
    print("=" * 50)

    pattern = extract_exercise_pattern(args.video, args.test_type)

    if "error" in pattern:
        print(f"Error: {pattern['error']}")
        sys.exit(1)

    print(f"   Extracted {pattern['analyzed_frames']} frames, {pattern['rep_count']} reps")
    print(f"   Smoothness: {pattern['quality_scores']['smoothness']:.2f}")
    print(f"   Bilateral Score: {pattern['quality_scores']['bilateral_score']:.2f}")

    save_pattern_to_db(db, pattern, args.label, os.path.basename(args.video))
    print("\nDone! Pattern saved and reference updated.")
    client.close()
