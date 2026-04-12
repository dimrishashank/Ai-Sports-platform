"""
Server-side video analysis using OpenCV + MediaPipe.
Counts reps from uploaded videos and gives a pass/flag verdict.

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
    print("⚠️  MediaPipe not available. Server-side video verification disabled.")


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


def analyze_video(video_path: str, test_type: str) -> dict:
    """
    Analyze a video file to count reps and check form quality.

    Returns:
        {
            "verified_reps": int,
            "confidence": float (0-1),
            "flags": [str],
            "verdict": "pass" or "flag",
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

    # Sample every Nth frame for speed (~10 checks per second)
    sample_rate = max(1, int(fps / 10))

    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    # Get joint configuration for this test type
    joint_config = _get_joint_config(test_type)

    rep_count = 0
    phase = "up"  # start assuming "up" position
    angles = []
    form_scores = []
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

            # Get the key angle for this test type
            angle = _compute_test_angle(landmarks, joint_config, frame.shape)
            angles.append(angle)

            # State machine for rep counting
            if joint_config["direction"] == "down_up":
                # Pushups / Sit-ups: angle goes down then up = 1 rep
                if phase == "up" and angle < joint_config["down_threshold"]:
                    phase = "down"
                elif phase == "down" and angle > joint_config["up_threshold"]:
                    phase = "up"
                    rep_count += 1

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

    # ── Compare against trained reference patterns ──────────────
    form_score = 1.0  # 1.0 = perfect, lower = worse
    try:
        from db import get_db
        db = get_db()
        ref = db.reference_patterns.find_one({"test_type": {"$regex": test_type, "$options": "i"}})
        
        if ref and angles:
            thresholds = ref.get("thresholds", {})
            angle_arr = angles  # list of angles from the analysis
            
            min_angle = min(angle_arr)
            max_angle = max(angle_arr)
            
            # Check angle range against reference
            angle_min_range = thresholds.get("angle_min_range", [0, 180])
            angle_max_range = thresholds.get("angle_max_range", [0, 180])
            
            if min_angle < angle_min_range[0] or min_angle > angle_min_range[1]:
                flags.append("unusual_min_angle")
                form_score -= 0.15
            if max_angle < angle_max_range[0] or max_angle > angle_max_range[1]:
                flags.append("incomplete_range_of_motion")
                form_score -= 0.2
            
            # Check body alignment
            if hasattr(angles, '__len__') and len(angles) > 0:
                body_range = thresholds.get("body_alignment_range", [100, 180])
                # We don't track body_line separately here, but visibility is a proxy
                if avg_form < thresholds.get("min_visibility", 0.5):
                    flags.append("form_below_trained_standard")
                    form_score -= 0.15
            
            # Boost confidence if form matches trained patterns well
            if form_score >= 0.8 and ref.get("correct_samples", 0) >= 2:
                confidence = min(1.0, confidence * 1.15)
                
            form_score = max(0, form_score)
            print(f"📊 Pattern match score: {form_score:.0%} (ref: {ref.get('correct_samples', 0)} correct, {ref.get('foul_samples', 0)} foul samples)")
    except Exception as e:
        # Reference patterns not available — use basic scoring
        pass

    # Verdict: pass or flag
    critical_flags = {"poor_pose_visibility", "too_few_frames_detected", "video_unreadable", "video_too_short"}
    form_flags = {"unusual_min_angle", "incomplete_range_of_motion", "form_below_trained_standard"}
    has_critical = bool(set(flags) & critical_flags)
    has_form_issues = bool(set(flags) & form_flags)

    if has_critical:
        verdict = "flag"
    elif has_form_issues and form_score < 0.6:
        verdict = "flag"  # Trained AI says form is poor
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
    """Get joint configuration for each test type."""
    test_lower = test_type.lower()

    if "push" in test_lower:
        return {
            "joints": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
            "direction": "down_up",
            "down_threshold": 100,
            "up_threshold": 150,
        }
    elif "sit" in test_lower:
        return {
            "joints": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
            "direction": "down_up",
            "down_threshold": 70,
            "up_threshold": 140,
        }
    elif "pull" in test_lower:
        return {
            "joints": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
            "direction": "down_up",
            "down_threshold": 80,   # Arms bent at top of pull-up
            "up_threshold": 150,    # Arms extended at bottom
        }
    else:
        # Default: elbow angle
        return {
            "joints": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
            "direction": "down_up",
            "down_threshold": 100,
            "up_threshold": 150,
        }


def _compute_test_angle(landmarks, config: dict, frame_shape) -> float:
    """Compute the angle for the configured joints."""
    joint_names = config["joints"]

    # Map joint names to MediaPipe landmark indices
    landmark_map = {
        "LEFT_SHOULDER": 11, "RIGHT_SHOULDER": 12,
        "LEFT_ELBOW": 13, "RIGHT_ELBOW": 14,
        "LEFT_WRIST": 15, "RIGHT_WRIST": 16,
        "LEFT_HIP": 23, "RIGHT_HIP": 24,
        "LEFT_KNEE": 25, "RIGHT_KNEE": 26,
        "LEFT_ANKLE": 27, "RIGHT_ANKLE": 28,
    }

    h, w = frame_shape[:2]
    points = []
    for name in joint_names:
        idx = landmark_map.get(name, 0)
        lm = landmarks[idx]
        points.append((lm.x * w, lm.y * h))

    if len(points) == 3:
        return calculate_angle(points[0], points[1], points[2])
    return 0
