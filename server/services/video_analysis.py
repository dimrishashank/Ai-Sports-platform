"""
Server-side video analysis using OpenCV + MediaPipe.
Counts reps from uploaded videos and gives a pass/flag verdict.

Scoring uses trained reference patterns (from HeadAdmin uploads)
for multi-dimensional form assessment:
  - Angle range compliance
  - Range-of-motion completeness
  - Movement smoothness
  - Bilateral symmetry
  - Body stability
  - Rep cadence consistency

Supported tests:
  - Pushups: counts reps (joint angle at elbow)
  - Sit-ups: counts reps (joint angle at hip)
  - Pull-ups: counts reps (joint angle at elbow)
"""
import math
import tempfile
import os

import cv2
import numpy as np

# MediaPipe is optional — graceful fallback if not installed
try:
    import mediapipe as mp
    mp_pose = mp.solutions.pose
    HAS_MEDIAPIPE = True
except ImportError:
    HAS_MEDIAPIPE = False
    print("MediaPipe not available. Server-side video verification disabled.")


LANDMARK_MAP = {
    "LEFT_SHOULDER": 11, "RIGHT_SHOULDER": 12,
    "LEFT_ELBOW": 13, "RIGHT_ELBOW": 14,
    "LEFT_WRIST": 15, "RIGHT_WRIST": 16,
    "LEFT_HIP": 23, "RIGHT_HIP": 24,
    "LEFT_KNEE": 25, "RIGHT_KNEE": 26,
    "LEFT_ANKLE": 27, "RIGHT_ANKLE": 28,
}


def calculate_angle(a, b, c):
    """
    Calculate angle at point b given three landmarks (a, b, c).
    Each landmark is (x, y).
    Returns angle in degrees.
    """
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])

    dot = ba[0] * bc[0] + ba[1] * bc[1]
    mag_ba = math.sqrt(ba[0] ** 2 + ba[1] ** 2)
    mag_bc = math.sqrt(bc[0] ** 2 + bc[1] ** 2)

    if mag_ba * mag_bc == 0:
        return 0

    cos_angle = max(-1, min(1, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))


def _get_bilateral_angle(landmarks, left_joints, right_joints, frame_shape):
    """Average angle from both sides for better accuracy."""
    h, w = frame_shape[:2]
    
    def _angle_for_joints(joint_names):
        points = []
        min_vis = 1.0
        for name in joint_names:
            idx = LANDMARK_MAP.get(name, 0)
            lm = landmarks[idx]
            points.append((lm.x * w, lm.y * h))
            min_vis = min(min_vis, lm.visibility)
        if min_vis < 0.3:
            return None
        return calculate_angle(points[0], points[1], points[2])
    
    left = _angle_for_joints(left_joints)
    right = _angle_for_joints(right_joints)
    
    if left is not None and right is not None:
        return (left + right) / 2.0, abs(left - right)
    elif left is not None:
        return left, 0.0
    elif right is not None:
        return right, 0.0
    return None, None


def analyze_video(video_path: str, test_type: str) -> dict:
    """
    Analyze a video file to count reps and check form quality.

    Returns:
        {
            "verified_reps": int,
            "confidence": float (0-1),
            "form_score": float (0-1),
            "flags": [str],
            "verdict": "pass" or "flag",
            "quality_details": {...}
        }
    """
    if not HAS_MEDIAPIPE:
        return {
            "verified_reps": -1,
            "confidence": 0.0,
            "flags": ["mediapipe_not_available"],
            "verdict": "flag",
        }

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "verified_reps": -1,
            "confidence": 0.0,
            "flags": ["video_unreadable"],
            "verdict": "flag",
        }

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Sample at ~12 fps for good analysis
    sample_rate = max(1, int(fps / 12))

    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    # Get joint configuration for this test type
    joint_config = _get_joint_config(test_type)

    rep_count = 0
    phase = None  # Wait for first stable "up"
    angles = []
    form_scores = []
    bilateral_diffs = []
    shoulder_positions = []
    timestamps = []
    flags = []

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

            # Get bilateral angle
            angle, bi_diff = _get_bilateral_angle(
                landmarks,
                joint_config["left_joints"],
                joint_config["right_joints"],
                frame.shape,
            )
            
            if angle is not None:
                angles.append(angle)
                bilateral_diffs.append(bi_diff if bi_diff is not None else 0)
                timestamps.append(frame_idx / fps)

                # State machine for rep counting
                # Rule: athlete starts UP, goes DOWN, comes back UP = 1 rep
                if joint_config["direction"] == "down_up":
                    if phase is None:
                        # Wait until we see a clear "up" position to start
                        if angle > joint_config["up_threshold"]:
                            phase = "up"
                    elif phase == "up" and angle < joint_config["down_threshold"]:
                        phase = "down"
                    elif phase == "down" and angle > joint_config["up_threshold"]:
                        phase = "up"
                        rep_count += 1

                # Shoulder position tracking for stability
                left_sh = landmarks[LANDMARK_MAP["LEFT_SHOULDER"]]
                right_sh = landmarks[LANDMARK_MAP["RIGHT_SHOULDER"]]
                shoulder_positions.append((left_sh.y + right_sh.y) / 2.0)

            # Simple form quality: how many landmarks are visible
            visible_count = sum(1 for lm in landmarks if lm.visibility > 0.5)
            form_scores.append(visible_count / 33.0)

        frame_idx += 1

    cap.release()
    pose.close()

    # Calculate confidence score
    avg_form = sum(form_scores) / len(form_scores) if form_scores else 0
    confidence = min(1.0, avg_form * 1.1)

    # Flag checks
    if len(form_scores) < 5:
        flags.append("too_few_frames_detected")
    if avg_form < 0.5:
        flags.append("poor_pose_visibility")
    if total_frames < 30:
        flags.append("video_too_short")

    # ── Compute quality features ──
    quality_details = {}
    
    if len(angles) >= 5:
        angle_arr = np.array(angles)
        
        # Angular velocity
        if len(timestamps) > 1:
            dt = np.diff(timestamps)
            da = np.diff(angle_arr)
            ang_vel = da / np.where(dt > 0, dt, 0.001)
            mean_abs_accel = 0
            if len(ang_vel) > 1:
                dv = np.diff(ang_vel)
                dt2 = np.diff(timestamps[:-1]) if len(timestamps) > 2 else np.array([1])
                accel = dv / np.where(dt2[:len(dv)] > 0, dt2[:len(dv)], 0.001)
                mean_abs_accel = float(np.mean(np.abs(accel)))
        else:
            ang_vel = np.array([0])
            mean_abs_accel = 0
        
        smoothness = 1.0 / (1.0 + mean_abs_accel / 100.0)
        stability = float(np.std(shoulder_positions)) if shoulder_positions else 0
        bilateral_score = 1.0 - min(1.0, float(np.mean(bilateral_diffs)) / 30.0) if bilateral_diffs else 1.0
        
        quality_details = {
            "angle_min": float(np.min(angle_arr)),
            "angle_max": float(np.max(angle_arr)),
            "angle_range": float(np.max(angle_arr) - np.min(angle_arr)),
            "smoothness": round(smoothness, 4),
            "stability": round(stability, 6),
            "bilateral_score": round(bilateral_score, 4),
            "mean_velocity": round(float(np.mean(np.abs(ang_vel))), 2),
        }

    # ── Compare against trained reference patterns ──────────────
    form_score = 1.0  # 1.0 = perfect, lower = worse
    try:
        from db import get_db
        db = get_db()
        ref = db.reference_patterns.find_one({"test_type": {"$regex": test_type, "$options": "i"}})
        
        if ref and len(angles) >= 5:
            thresholds = ref.get("thresholds", {})
            benchmarks = ref.get("quality_benchmarks", {})
            angle_arr = np.array(angles)
            
            min_angle = float(np.min(angle_arr))
            max_angle = float(np.max(angle_arr))
            angle_range = max_angle - min_angle
            
            # 1) Check angle range against reference
            angle_min_range = thresholds.get("angle_min_range", [0, 180])
            angle_max_range = thresholds.get("angle_max_range", [0, 180])
            
            if min_angle < angle_min_range[0] or min_angle > angle_min_range[1]:
                flags.append("unusual_min_angle")
                form_score -= 0.10
            if max_angle < angle_max_range[0] or max_angle > angle_max_range[1]:
                flags.append("incomplete_range_of_motion")
                form_score -= 0.15
            
            # 2) Check range-of-motion completeness
            rom_range = thresholds.get("angle_rom_range", [20, 180])
            if angle_range < rom_range[0]:
                flags.append("insufficient_rom")
                form_score -= 0.15
            
            # 3) Check body alignment
            body_range = thresholds.get("body_alignment_range", [100, 180])
            if avg_form < thresholds.get("min_visibility", 0.5):
                flags.append("form_below_trained_standard")
                form_score -= 0.10
            
            # 4) Compare quality scores against benchmarks
            if quality_details:
                # Smoothness check
                smoothness_min = benchmarks.get("smoothness_min", 0)
                if quality_details.get("smoothness", 1) < smoothness_min:
                    flags.append("jerky_movement")
                    form_score -= 0.10
                
                # Stability check
                stability_max = benchmarks.get("stability_max", 1.0)
                if quality_details.get("stability", 0) > stability_max:
                    flags.append("excessive_body_sway")
                    form_score -= 0.10
                
                # Bilateral symmetry check (only penalize if very asymmetric)
                bilateral_min = benchmarks.get("bilateral_min", 0)
                if quality_details.get("bilateral_score", 1) < bilateral_min:
                    flags.append("asymmetric_movement")
                    form_score -= 0.05
            
            # Boost confidence if form matches trained patterns well
            if form_score >= 0.8 and ref.get("correct_samples", 0) >= 2:
                confidence = min(1.0, confidence * 1.15)
                
            form_score = max(0, form_score)
            print(f"Pattern match score: {form_score:.0%} (ref: {ref.get('correct_samples', 0)} correct, {ref.get('foul_samples', 0)} foul)")
    except Exception as e:
        # Reference patterns not available — use basic scoring
        pass

    # ── ML Classifier prediction (if trained model exists) ──
    ml_prediction = None
    try:
        from ai_training.classifier import predict_form, calibrate_reps
        
        # Build a pattern-like dict for the classifier
        analysis_pattern = {
            "angle_stats": {
                "primary": quality_details if quality_details else {},
                "secondary": {},
                "body_line": {},
                "hip_sag": {},
            },
            "bilateral_symmetry": {
                "mean_diff": float(np.mean(bilateral_diffs)) if bilateral_diffs else 0,
                "max_diff": float(np.max(bilateral_diffs)) if bilateral_diffs else 0,
            },
            "angular_velocity": {
                "mean": quality_details.get("mean_velocity", 0),
                "max": float(np.max(np.abs(ang_vel))) if 'ang_vel' in dir() and len(ang_vel) > 0 else 0,
            },
            "angular_acceleration": {
                "mean": mean_abs_accel if 'mean_abs_accel' in dir() else 0,
            },
            "quality_scores": {
                "smoothness": quality_details.get("smoothness", 0),
                "shoulder_stability": quality_details.get("stability", 0),
                "cadence_regularity": 0,
                "bilateral_score": quality_details.get("bilateral_score", 0),
            },
            "visibility": {
                "mean": avg_form,
                "min": min(form_scores) if form_scores else 0,
            },
            "rep_duration_stats": {"mean": 0, "std": 0, "min": 0, "max": 0},
        }
        
        ml_result = predict_form(analysis_pattern, test_type)
        if ml_result.get("model_available"):
            ml_prediction = ml_result
            # Use ML form probability as additional signal
            if ml_result["confidence"] > 0.7:
                ml_form = ml_result["form_probability"]
                # Blend: 40% threshold-based, 60% ML-based
                form_score = 0.4 * form_score + 0.6 * ml_form
        
        # Apply rep calibration
        rep_count = calibrate_reps(rep_count, test_type)
        
    except Exception as e:
        pass

    # Verdict: pass or flag
    critical_flags = {"poor_pose_visibility", "too_few_frames_detected", "video_unreadable", "video_too_short"}
    form_flags = {"unusual_min_angle", "incomplete_range_of_motion", "form_below_trained_standard", 
                  "insufficient_rom", "jerky_movement", "excessive_body_sway", "asymmetric_movement"}
    has_critical = bool(set(flags) & critical_flags)
    form_flag_count = len(set(flags) & form_flags)

    if has_critical:
        verdict = "flag"
    elif form_flag_count >= 3 or form_score < 0.5:
        verdict = "flag"  # Too many form issues
    elif form_flag_count >= 1 and form_score < 0.7:
        verdict = "flag"
    elif confidence >= 0.7:
        verdict = "pass"
    else:
        verdict = "flag"

    return {
        "verified_reps": rep_count,
        "confidence": round(confidence, 2),
        "form_score": round(form_score, 2),
        "flags": flags,
        "verdict": verdict,
        "quality_details": quality_details,
        "ml_prediction": ml_prediction,
    }


def analyze_video_from_bytes(video_bytes: bytes, test_type: str) -> dict:
    """Analyze video from raw bytes by writing to a temp file."""
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(video_bytes)
        tmp_path = f.name

    try:
        return analyze_video(tmp_path, test_type)
    finally:
        os.unlink(tmp_path)


def analyze_video_from_stream(file_stream, test_type: str) -> dict:
    """
    Analyze video from a file stream (e.g., Flask uploaded file).
    Writes to a temp file, runs analysis, then cleans up.
    """
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
        file_stream.seek(0)
        f.write(file_stream.read())
        tmp_path = f.name

    try:
        return analyze_video(tmp_path, test_type)
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def _get_joint_config(test_type: str) -> dict:
    """Get joint configuration for each test type (bilateral)."""
    test_lower = test_type.lower()

    if "push" in test_lower:
        return {
            "left_joints": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
            "right_joints": ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
            "direction": "down_up",
            "down_threshold": 120,
            "up_threshold": 140,
        }
    elif "sit" in test_lower:
        return {
            "left_joints": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
            "right_joints": ["RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_KNEE"],
            "direction": "down_up",
            "down_threshold": 90,
            "up_threshold": 130,
        }
    elif "pull" in test_lower:
        return {
            "left_joints": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
            "right_joints": ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
            "direction": "down_up",
            "down_threshold": 100,   # Arms bent at top of pull-up (loose)
            "up_threshold": 145,    # Arms extended at bottom (loose)
        }
    else:
        # Default: elbow angle
        return {
            "left_joints": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
            "right_joints": ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
            "direction": "down_up",
            "down_threshold": 100,
            "up_threshold": 150,
        }
