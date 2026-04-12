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
JOINT_CONFIGS = {
    "pushups": {
        "primary": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
        "secondary": ["LEFT_HIP", "LEFT_SHOULDER", "LEFT_ELBOW"],
        "body_line": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_ANKLE"],
    },
    "sit-ups": {
        "primary": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        "secondary": ["LEFT_HIP", "LEFT_SHOULDER", "LEFT_KNEE"],
        "body_line": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
    },
    "pull-ups": {
        "primary": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
        "secondary": ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
        "body_line": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
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
    for name in joint_names:
        idx = LANDMARK_MAP.get(name, 0)
        lm = landmarks[idx]
        points.append((lm.x * w, lm.y * h))
    return points


# ── Core extraction ───────────────────────────────────────────────

def extract_exercise_pattern(video_path: str, test_type: str) -> dict:
    """
    Extract detailed pose pattern from a video file.

    Returns a pattern dict containing angle series, stats, rep profiles,
    body alignment, visibility, and rep count.
    """
    if not HAS_MEDIAPIPE:
        return {"error": "MediaPipe not available"}

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": f"Cannot open video: {video_path}"}

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    sample_rate = max(1, int(fps / 12))

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

    primary_angles = []
    secondary_angles = []
    body_line_angles = []
    visibility_scores = []
    timestamps = []

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

            pts = get_joint_points(landmarks, config["primary"], frame.shape)
            primary_angles.append(calculate_angle(pts[0], pts[1], pts[2]))

            pts = get_joint_points(landmarks, config["secondary"], frame.shape)
            secondary_angles.append(calculate_angle(pts[0], pts[1], pts[2]))

            pts = get_joint_points(landmarks, config["body_line"], frame.shape)
            body_line_angles.append(calculate_angle(pts[0], pts[1], pts[2]))

            vis = sum(1 for lm in landmarks if lm.visibility > 0.5) / 33.0
            visibility_scores.append(vis)
            timestamps.append(frame_idx / fps)

        frame_idx += 1

    cap.release()
    pose.close()

    if len(primary_angles) < 5:
        return {"error": "Too few frames with detected pose"}

    angles = np.array(primary_angles)
    rep_count, rep_profiles, rep_durations = _count_reps_detailed(angles, timestamps)

    pattern = {
        "test_type": test_type,
        "config_key": config_key,
        "frame_count": frame_idx,
        "analyzed_frames": len(primary_angles),
        "fps": fps,
        "rep_count": rep_count,
        "angle_stats": {
            "primary": {
                "min": float(np.min(angles)),
                "max": float(np.max(angles)),
                "mean": float(np.mean(angles)),
                "std": float(np.std(angles)),
                "range": float(np.max(angles) - np.min(angles)),
            },
            "secondary": {
                "min": float(np.min(secondary_angles)),
                "max": float(np.max(secondary_angles)),
                "mean": float(np.mean(secondary_angles)),
                "std": float(np.std(secondary_angles)),
            },
            "body_line": {
                "min": float(np.min(body_line_angles)),
                "max": float(np.max(body_line_angles)),
                "mean": float(np.mean(body_line_angles)),
                "std": float(np.std(body_line_angles)),
            },
        },
        "visibility": {
            "mean": float(np.mean(visibility_scores)),
            "min": float(np.min(visibility_scores)),
        },
        "rep_profiles": rep_profiles,
        "rep_durations": rep_durations,
        "rep_duration_stats": {
            "mean": float(np.mean(rep_durations)) if rep_durations else 0,
            "std": float(np.std(rep_durations)) if rep_durations else 0,
        },
    }

    return pattern


def _count_reps_detailed(angles, timestamps):
    """Count reps and extract per-rep angle profiles and durations."""
    kernel_size = 5
    if len(angles) >= kernel_size:
        kernel = np.ones(kernel_size) / kernel_size
        smoothed = np.convolve(angles, kernel, mode='same')
    else:
        smoothed = angles

    median_angle = np.median(smoothed)
    phase = "up" if smoothed[0] > median_angle else "down"

    rep_starts = [0]
    reps = 0

    for i in range(1, len(smoothed)):
        if phase == "up" and smoothed[i] < median_angle - 10:
            phase = "down"
        elif phase == "down" and smoothed[i] > median_angle + 10:
            phase = "up"
            reps += 1
            rep_starts.append(i)

    rep_profiles = []
    rep_durations = []
    for i in range(len(rep_starts) - 1):
        start = rep_starts[i]
        end = rep_starts[i + 1]
        profile = smoothed[start:end].tolist()
        rep_profiles.append(profile)
        if timestamps:
            duration = timestamps[min(end, len(timestamps) - 1)] - timestamps[start]
            rep_durations.append(float(duration))

    return reps, rep_profiles[:10], rep_durations[:10]


# ── Database persistence ──────────────────────────────────────────

def save_pattern_to_db(db, pattern: dict, label: str, video_name: str, expected_reps: int = None):
    """
    Save extracted pattern to MongoDB and update reference thresholds.
    
    Args:
        db: pymongo database instance
        pattern: output of extract_exercise_pattern()
        label: "correct" or "foul"
        video_name: name of the source video file
        expected_reps: admin-provided ground truth rep count (optional)
    """
    ai_reps = pattern.get("rep_count", 0)

    doc = {
        "test_type": pattern["test_type"],
        "label": label,
        "video_name": video_name,
        "pattern": pattern,
        "ai_rep_count": ai_reps,
        "expected_reps": expected_reps,
        "verified_rep_count": expected_reps if expected_reps is not None else ai_reps,
        "created_at": datetime.utcnow(),
    }

    result = db.exercise_patterns.insert_one(doc)
    print(f"✅ Pattern saved (ID: {result.inserted_id})")

    stats = pattern.get("angle_stats", {}).get("primary", {})
    print(f"   Test: {pattern['test_type']} | Label: {label}")
    print(f"   AI Reps: {ai_reps}")
    if expected_reps is not None:
        diff = abs(ai_reps - expected_reps)
        print(f"   Expected Reps: {expected_reps} (diff: {diff})")
    print(f"   Angle range: {stats.get('min', 0):.0f}° – {stats.get('max', 0):.0f}°")
    print(f"   Visibility: {pattern.get('visibility', {}).get('mean', 0):.0%}")

    _update_reference_patterns(db, pattern["test_type"])


def _update_reference_patterns(db, test_type: str):
    """Compile all samples for a test type into reference thresholds."""
    correct_patterns = list(db.exercise_patterns.find({
        "test_type": {"$regex": test_type, "$options": "i"},
        "label": "correct"
    }))
    foul_patterns = list(db.exercise_patterns.find({
        "test_type": {"$regex": test_type, "$options": "i"},
        "label": "foul"
    }))

    if not correct_patterns:
        print("   ⚠️  No 'correct' samples yet — need at least 1 to build reference")
        return

    correct_mins = [p["pattern"]["angle_stats"]["primary"]["min"] for p in correct_patterns]
    correct_maxs = [p["pattern"]["angle_stats"]["primary"]["max"] for p in correct_patterns]
    correct_body = [p["pattern"]["angle_stats"]["body_line"]["mean"] for p in correct_patterns]
    correct_vis = [p["pattern"]["visibility"]["mean"] for p in correct_patterns]
    correct_durations = []
    for p in correct_patterns:
        d = p["pattern"].get("rep_duration_stats", {}).get("mean", 0)
        if d > 0:
            correct_durations.append(d)

    reference = {
        "test_type": test_type,
        "correct_samples": len(correct_patterns),
        "foul_samples": len(foul_patterns),
        "thresholds": {
            "angle_min_range": [float(np.min(correct_mins) - 10), float(np.max(correct_mins) + 10)],
            "angle_max_range": [float(np.min(correct_maxs) - 10), float(np.max(correct_maxs) + 10)],
            "body_alignment_range": [float(np.mean(correct_body) - 20), float(np.mean(correct_body) + 20)],
            "min_visibility": float(np.min(correct_vis) * 0.8),
            "rep_duration_range": [
                float(np.mean(correct_durations) * 0.5) if correct_durations else 0.3,
                float(np.mean(correct_durations) * 2.0) if correct_durations else 5.0,
            ],
        },
        "updated_at": datetime.utcnow(),
    }

    db.reference_patterns.update_one(
        {"test_type": test_type},
        {"$set": reference},
        upsert=True
    )

    print(f"   📊 Reference updated ({len(correct_patterns)} correct, {len(foul_patterns)} foul)")


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
        print(f"❌ Video file not found: {args.video}")
        sys.exit(1)

    # DB connection for CLI usage
    from pymongo import MongoClient
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
    load_dotenv(env_path)
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai_sports")
    client = MongoClient(mongo_uri, tls=True, tlsAllowInvalidCertificates=True)
    db = client.get_default_database()

    print(f"\n🎬 Processing: {args.video}")
    print(f"   Test: {args.test_type} | Label: {args.label}")
    print("=" * 50)

    pattern = extract_exercise_pattern(args.video, args.test_type)

    if "error" in pattern:
        print(f"❌ Error: {pattern['error']}")
        sys.exit(1)

    print(f"   ✅ Extracted {pattern['analyzed_frames']} frames, {pattern['rep_count']} reps")

    save_pattern_to_db(db, pattern, args.label, os.path.basename(args.video))
    print("\n🎉 Done! Pattern saved and reference updated.")
    client.close()
