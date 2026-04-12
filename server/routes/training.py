"""
AI Training routes — HeadAdmin-only endpoints for uploading
labeled training videos and checking training status.
"""
import os
import uuid
import tempfile
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from db import get_db
from ai_training.trainer import extract_exercise_pattern, save_pattern_to_db, get_training_status

training_bp = Blueprint("training", __name__, url_prefix="/api/training")


def _require_headadmin():
    """Only HeadAdmin can access training routes."""
    user_id = get_jwt_identity()
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") != "headadmin":
        return None, (jsonify({"error": "Head Admin access required"}), 403)
    return user, None


@training_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_training_video():
    """
    Upload a labeled training video for a specific test type.

    Form fields:
      - test_type: str (e.g. "Pushups", "Sit-ups", "Pull-ups")
      - label: str ("correct" or "foul")
      - video: file
    """
    _, err = _require_headadmin()
    if err:
        return err

    db = get_db()

    test_type = request.form.get("test_type", "")
    label = request.form.get("label", "")
    video_file = request.files.get("video")
    expected_reps_raw = request.form.get("expected_reps", "")

    # Parse expected reps (optional)
    expected_reps = None
    if expected_reps_raw and expected_reps_raw.strip():
        try:
            expected_reps = int(expected_reps_raw)
        except (ValueError, TypeError):
            pass

    if not test_type:
        return jsonify({"error": "test_type is required"}), 400
    if label not in ("correct", "foul"):
        return jsonify({"error": "label must be 'correct' or 'foul'"}), 400
    if not video_file:
        return jsonify({"error": "Video file is required"}), 400

    # Save to temp file for processing
    ext = video_file.filename.rsplit(".", 1)[-1] if "." in video_file.filename else "mp4"
    tmp_path = os.path.join(tempfile.gettempdir(), f"train_{uuid.uuid4().hex[:8]}.{ext}")

    try:
        video_file.save(tmp_path)

        # Extract exercise pattern using the AI training module
        pattern = extract_exercise_pattern(tmp_path, test_type)

        if "error" in pattern:
            return jsonify({"error": f"Analysis failed: {pattern['error']}"}), 422

        # Save to database and update reference patterns
        save_pattern_to_db(db, pattern, label, video_file.filename or "upload.mp4", expected_reps=expected_reps)

        ai_reps = pattern.get("rep_count", 0)
        rep_diff = abs(ai_reps - expected_reps) if expected_reps is not None else None

        return jsonify({
            "message": f"Training video processed successfully",
            "result": {
                "test_type": test_type,
                "label": label,
                "reps_detected": ai_reps,
                "expected_reps": expected_reps,
                "rep_difference": rep_diff,
                "frames_analyzed": pattern.get("analyzed_frames", 0),
                "visibility": round(pattern.get("visibility", {}).get("mean", 0) * 100),
            }
        }), 201

    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@training_bp.route("/status", methods=["GET"])
@jwt_required()
def training_status():
    """Return training sample counts per active test type."""
    _, err = _require_headadmin()
    if err:
        return err

    db = get_db()
    status = get_training_status(db)

    return jsonify({"training": status})


@training_bp.route("/export-dataset", methods=["GET"])
@jwt_required()
def export_training_dataset():
    """
    Export the full AI training dataset as JSON.
    HeadAdmin only. Returns all exercise_patterns documents
    with pattern statistics flattened for easy consumption.
    """
    _, err = _require_headadmin()
    if err:
        return err

    db = get_db()
    patterns = list(db.exercise_patterns.find({}).sort("created_at", -1))

    dataset = []
    for p in patterns:
        pat = p.get("pattern", {})
        primary = pat.get("angle_stats", {}).get("primary", {})
        body_line = pat.get("angle_stats", {}).get("body_line", {})
        vis = pat.get("visibility", {})
        rep_dur = pat.get("rep_duration_stats", {})

        dataset.append({
            "id": str(p["_id"]),
            "source": "training_upload",
            "test_type": p.get("test_type", ""),
            "label": p.get("label", ""),
            "video_name": p.get("video_name", ""),
            "ai_rep_count": p.get("ai_rep_count", pat.get("rep_count", 0)),
            "admin_rep_count": p.get("expected_reps"),
            "verified_rep_count": p.get("verified_rep_count", pat.get("rep_count", 0)),
            "analyzed_frames": pat.get("analyzed_frames", 0),
            "fps": pat.get("fps", 0),
            "primary_angle_min": round(primary.get("min", 0), 2),
            "primary_angle_max": round(primary.get("max", 0), 2),
            "primary_angle_mean": round(primary.get("mean", 0), 2),
            "primary_angle_std": round(primary.get("std", 0), 2),
            "primary_angle_range": round(primary.get("range", 0), 2),
            "body_line_mean": round(body_line.get("mean", 0), 2),
            "body_line_std": round(body_line.get("std", 0), 2),
            "visibility_mean": round(vis.get("mean", 0), 4),
            "visibility_min": round(vis.get("min", 0), 4),
            "rep_duration_mean": round(rep_dur.get("mean", 0), 3),
            "rep_duration_std": round(rep_dur.get("std", 0), 3),
            "created_at": p.get("created_at", "").isoformat() if p.get("created_at") else "",
        })

    # Also include rep verification data from submissions
    reviewed_subs = list(db.submissions.find(
        {"admin_rep_count": {"$exists": True}},
    ).sort("rep_verified_at", -1))

    for s in reviewed_subs:
        ai_reps = s.get("score", 0)
        admin_reps = s.get("admin_rep_count")
        verified = admin_reps if admin_reps is not None else ai_reps

        dataset.append({
            "id": str(s["_id"]),
            "source": "submission_review",
            "test_type": s.get("test_type", ""),
            "label": s.get("status", ""),
            "video_name": "",
            "ai_rep_count": ai_reps,
            "admin_rep_count": admin_reps,
            "verified_rep_count": verified,
            "analyzed_frames": 0,
            "fps": 0,
            "primary_angle_min": 0,
            "primary_angle_max": 0,
            "primary_angle_mean": 0,
            "primary_angle_std": 0,
            "primary_angle_range": 0,
            "body_line_mean": 0,
            "body_line_std": 0,
            "visibility_mean": 0,
            "visibility_min": 0,
            "rep_duration_mean": 0,
            "rep_duration_std": 0,
            "created_at": s.get("rep_verified_at", "").isoformat() if s.get("rep_verified_at") else s.get("date", ""),
        })

    return jsonify({"dataset": dataset, "total": len(dataset)})

