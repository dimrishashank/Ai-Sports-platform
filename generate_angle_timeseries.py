"""
Generate Figure: Joint Angle Time Series with Rep Detection
============================================================
Usage:
    python generate_angle_timeseries.py <video_path> [exercise_type]

Example:
    python generate_angle_timeseries.py "path/to/pushup_video.mp4" pushups

Output:
    Saves 'angle_timeseries_rep_detection.png' in the Report/ folder
    (publication-quality, ready for LaTeX)
"""

import sys
import math
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

# ── MediaPipe setup ───────────────────────────────────────────────
try:
    import mediapipe as mp
    mp_pose = mp.solutions.pose
except ImportError:
    print("ERROR: mediapipe not installed. Run: pip install mediapipe")
    sys.exit(1)

# ── Joint configs (from trainer.py) ───────────────────────────────
JOINT_CONFIGS = {
    "pushups": {
        "primary_left": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
        "primary_right": ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
        "down_threshold": 120,
        "up_threshold": 140,
        "label": "Elbow Angle (Shoulder–Elbow–Wrist)",
    },
    "sit-ups": {
        "primary_left": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        "primary_right": ["RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_KNEE"],
        "down_threshold": 90,
        "up_threshold": 130,
        "label": "Torso Angle (Shoulder–Hip–Knee)",
    },
    "pull-ups": {
        "primary_left": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
        "primary_right": ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
        "down_threshold": 100,
        "up_threshold": 145,
        "label": "Elbow Angle (Shoulder–Elbow–Wrist)",
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


def calculate_angle(a, b, c):
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    dot = ba[0] * bc[0] + ba[1] * bc[1]
    mag_ba = math.sqrt(ba[0]**2 + ba[1]**2)
    mag_bc = math.sqrt(bc[0]**2 + bc[1]**2)
    if mag_ba * mag_bc == 0:
        return 0
    cos_angle = max(-1, min(1, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos_angle))


def get_angle(landmarks, joint_names, frame_shape):
    h, w = frame_shape[:2]
    points = []
    vis = []
    for name in joint_names:
        idx = LANDMARK_MAP.get(name, 0)
        lm = landmarks[idx]
        points.append((lm.x * w, lm.y * h))
        vis.append(lm.visibility)
    if min(vis) < 0.3:
        return None
    return calculate_angle(points[0], points[1], points[2])


def bilateral_angle(landmarks, left_joints, right_joints, frame_shape):
    left = get_angle(landmarks, left_joints, frame_shape)
    right = get_angle(landmarks, right_joints, frame_shape)
    if left is not None and right is not None:
        return (left + right) / 2.0
    elif left is not None:
        return left
    elif right is not None:
        return right
    return None


def process_video(video_path, exercise_type="pushups"):
    config = JOINT_CONFIGS.get(exercise_type, JOINT_CONFIGS["pushups"])
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERROR: Cannot open video: {video_path}")
        sys.exit(1)
    
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    sample_rate = max(1, int(fps / 15))
    
    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    
    angles = []
    times = []
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
            angle = bilateral_angle(
                results.pose_landmarks.landmark,
                config["primary_left"],
                config["primary_right"],
                frame.shape,
            )
            if angle is not None:
                angles.append(angle)
                times.append(frame_idx / fps)
        
        frame_idx += 1
    
    cap.release()
    pose.close()
    return np.array(angles), np.array(times), config


def detect_reps(angles, down_thresh, up_thresh, window=5):
    """FSM-based rep detection with smoothing."""
    # Smooth with moving average
    if len(angles) < window:
        return []
    kernel = np.ones(window) / window
    smoothed = np.convolve(angles, kernel, mode='same')
    
    state = "UP"
    reps = []
    current_rep_start = 0
    min_in_rep = None
    min_idx_in_rep = 0
    
    for i, val in enumerate(smoothed):
        if state == "UP" and val < down_thresh:
            state = "DOWN"
            current_rep_start = i
            min_in_rep = val
            min_idx_in_rep = i
        elif state == "DOWN":
            if val < min_in_rep:
                min_in_rep = val
                min_idx_in_rep = i
            if val > up_thresh:
                state = "UP"
                reps.append({
                    "start": current_rep_start,
                    "bottom": min_idx_in_rep,
                    "end": i,
                })
    
    return reps, smoothed


def plot_timeseries(angles, times, smoothed, reps, config, exercise_type, output_path):
    """Generate publication-quality angle time series plot."""
    fig, ax = plt.subplots(figsize=(8, 3.5), dpi=300)
    
    down_thresh = config["down_threshold"]
    up_thresh = config["up_threshold"]
    
    # Color the rep regions
    for i, rep in enumerate(reps):
        t_start = times[rep["start"]] if rep["start"] < len(times) else times[-1]
        t_end = times[rep["end"]] if rep["end"] < len(times) else times[-1]
        ax.axvspan(t_start, t_end, alpha=0.12, color='#2196F3', zorder=0)
        # Rep number label
        t_mid = (t_start + t_end) / 2
        ax.text(t_mid, max(angles) * 0.98, f'Rep {i+1}',
                ha='center', va='top', fontsize=8, fontweight='bold',
                color='#1565C0', zorder=5)
    
    # Raw angle (light)
    ax.plot(times, angles, color='#90CAF9', linewidth=0.8, alpha=0.6, label='Raw angle')
    
    # Smoothed angle (bold)
    ax.plot(times, smoothed[:len(times)], color='#1565C0', linewidth=1.8, label='Smoothed (5-pt MA)')
    
    # Mark rep bottoms
    for rep in reps:
        idx = rep["bottom"]
        if idx < len(times):
            ax.plot(times[idx], smoothed[idx], 'v', color='#D32F2F',
                    markersize=8, zorder=4, markeredgecolor='white', markeredgewidth=0.5)
    
    # Threshold lines
    ax.axhline(y=up_thresh, color='#4CAF50', linestyle='--', linewidth=1.2, alpha=0.8)
    ax.axhline(y=down_thresh, color='#FF9800', linestyle='--', linewidth=1.2, alpha=0.8)
    
    # Threshold labels on right side
    ax.text(times[-1] * 1.01, up_thresh, f'$\\theta_{{up}}$ = {up_thresh}°',
            va='center', fontsize=8, color='#388E3C', fontweight='bold')
    ax.text(times[-1] * 1.01, down_thresh, f'$\\theta_{{down}}$ = {down_thresh}°',
            va='center', fontsize=8, color='#F57C00', fontweight='bold')
    
    # FSM state annotations
    ax.text(0.01, 0.97, 'UP', transform=ax.transAxes, fontsize=7, va='top',
            color='#4CAF50', fontstyle='italic', alpha=0.6)
    ax.text(0.01, 0.03, 'DOWN', transform=ax.transAxes, fontsize=7, va='bottom',
            color='#FF9800', fontstyle='italic', alpha=0.6)
    
    # Labels and styling
    exercise_label = exercise_type.replace("-", " ").title()
    ax.set_xlabel('Time (seconds)', fontsize=10)
    ax.set_ylabel(f'{config["label"]} (°)', fontsize=10)
    ax.set_title(f'Joint Angle Time Series — {exercise_label} ({len(reps)} reps detected)',
                 fontsize=11, fontweight='bold', pad=10)
    
    ax.legend(loc='lower right', fontsize=8, framealpha=0.9)
    ax.set_xlim(times[0], times[-1])
    ax.margins(x=0.02)
    ax.grid(True, alpha=0.2, linewidth=0.5)
    ax.tick_params(labelsize=9)
    
    # Clean up spines
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight', pad_inches=0.1)
    plt.close()
    print(f"Saved: {output_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_angle_timeseries.py <video_path> [exercise_type]")
        print("  exercise_type: pushups (default), sit-ups, pull-ups")
        sys.exit(1)
    
    video_path = sys.argv[1]
    exercise_type = sys.argv[2] if len(sys.argv) > 2 else "pushups"
    
    print(f"Processing: {video_path}")
    print(f"Exercise:   {exercise_type}")
    
    angles, times, config = process_video(video_path, exercise_type)
    
    if len(angles) < 10:
        print(f"ERROR: Only {len(angles)} angle samples extracted. Need at least 10.")
        print("Check that the video shows a person doing the exercise with good visibility.")
        sys.exit(1)
    
    print(f"Extracted {len(angles)} angle samples over {times[-1]:.1f}s")
    
    reps, smoothed = detect_reps(angles, config["down_threshold"], config["up_threshold"])
    print(f"Detected {len(reps)} repetitions")
    
    output_path = "Report/angle_timeseries_rep_detection.png"
    plot_timeseries(angles, times, smoothed, reps, config, exercise_type, output_path)
    print("Done! Add this figure to your LaTeX with:")
    print("  \\includegraphics[width=\\columnwidth]{angle_timeseries_rep_detection.png}")


if __name__ == "__main__":
    main()
