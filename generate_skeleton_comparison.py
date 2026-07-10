"""
Generate Figure: Correct vs Foul Skeleton Comparison
=====================================================
Usage:
    python generate_skeleton_comparison.py <correct_video> <foul_video> [exercise_type]

Example:
    python generate_skeleton_comparison.py "correct_pushup.mp4" "foul_pushup.mp4" pushups

Output:
    Saves 'skeleton_correct_vs_foul.png' in the Report/ folder
    (publication-quality, ready for LaTeX)

It picks a representative frame from each video (the "bottom" of a rep)
and draws the MediaPipe skeleton with key angle annotations.
"""

import sys
import math
import cv2
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Arc

try:
    import mediapipe as mp
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
except ImportError:
    print("ERROR: mediapipe not installed. Run: pip install mediapipe")
    sys.exit(1)

# ── Joint configs (from trainer.py) ───────────────────────────────
JOINT_CONFIGS = {
    "pushups": {
        "primary_left": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
        "primary_right": ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
        "body_line_left": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_ANKLE"],
        "body_line_right": ["RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_ANKLE"],
        "down_threshold": 120,
        "angle_label": "Elbow",
        "bodyline_label": "Body Line",
    },
    "sit-ups": {
        "primary_left": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        "primary_right": ["RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_KNEE"],
        "body_line_left": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        "body_line_right": ["RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_KNEE"],
        "down_threshold": 90,
        "angle_label": "Torso",
        "bodyline_label": "Body Line",
    },
    "pull-ups": {
        "primary_left": ["LEFT_SHOULDER", "LEFT_ELBOW", "LEFT_WRIST"],
        "primary_right": ["RIGHT_SHOULDER", "RIGHT_ELBOW", "RIGHT_WRIST"],
        "body_line_left": ["LEFT_SHOULDER", "LEFT_HIP", "LEFT_KNEE"],
        "body_line_right": ["RIGHT_SHOULDER", "RIGHT_HIP", "RIGHT_KNEE"],
        "down_threshold": 100,
        "angle_label": "Elbow",
        "bodyline_label": "Body Line",
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

# Skeleton connections to draw
SKELETON_CONNECTIONS = [
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16),  # Arms
    (11, 23), (12, 24), (23, 24),  # Torso
    (23, 25), (25, 27), (24, 26), (26, 28),  # Legs
]


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


def get_lm_pixel(landmarks, name, h, w):
    idx = LANDMARK_MAP.get(name, 0)
    lm = landmarks[idx]
    return int(lm.x * w), int(lm.y * h), lm.visibility


def find_best_frame(video_path, exercise_type="pushups"):
    """Find the frame at the bottom of a rep (lowest primary angle)."""
    config = JOINT_CONFIGS.get(exercise_type, JOINT_CONFIGS["pushups"])
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERROR: Cannot open {video_path}")
        sys.exit(1)
    
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    sample_rate = max(1, int(fps / 10))
    
    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    
    best_frame = None
    best_landmarks = None
    best_angle = 999
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
            h, w = frame.shape[:2]
            
            # Get primary angle (use left side)
            joints = config["primary_left"]
            pts = []
            ok = True
            for name in joints:
                x, y, v = get_lm_pixel(landmarks, name, h, w)
                if v < 0.3:
                    ok = False
                    break
                pts.append((x, y))
            
            if ok and len(pts) == 3:
                angle = calculate_angle(pts[0], pts[1], pts[2])
                if angle < best_angle:
                    best_angle = angle
                    best_frame = frame.copy()
                    best_landmarks = landmarks
        
        frame_idx += 1
    
    cap.release()
    pose.close()
    return best_frame, best_landmarks, best_angle


def draw_skeleton_with_angles(frame, landmarks, config, exercise_type):
    """Draw a clean skeleton with angle annotations on the frame."""
    h, w = frame.shape[:2]
    canvas = frame.copy()
    
    # Draw skeleton connections
    for (i, j) in SKELETON_CONNECTIONS:
        lm_i = landmarks[i]
        lm_j = landmarks[j]
        if lm_i.visibility > 0.3 and lm_j.visibility > 0.3:
            x1, y1 = int(lm_i.x * w), int(lm_i.y * h)
            x2, y2 = int(lm_j.x * w), int(lm_j.y * h)
            cv2.line(canvas, (x1, y1), (x2, y2), (0, 255, 200), 3, cv2.LINE_AA)
    
    # Draw joint circles
    for idx in LANDMARK_MAP.values():
        lm = landmarks[idx]
        if lm.visibility > 0.3:
            x, y = int(lm.x * w), int(lm.y * h)
            cv2.circle(canvas, (x, y), 6, (255, 255, 255), -1, cv2.LINE_AA)
            cv2.circle(canvas, (x, y), 6, (0, 200, 180), 2, cv2.LINE_AA)
    
    # Compute and annotate primary angle (left side)
    joints = config["primary_left"]
    pts = []
    for name in joints:
        x, y, v = get_lm_pixel(landmarks, name, h, w)
        pts.append((x, y))
    
    if len(pts) == 3:
        angle = calculate_angle(pts[0], pts[1], pts[2])
        # Draw angle arc at vertex (pts[1])
        vx, vy = pts[1]
        # Angle label
        label = f'{config["angle_label"]}: {angle:.0f}°'
        cv2.putText(canvas, label, (vx + 15, vy - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 0), 2, cv2.LINE_AA)
        # Highlight vertex
        cv2.circle(canvas, (vx, vy), 10, (0, 255, 255), 3, cv2.LINE_AA)
    
    # Compute and annotate body line angle (left side)
    bl_joints = config["body_line_left"]
    bl_pts = []
    for name in bl_joints:
        x, y, v = get_lm_pixel(landmarks, name, h, w)
        bl_pts.append((x, y))
    
    if len(bl_pts) == 3:
        bl_angle = calculate_angle(bl_pts[0], bl_pts[1], bl_pts[2])
        bx, by = bl_pts[1]
        bl_label = f'{config["bodyline_label"]}: {bl_angle:.0f}°'
        cv2.putText(canvas, bl_label, (bx + 15, by + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (100, 255, 100), 2, cv2.LINE_AA)
    
    return canvas


def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_skeleton_comparison.py <correct_video> <foul_video> [exercise_type]")
        print("  exercise_type: pushups (default), sit-ups, pull-ups")
        sys.exit(1)
    
    correct_path = sys.argv[1]
    foul_path = sys.argv[2]
    exercise_type = sys.argv[3] if len(sys.argv) > 3 else "pushups"
    config = JOINT_CONFIGS.get(exercise_type, JOINT_CONFIGS["pushups"])
    
    print(f"Finding best frame from CORRECT video: {correct_path}")
    correct_frame, correct_lm, correct_angle = find_best_frame(correct_path, exercise_type)
    if correct_frame is None:
        print("ERROR: No usable frame found in correct video")
        sys.exit(1)
    print(f"  -> Best angle: {correct_angle:.1f} degrees")
    
    print(f"Finding best frame from FOUL video: {foul_path}")
    foul_frame, foul_lm, foul_angle = find_best_frame(foul_path, exercise_type)
    if foul_frame is None:
        print("ERROR: No usable frame found in foul video")
        sys.exit(1)
    print(f"  -> Best angle: {foul_angle:.1f} degrees")
    
    # Draw skeletons
    correct_annotated = draw_skeleton_with_angles(correct_frame, correct_lm, config, exercise_type)
    foul_annotated = draw_skeleton_with_angles(foul_frame, foul_lm, config, exercise_type)
    
    # Convert BGR→RGB for matplotlib
    correct_rgb = cv2.cvtColor(correct_annotated, cv2.COLOR_BGR2RGB)
    foul_rgb = cv2.cvtColor(foul_annotated, cv2.COLOR_BGR2RGB)
    
    # Plot side by side
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8, 4), dpi=300)
    
    exercise_label = exercise_type.replace("-", " ").title()
    
    ax1.imshow(correct_rgb)
    ax1.set_title(f'Correct Form', fontsize=12, fontweight='bold', color='#2E7D32', pad=8)
    ax1.axis('off')
    # Green border
    for spine in ax1.spines.values():
        spine.set_visible(True)
        spine.set_color('#4CAF50')
        spine.set_linewidth(3)
    
    ax2.imshow(foul_rgb)
    ax2.set_title(f'Foul Form', fontsize=12, fontweight='bold', color='#C62828', pad=8)
    ax2.axis('off')
    # Red border
    for spine in ax2.spines.values():
        spine.set_visible(True)
        spine.set_color('#EF5350')
        spine.set_linewidth(3)
    
    fig.suptitle(f'Skeleton Comparison — {exercise_label}',
                 fontsize=13, fontweight='bold', y=0.98)
    
    plt.tight_layout()
    output_path = "Report/skeleton_correct_vs_foul.png"
    plt.savefig(output_path, dpi=300, bbox_inches='tight', pad_inches=0.15,
                facecolor='white')
    plt.close()
    print(f"\nSaved: {output_path}")
    print("Add to LaTeX with:")
    print("  \\includegraphics[width=\\columnwidth]{skeleton_correct_vs_foul.png}")


if __name__ == "__main__":
    main()
