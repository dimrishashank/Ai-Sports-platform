"""
Admin submission review routes.
Admins and HeadAdmin can review, approve, or flag athlete submissions.

When admin reviews a submission, the decision is saved as training data
for the AI verdict model. Over time, the AI learns to auto-approve/flag.
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from db import get_db
from storage import get_video_url
from services.ai_verdict import save_training_sample, get_model_stats

submissions_bp = Blueprint("submissions", __name__, url_prefix="/api/submissions")


def _require_admin():
    """Check if user is admin or headadmin."""
    user_id = get_jwt_identity()
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") not in ("admin", "headadmin"):
        return None, (jsonify({"error": "Admin access required"}), 403)
    return user, None


@submissions_bp.route("", methods=["GET"])
@jwt_required()
def list_submissions():
    _, err = _require_admin()
    if err:
        return err

    db = get_db()
    query = {}

    status = request.args.get("status", "all")
    if status != "all":
        query["status"] = status

    test_type = request.args.get("test_type", "all")
    if test_type != "all":
        query["test_type"] = test_type

    region = request.args.get("region", "all")

    subs = list(db.submissions.find(query).sort("date", -1).limit(100))

    result = []
    for s in subs:
        # Fetch user info
        user = db.users.find_one({"_id": s["user_id"]})
        if not user:
            continue

        # Filter by region if needed
        if region != "all" and region.lower() not in (user.get("location", "")).lower():
            continue

        result.append({
            "id": str(s["_id"]),
            "name": user["name"],
            "age": user.get("age"),
            "gender": user.get("gender"),
            "loc": user.get("location", ""),
            "test": s["test_type"],
            "score": s["score"],
            "pct": s.get("percentile", 0),
            "date": s["date"].strftime("%Y-%m-%d") if isinstance(s["date"], datetime) else str(s["date"]),
            "status": s["status"],
            "hasVideo": bool(s.get("video_key")),
            "ai_verdict": s.get("ai_verdict", ""),
            "ai_confidence": s.get("ai_confidence", 0),
            "ai_auto": s.get("ai_auto_decision", False),
            "ai_rep_count": s.get("score", 0),
            "admin_rep_count": s.get("admin_rep_count"),
            "verified_rep_count": s.get("admin_rep_count") if s.get("admin_rep_count") is not None else s.get("score", 0),
        })

    return jsonify({"submissions": result})


@submissions_bp.route("/<sub_id>", methods=["PATCH"])
@jwt_required()
def update_submission(sub_id):
    admin, err = _require_admin()
    if err:
        return err

    data = request.get_json()
    new_status = data.get("status")
    admin_rep_count = data.get("admin_rep_count")
    if new_status not in ("approved", "flagged"):
        return jsonify({"error": "Status must be 'approved' or 'flagged'"}), 400

    db = get_db()
    
    # Get the submission to extract AI data for training
    sub = db.submissions.find_one({"_id": ObjectId(sub_id)})
    if not sub:
        return jsonify({"error": "Submission not found"}), 404
    
    # Build update fields
    update_fields = {
        "status": new_status,
        "reviewed_by": admin["_id"],
        "reviewed_at": datetime.utcnow(),
    }
    
    # If admin provided a rep count, store it
    if admin_rep_count is not None:
        try:
            update_fields["admin_rep_count"] = int(admin_rep_count)
        except (ValueError, TypeError):
            pass
    
    # Update the submission
    result = db.submissions.update_one(
        {"_id": ObjectId(sub_id)},
        {"$set": update_fields},
    )

    # Save this decision as AI training data
    ai_verification = sub.get("ai_verification") or {}
    try:
        save_training_sample(
            submission_id=sub_id,
            ai_result=ai_verification,
            test_type=sub.get("test_type", ""),
            score=sub.get("score", 0),
            admin_verdict=new_status,
        )
        print(f"🧠 Training sample saved: {new_status} for {sub.get('test_type')}")
    except Exception as e:
        print(f"⚠️  Could not save training sample: {e}")

    return jsonify({"message": "Submission updated", "status": new_status})


@submissions_bp.route("/<sub_id>/rep-count", methods=["PATCH"])
@jwt_required()
def update_rep_count(sub_id):
    """Admin submits their manually counted reps for a submission."""
    admin, err = _require_admin()
    if err:
        return err

    data = request.get_json()
    admin_reps = data.get("admin_rep_count")
    if admin_reps is None:
        return jsonify({"error": "admin_rep_count is required"}), 400

    try:
        admin_reps = int(admin_reps)
    except (ValueError, TypeError):
        return jsonify({"error": "admin_rep_count must be a number"}), 400

    db = get_db()
    sub = db.submissions.find_one({"_id": ObjectId(sub_id)})
    if not sub:
        return jsonify({"error": "Submission not found"}), 404

    ai_reps = sub.get("score", 0)
    rep_diff = abs(ai_reps - admin_reps)

    db.submissions.update_one(
        {"_id": ObjectId(sub_id)},
        {"$set": {
            "admin_rep_count": admin_reps,
            "rep_verified_by": admin["_id"],
            "rep_verified_at": datetime.utcnow(),
        }}
    )

    print(f"🔢 Rep count verified: AI={ai_reps}, Admin={admin_reps}, Diff={rep_diff}")

    return jsonify({
        "message": "Rep count updated",
        "ai_rep_count": ai_reps,
        "admin_rep_count": admin_reps,
        "difference": rep_diff,
    })


@submissions_bp.route("/<sub_id>/video", methods=["GET"])
@jwt_required()
def get_submission_video(sub_id):
    _, err = _require_admin()
    if err:
        return err

    db = get_db()
    sub = db.submissions.find_one({"_id": ObjectId(sub_id)})
    if not sub:
        return jsonify({"error": "Submission not found"}), 404

    video_key = sub.get("video_key")
    if not video_key:
        return jsonify({"error": "No video for this submission"}), 404

    url = get_video_url(video_key)
    return jsonify({"url": url})


@submissions_bp.route("/ai-stats", methods=["GET"])
@jwt_required()
def ai_stats():
    """Get AI model training statistics for admin dashboard."""
    _, err = _require_admin()
    if err:
        return err

    stats = get_model_stats()
    return jsonify({"ai_stats": stats})
