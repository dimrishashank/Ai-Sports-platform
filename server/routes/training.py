"""
AI Training routes — HeadAdmin-only endpoints for uploading
labeled training videos and checking training status.

Training videos are now stored on Google Drive inside a
"AI Training Videos" subfolder (created automatically).
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
from storage import get_drive_service, get_video_url
from config import Config

training_bp = Blueprint("training", __name__, url_prefix="/api/training")

# Cache the training folder ID
_training_folder_id = None


def _get_training_folder_id():
    """Get or create a 'AI Training Videos' subfolder inside the main Drive folder."""
    global _training_folder_id
    if _training_folder_id:
        return _training_folder_id

    service = get_drive_service()
    if not service:
        return None

    parent_id = Config.GOOGLE_DRIVE_FOLDER_ID
    if not parent_id:
        return None

    # Check if the subfolder already exists
    try:
        query = f"name='AI Training Videos' and '{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(q=query, fields="files(id, name)").execute()
        files = results.get("files", [])
        if files:
            _training_folder_id = files[0]["id"]
            return _training_folder_id
    except Exception as e:
        print(f"Error searching for training folder: {e}")

    # Create the subfolder
    try:
        folder_metadata = {
            "name": "AI Training Videos",
            "mimeType": "application/vnd.google-apps.folder",
            "parents": [parent_id],
        }
        folder = service.files().create(body=folder_metadata, fields="id, name").execute()
        _training_folder_id = folder.get("id")
        print(f"Created 'AI Training Videos' subfolder (ID: {_training_folder_id})")
        return _training_folder_id
    except Exception as e:
        print(f"Failed to create training subfolder: {e}")
        return None


def _upload_training_video_to_drive(file_stream, filename, content_type="video/mp4"):
    """Upload a training video to Google Drive in the AI Training Videos subfolder."""
    from googleapiclient.http import MediaIoBaseUpload

    service = get_drive_service()
    if not service:
        return ""

    folder_id = _get_training_folder_id()
    if not folder_id:
        return ""

    if hasattr(file_stream, "seek"):
        try:
            file_stream.seek(0)
        except Exception:
            pass

    file_metadata = {
        "name": filename,
        "parents": [folder_id],
    }
    media = MediaIoBaseUpload(file_stream, mimetype=content_type, resumable=True)

    try:
        file = service.files().create(
            body=file_metadata, media_body=media, fields="id"
        ).execute()
        file_id = file.get("id")

        # Make readable by anyone with the link
        service.permissions().create(
            fileId=file_id,
            body={"role": "reader", "type": "anyone", "allowFileDiscovery": False},
        ).execute()

        print(f"Training video uploaded to Drive: {file_id}")
        return file_id
    except Exception as e:
        print(f"Training video upload failed: {e}")
        return ""


def _delete_training_video_from_drive(gdrive_file_id):
    """Delete a training video from Google Drive."""
    service = get_drive_service()
    if not service or not gdrive_file_id:
        return
    try:
        service.files().delete(fileId=gdrive_file_id).execute()
        print(f"Deleted training video from Drive: {gdrive_file_id}")
    except Exception as e:
        print(f"Failed to delete training video from Drive: {e}")


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
    Video is saved to Google Drive AND processed by the AI trainer.
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

    original_filename = video_file.filename or "upload.mp4"
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "mp4"
    
    # Create a unique filename
    unique_name = f"train_{test_type.lower().replace(' ', '_')}_{label}_{uuid.uuid4().hex[:8]}.{ext}"

    # Save to temp file for AI processing
    tmp_path = os.path.join(tempfile.gettempdir(), f"train_{uuid.uuid4().hex[:8]}.{ext}")

    try:
        video_file.save(tmp_path)

        # 1) Upload to Google Drive
        with open(tmp_path, "rb") as f:
            import io
            gdrive_file_id = _upload_training_video_to_drive(
                io.BytesIO(f.read()),
                unique_name,
                video_file.content_type or "video/mp4",
            )

        # 2) Extract exercise pattern using the AI training module
        pattern = extract_exercise_pattern(tmp_path, test_type)

        if "error" in pattern:
            return jsonify({"error": f"Analysis failed: {pattern['error']}"}), 422

        # 3) Save to database — include the Drive file ID for playback
        save_pattern_to_db(
            db, pattern, label, original_filename,
            expected_reps=expected_reps,
            gdrive_file_id=gdrive_file_id,
        )

        ai_reps = pattern.get("rep_count", 0)
        rep_diff = abs(ai_reps - expected_reps) if expected_reps is not None else None

        return jsonify({
            "message": "Training video processed successfully",
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
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@training_bp.route("/samples", methods=["GET"])
@jwt_required()
def list_training_samples():
    """Return training samples, optionally filtered by test_type."""
    _, err = _require_headadmin()
    if err:
        return err

    db = get_db()
    test_type = request.args.get("test_type")

    query = {}
    if test_type:
        query["test_type"] = {"$regex": test_type, "$options": "i"}

    patterns = list(db.exercise_patterns.find(query).sort("created_at", -1))

    samples = []
    for p in patterns:
        pat = p.get("pattern", {})
        samples.append({
            "id": str(p["_id"]),
            "test_type": p.get("test_type", ""),
            "label": p.get("label", ""),
            "video_name": p.get("video_name", ""),
            "ai_rep_count": p.get("ai_rep_count", pat.get("rep_count", 0)),
            "expected_reps": p.get("expected_reps"),
            "verified_rep_count": p.get("verified_rep_count", pat.get("rep_count", 0)),
            "gdrive_file_id": p.get("gdrive_file_id", ""),
            "frames_analyzed": pat.get("analyzed_frames", 0),
            "visibility": round(pat.get("visibility", {}).get("mean", 0) * 100),
            "created_at": p.get("created_at", "").isoformat() + "Z" if isinstance(p.get("created_at"), datetime) else str(p.get("created_at", "")),
        })

    return jsonify({"samples": samples})


@training_bp.route("/samples/<sample_id>", methods=["PATCH"])
@jwt_required()
def update_training_sample(sample_id):
    """Update expected_reps on a training sample and rebuild reference patterns."""
    _, err = _require_headadmin()
    if err:
        return err

    db = get_db()
    data = request.get_json()
    expected_reps = data.get("expected_reps")

    if expected_reps is None:
        return jsonify({"error": "expected_reps is required"}), 400

    try:
        expected_reps = int(expected_reps)
    except (ValueError, TypeError):
        return jsonify({"error": "expected_reps must be a number"}), 400

    sample = db.exercise_patterns.find_one({"_id": ObjectId(sample_id)})
    if not sample:
        return jsonify({"error": "Sample not found"}), 404

    db.exercise_patterns.update_one(
        {"_id": ObjectId(sample_id)},
        {"$set": {
            "expected_reps": expected_reps,
            "verified_rep_count": expected_reps,
        }},
    )

    # Rebuild reference patterns
    from ai_training.trainer import _update_reference_patterns
    _update_reference_patterns(db, sample["test_type"])

    return jsonify({"message": "Expected reps updated", "expected_reps": expected_reps})


@training_bp.route("/samples/<sample_id>", methods=["DELETE"])
@jwt_required()
def delete_training_sample(sample_id):
    """Delete a training sample and its Drive video, then rebuild reference patterns."""
    _, err = _require_headadmin()
    if err:
        return err

    db = get_db()
    sample = db.exercise_patterns.find_one({"_id": ObjectId(sample_id)})
    if not sample:
        return jsonify({"error": "Sample not found"}), 404

    # Delete video from Google Drive  
    gdrive_id = sample.get("gdrive_file_id")
    if gdrive_id:
        _delete_training_video_from_drive(gdrive_id)

    test_type = sample["test_type"]
    db.exercise_patterns.delete_one({"_id": ObjectId(sample_id)})

    # Rebuild reference patterns
    from ai_training.trainer import _update_reference_patterns
    remaining = db.exercise_patterns.count_documents({"test_type": {"$regex": test_type, "$options": "i"}, "label": "correct"})
    if remaining > 0:
        _update_reference_patterns(db, test_type)
    else:
        # No more correct samples — remove the reference entirely
        db.reference_patterns.delete_one({"test_type": test_type})

    return jsonify({"message": "Training sample deleted"})


@training_bp.route("/samples/<sample_id>/video", methods=["GET"])
@jwt_required()
def get_training_video(sample_id):
    """Get video streaming URL for a training sample."""
    _, err = _require_headadmin()
    if err:
        return err

    db = get_db()
    sample = db.exercise_patterns.find_one({"_id": ObjectId(sample_id)})
    if not sample:
        return jsonify({"error": "Sample not found"}), 404

    gdrive_id = sample.get("gdrive_file_id")
    if not gdrive_id:
        return jsonify({"error": "No video stored for this sample"}), 404

    url = get_video_url(gdrive_id)
    return jsonify({"url": url})


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
        secondary = pat.get("angle_stats", {}).get("secondary", {})
        body_line = pat.get("angle_stats", {}).get("body_line", {})
        hip_sag = pat.get("angle_stats", {}).get("hip_sag", {})
        vis = pat.get("visibility", {})
        rep_dur = pat.get("rep_duration_stats", {})
        bilateral = pat.get("bilateral_symmetry", {})
        ang_vel = pat.get("angular_velocity", {})
        ang_accel = pat.get("angular_acceleration", {})
        quality = pat.get("quality_scores", {})

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
            "duration_sec": pat.get("duration_sec", 0),
            # Primary angle (bilateral averaged)
            "primary_angle_min": round(primary.get("min", 0), 2),
            "primary_angle_max": round(primary.get("max", 0), 2),
            "primary_angle_mean": round(primary.get("mean", 0), 2),
            "primary_angle_std": round(primary.get("std", 0), 2),
            "primary_angle_range": round(primary.get("range", 0), 2),
            "primary_angle_median": round(primary.get("median", 0), 2),
            "primary_angle_iqr": round(primary.get("iqr", 0), 2),
            # Secondary angle
            "secondary_angle_mean": round(secondary.get("mean", 0), 2),
            "secondary_angle_std": round(secondary.get("std", 0), 2),
            # Body line
            "body_line_mean": round(body_line.get("mean", 0), 2),
            "body_line_std": round(body_line.get("std", 0), 2),
            # Hip sag
            "hip_sag_mean": round(hip_sag.get("mean", 0), 2),
            "hip_sag_std": round(hip_sag.get("std", 0), 2),
            # Bilateral symmetry
            "bilateral_diff_mean": round(bilateral.get("mean_diff", 0), 2),
            "bilateral_diff_max": round(bilateral.get("max_diff", 0), 2),
            # Angular velocity
            "angular_velocity_mean": round(ang_vel.get("mean", 0), 2),
            "angular_velocity_max": round(ang_vel.get("max", 0), 2),
            # Angular acceleration
            "angular_accel_mean": round(ang_accel.get("mean", 0), 2),
            # Visibility
            "visibility_mean": round(vis.get("mean", 0), 4),
            "visibility_min": round(vis.get("min", 0), 4),
            # Rep timing
            "rep_duration_mean": round(rep_dur.get("mean", 0), 3),
            "rep_duration_std": round(rep_dur.get("std", 0), 3),
            "rep_duration_min": round(rep_dur.get("min", 0), 3),
            "rep_duration_max": round(rep_dur.get("max", 0), 3),
            # Quality scores
            "smoothness": round(quality.get("smoothness", 0), 4),
            "shoulder_stability": round(quality.get("shoulder_stability", 0), 6),
            "cadence_regularity": round(quality.get("cadence_regularity", 0), 4),
            "bilateral_score": round(quality.get("bilateral_score", 0), 4),
            # Metadata
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
            "analyzed_frames": 0, "fps": 0, "duration_sec": 0,
            "primary_angle_min": 0, "primary_angle_max": 0, "primary_angle_mean": 0,
            "primary_angle_std": 0, "primary_angle_range": 0, "primary_angle_median": 0, "primary_angle_iqr": 0,
            "secondary_angle_mean": 0, "secondary_angle_std": 0,
            "body_line_mean": 0, "body_line_std": 0,
            "hip_sag_mean": 0, "hip_sag_std": 0,
            "bilateral_diff_mean": 0, "bilateral_diff_max": 0,
            "angular_velocity_mean": 0, "angular_velocity_max": 0,
            "angular_accel_mean": 0,
            "visibility_mean": 0, "visibility_min": 0,
            "rep_duration_mean": 0, "rep_duration_std": 0, "rep_duration_min": 0, "rep_duration_max": 0,
            "smoothness": 0, "shoulder_stability": 0, "cadence_regularity": 0, "bilateral_score": 0,
            "created_at": s.get("rep_verified_at", "").isoformat() if s.get("rep_verified_at") else s.get("date", ""),
        })

    return jsonify({"dataset": dataset, "total": len(dataset)})
