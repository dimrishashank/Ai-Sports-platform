"""
Test types, video upload, submission, and history routes.

Three active tests:
  - Pushups: AI counts reps automatically
  - Sit-ups: AI counts reps automatically
  - Pull-ups: AI counts reps automatically

Two coming soon:
  - Shuttle Run
  - Endurance Run"""
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from db import get_db
from storage import upload_video, get_video_url
from services.video_analysis import analyze_video_from_stream
from services.ai_verdict import predict_verdict
from routes.leaderboard import get_age_group_label
import tempfile, os

tests_bp = Blueprint("tests", __name__, url_prefix="/api/tests")


# ── Age-group-aware benchmarks ────────────────────────
# Max expected reps for 100th percentile by age group
BENCHMARKS = {
    "Pushups": {
        "10-14": 30, "14-17": 40, "17-19": 50,
        "19-21": 55, "21+": 60, "Unknown": 45,
    },
    "Sit-ups": {
        "10-14": 25, "14-17": 35, "17-19": 45,
        "19-21": 50, "21+": 55, "Unknown": 40,
    },
    "Pull-ups": {
        "10-14": 5,  "14-17": 10, "17-19": 15,
        "19-21": 18, "21+": 20, "Unknown": 12,
    },
}


def calculate_percentile(score: float, test_type: str, age: int = None) -> tuple:
    """Calculate percentile and rating using age-group benchmarks."""
    age_group = get_age_group_label(age) if age else "Unknown"
    benchmarks = BENCHMARKS.get(test_type, {})
    max_reps = benchmarks.get(age_group, benchmarks.get("Unknown", 45))

    # Percentile = (score / max_expected) * 100, capped at 99
    if max_reps > 0:
        percentile = min(99, round((score / max_reps) * 100))
    else:
        percentile = min(95, round(score * 1.8 + 10))

    rating = (
        "Excellent" if percentile >= 90
        else "Very Good" if percentile >= 75
        else "Good" if percentile >= 60
        else "Average" if percentile >= 40
        else "Below Average"
    )
    return percentile, rating


@tests_bp.route("/types", methods=["GET"])
def get_test_types():
    """Return all test types with their active/coming_soon status."""
    db = get_db()
    types = list(db.test_types.find({}, {"_id": 0}))
    if not types:
        # Fallback defaults
        types = [
            {"name": "Pushups", "description": "Upper body strength — AI counts your reps", "duration": "60s", "unit": "reps", "icon": "💪", "status": "active"},
            {"name": "Sit-ups", "description": "Core strength — AI counts your reps", "duration": "60s", "unit": "reps", "icon": "🔥", "status": "active"},
            {"name": "Pull-ups", "description": "Upper body & back strength — AI counts your reps", "duration": "60s", "unit": "reps", "icon": "🏋️", "status": "active"},
            {"name": "Shuttle Run", "description": "Speed & agility test", "duration": "4×10m", "unit": "sec", "icon": "⚡", "status": "coming_soon"},
            {"name": "Endurance Run", "description": "Cardiovascular fitness test", "duration": "800m", "unit": "min", "icon": "🏃", "status": "coming_soon"},
        ]
    return jsonify({"types": types})


@tests_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_test():
    """Submit a test result from live camera recording."""
    user_id = get_jwt_identity()
    db = get_db()

    # Handle multipart form data (video + JSON fields)
    test_type = request.form.get("test_type", "")
    score = float(request.form.get("score", 0))
    duration = float(request.form.get("duration", 0))

    if not test_type or score <= 0:
        return jsonify({"error": "test_type and score are required"}), 400

    # Get athlete age for benchmark
    user = db.users.find_one({"_id": ObjectId(user_id)})
    athlete_age = user.get("age") if user else None

    # Calculate percentile using age-based benchmarks
    percentile, rating = calculate_percentile(score, test_type, athlete_age)

    # Upload video if provided
    video_key = None
    video_file = request.files.get("video")
    if video_file:
        ext = video_file.filename.rsplit(".", 1)[-1] if "." in video_file.filename else "webm"
        object_name = f"videos/{user_id}/{test_type.lower().replace(' ', '_')}_{uuid.uuid4().hex[:8]}.{ext}"
        video_id = upload_video(video_file.stream, object_name, video_file.content_type or "video/webm")
        video_key = video_id

    now = datetime.utcnow()

    # Save test result
    test_doc = {
        "user_id": ObjectId(user_id),
        "test_type": test_type,
        "score": score,
        "percentile": percentile,
        "rating": rating,
        "duration": duration,
        "date": now,
        "video_key": video_key,
        "ai_confidence": None,
        "created_at": now,
    }
    result = db.test_results.insert_one(test_doc)

    # Create submission for admin review
    submission_doc = {
        "user_id": ObjectId(user_id),
        "test_result_id": result.inserted_id,
        "test_type": test_type,
        "score": score,
        "percentile": percentile,
        "date": now,
        "status": "pending",
        "video_key": video_key,
        "ai_verification": None,
        "ai_verdict": "",
        "ai_confidence": 0,
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": now,
    }
    db.submissions.insert_one(submission_doc)

    # Send personal notification to athlete
    _notify_athlete(db, user_id, test_type, "live recording")

    return jsonify({
        "result": {
            "id": str(result.inserted_id),
            "testType": test_type,
            "score": score,
            "percentile": percentile,
            "rating": rating,
            "duration": duration,
            "date": now.isoformat(),
        }
    }), 201


@tests_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_test_video():
    """
    Upload a pre-recorded video for a test.
    AI analyzes it automatically and gives a pass/flag verdict.

    For Pushups, Sit-ups & Pull-ups: AI counts reps → score = verified_reps
    """
    user_id = get_jwt_identity()
    db = get_db()

    test_type = request.form.get("test_type", "")
    video_file = request.files.get("video")

    if not test_type:
        return jsonify({"error": "test_type is required"}), 400
    if not video_file:
        return jsonify({"error": "Video file is required"}), 400

    # Video duration validation — minimum 60 seconds for uploads
    import cv2
    tmp_path = None
    try:
        ext = video_file.filename.rsplit(".", 1)[-1] if "." in video_file.filename else "mp4"
        tmp_path = os.path.join(tempfile.gettempdir(), f"dur_check_{uuid.uuid4().hex[:8]}.{ext}")
        video_file.save(tmp_path)
        cap = cv2.VideoCapture(tmp_path)
        if cap.isOpened():
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            duration_secs = frame_count / fps if fps > 0 else 0
            cap.release()
            if duration_secs < 60:
                return jsonify({
                    "error": f"Video must be at least 1 minute long. Your video is {duration_secs:.0f} seconds.",
                    "duration": round(duration_secs),
                    "min_duration": 60
                }), 400
        else:
            cap.release()
        # Reset file stream from saved file
        video_file.stream.seek(0)
    except Exception as e:
        print(f"⚠️ Duration check failed (proceeding anyway): {e}")
        video_file.stream.seek(0)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass

    # Get athlete age for benchmark
    user = db.users.find_one({"_id": ObjectId(user_id)})
    athlete_age = user.get("age") if user else None

    # Step 1: Upload video to Google Drive
    ext = video_file.filename.rsplit(".", 1)[-1] if "." in video_file.filename else "mp4"
    object_name = f"videos/{user_id}/{test_type.lower().replace(' ', '_')}_{uuid.uuid4().hex[:8]}.{ext}"
    video_id = upload_video(video_file.stream, object_name, video_file.content_type or "video/mp4")

    if not video_id:
        return jsonify({"error": "Video upload failed. Please try again."}), 500

    # Step 2: Run AI analysis on the video
    video_file.stream.seek(0)  # Reset stream position
    ai_result = analyze_video_from_stream(video_file.stream, test_type)

    # Step 3: Determine score — AI counts reps for all test types
    verified_reps = ai_result.get("verified_reps", 0)
    score = max(verified_reps, 1)  # At least 1 if they uploaded a video
    ai_verdict = ai_result.get("verdict", "flag")

    confidence = ai_result.get("confidence", 0)
    flags = ai_result.get("flags", [])

    # Calculate percentile using age-based benchmarks
    percentile, rating = calculate_percentile(score, test_type, athlete_age)

    # Step 4: Use AI learner model if available, fallback to basic rules
    ai_prediction = predict_verdict(ai_result, test_type, score)
    ai_auto_decision = False

    if ai_prediction.get('model_available') and ai_prediction.get('auto_decision'):
        # Trained model is confident → use its prediction
        status = ai_prediction['prediction']
        ai_auto_decision = True
        print(f"🤖 AI auto-{status}: confidence={ai_prediction['confidence']:.0%}")
    elif ai_verdict == "pass":
        status = "approved"
    else:
        status = "pending"  # Needs admin review

    now = datetime.utcnow()

    # Save test result
    test_doc = {
        "user_id": ObjectId(user_id),
        "test_type": test_type,
        "score": score,
        "percentile": percentile,
        "rating": rating,
        "duration": 0,
        "date": now,
        "video_key": video_id,
        "ai_confidence": confidence,
        "ai_verdict": ai_verdict,
        "ai_flags": flags,
        "upload_type": "file_upload",
        "created_at": now,
    }
    result = db.test_results.insert_one(test_doc)

    # Create submission for admin review
    submission_doc = {
        "user_id": ObjectId(user_id),
        "test_result_id": result.inserted_id,
        "test_type": test_type,
        "score": score,
        "percentile": percentile,
        "date": now,
        "status": status,
        "video_key": video_id,
        "ai_verification": ai_result,
        "ai_verdict": ai_verdict,
        "ai_confidence": confidence,
        "ai_auto_decision": ai_auto_decision,
        "ai_model_prediction": ai_prediction if ai_prediction.get('model_available') else None,
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": now,
    }
    db.submissions.insert_one(submission_doc)

    # Send personal notification to athlete
    _notify_athlete(db, user_id, test_type, "video upload")

    return jsonify({
        "result": {
            "id": str(result.inserted_id),
            "testType": test_type,
            "score": score,
            "percentile": percentile,
            "rating": rating,
            "date": now.isoformat(),
            "ai_verdict": ai_verdict,
            "ai_confidence": confidence,
            "ai_flags": flags,
            "status": status,
        }
    }), 201


@tests_bp.route("/history", methods=["GET"])
@jwt_required()
def get_history():
    user_id = get_jwt_identity()
    db = get_db()

    tests = list(
        db.test_results
        .find({"user_id": ObjectId(user_id)})
        .sort("date", -1)
        .limit(50)
    )

    result = []
    for t in tests:
        # Fetch verification status from submissions
        sub = db.submissions.find_one({"test_result_id": t["_id"]})
        status = sub.get("status", "pending") if sub else "pending"
        
        # Determine unit based on test type
        test_name = t.get("test_type", "").lower()
        if "shuttle" in test_name or "run" in test_name:
            unit = "sec"
        else:
            unit = "reps"

        result.append({
            "id": str(t["_id"]),
            "type": t["test_type"],
            "score": t["score"],
            "percentile": t.get("percentile", 0),
            "rating": t.get("rating", ""),
            "date": t["date"].strftime("%Y-%m-%d") if isinstance(t["date"], datetime) else str(t["date"]),
            "unit": unit,
            "status": status,
            "ai_verdict": t.get("ai_verdict", ""),
            "ai_confidence": t.get("ai_confidence", 0),
        })

    return jsonify({"tests": result})


@tests_bp.route("/<test_id>", methods=["GET"])
@jwt_required()
def get_test(test_id):
    db = get_db()
    test = db.test_results.find_one({"_id": ObjectId(test_id)})
    if not test:
        return jsonify({"error": "Test not found"}), 404

    return jsonify({
        "test": {
            "id": str(test["_id"]),
            "testType": test["test_type"],
            "score": test["score"],
            "percentile": test.get("percentile", 0),
            "rating": test.get("rating", ""),
            "duration": test.get("duration", 0),
            "date": test["date"].strftime("%Y-%m-%d") if isinstance(test["date"], datetime) else str(test["date"]),
            "videoKey": test.get("video_key"),
        }
    })


@tests_bp.route("/<test_id>/video", methods=["GET"])
@jwt_required()
def get_test_video(test_id):
    user_id = get_jwt_identity()
    db = get_db()

    # Check if requester is admin/headadmin
    requester = db.users.find_one({"_id": ObjectId(user_id)})
    is_admin = requester and requester.get("role") in ("admin", "headadmin")

    query = {"_id": ObjectId(test_id)}
    if not is_admin:
        query["user_id"] = ObjectId(user_id)

    test = db.test_results.find_one(query)

    if not test:
        return jsonify({"error": "Test not found or access denied"}), 404

    video_key = test.get("video_key")
    if not video_key:
        return jsonify({"error": "No video recording for this test"}), 404

    url = get_video_url(video_key)
    return jsonify({"url": url})


def _notify_athlete(db, user_id: str, test_type: str, upload_method: str):
    """Send a personal notification to the athlete about their upload."""
    db.notifications.insert_one({
        "type": "personal",
        "user_id": ObjectId(user_id),
        "title": "Video Uploaded Successfully ✅",
        "message": f"Your {test_type} {upload_method} has been received and is under review.",
        "read": False,
        "created_at": datetime.utcnow(),
    })
