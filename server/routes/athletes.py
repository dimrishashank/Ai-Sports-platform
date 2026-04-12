"""
Athletes management routes (admin-facing).
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import bcrypt
from bson import ObjectId
from db import get_db

athletes_bp = Blueprint("athletes", __name__, url_prefix="/api/athletes")


def _require_admin():
    """Check if current user is admin. Returns (user, error_response)."""
    user_id = get_jwt_identity()
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") not in ("admin", "headadmin"):
        return None, (jsonify({"error": "Admin access required"}), 403)
    return user, None


@athletes_bp.route("", methods=["POST"])
@jwt_required()
def create_athlete():
    """Admin-only route to manually create an athlete account."""
    _, err = _require_admin()
    if err:
        return err

    data = request.get_json()
    required = ["name", "email", "password"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    db = get_db()

    # Check if email exists
    if db.users.find_one({"email": data["email"]}):
        return jsonify({"error": "Email already registered"}), 409

    password_hash = bcrypt.hashpw(
        data["password"].encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    athlete_doc = {
        "name": data["name"],
        "email": data["email"],
        "password_hash": password_hash,
        "age": int(data.get("age", 0)) if data.get("age") else None,
        "gender": data.get("gender", ""),
        "location": data.get("location", ""),
        "role": "athlete",
        "status": "active",
        "created_at": datetime.utcnow(),
    }

    result = db.users.insert_one(athlete_doc)

    return jsonify({
        "message": f"Athlete account created for {data['name']}",
        "athlete": {
            "id": str(result.inserted_id),
            "name": data["name"],
            "email": data["email"],
        }
    }), 201


@athletes_bp.route("", methods=["GET"])
@jwt_required()
def list_athletes():
    _, err = _require_admin()
    if err:
        return err

    db = get_db()

    # Build filter
    query = {"role": "athlete"}

    q = request.args.get("q", "").strip()
    if q:
        query["name"] = {"$regex": q, "$options": "i"}

    status = request.args.get("status", "all")
    if status != "all":
        query["status"] = status

    region = request.args.get("region", "all")
    if region != "all":
        query["location"] = {"$regex": region, "$options": "i"}

    athletes = list(db.users.find(query).sort("name", 1))

    result = []
    for a in athletes:
        # Count tests and avg percentile
        pipeline = [
            {"$match": {"user_id": a["_id"]}},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "avg_pct": {"$avg": "$percentile"},
            }},
        ]
        stats = list(db.test_results.aggregate(pipeline))
        tests_count = stats[0]["count"] if stats else 0
        avg_pct = round(stats[0]["avg_pct"]) if stats and stats[0]["avg_pct"] else 0

        result.append({
            "id": str(a["_id"]),
            "name": a["name"],
            "age": a.get("age"),
            "gender": a.get("gender"),
            "location": a.get("location"),
            "tests": tests_count,
            "profile_photo": a.get("profile_photo", ""),
            "avgPct": avg_pct,
            "status": a.get("status", "active"),
        })

    return jsonify({"athletes": result})


@athletes_bp.route("/<athlete_id>", methods=["GET"])
@jwt_required()
def get_athlete(athlete_id):
    db = get_db()
    athlete = db.users.find_one({"_id": ObjectId(athlete_id)})
    if not athlete:
        return jsonify({"error": "Athlete not found"}), 404

    # Get test stats
    pipeline = [
        {"$match": {"user_id": ObjectId(athlete_id)}},
        {"$group": {
            "_id": None,
            "count": {"$sum": 1},
            "avg_pct": {"$avg": "$percentile"},
            "best_pct": {"$max": "$percentile"},
        }},
    ]
    stats = list(db.test_results.aggregate(pipeline))

    # Get detailed test history
    tests = list(
        db.test_results
        .find({"user_id": ObjectId(athlete_id)})
        .sort("date", -1)
        .limit(100)
    )
    
    formatted_tests = []
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

        formatted_tests.append({
            "id": str(t["_id"]),
            "type": t["test_type"],
            "score": t["score"],
            "percentile": t.get("percentile", 0),
            "rating": t.get("rating", ""),
            "date": t["date"].strftime("%Y-%m-%d") if isinstance(t["date"], datetime) else str(t["date"]),
            "unit": unit,
            "status": status,
            "ai_verdict": t.get("ai_verdict", ""),
            "videoKey": t.get("video_key"),
        })

    return jsonify({
        "athlete": {
            "id": str(athlete["_id"]),
            "name": athlete["name"],
            "email": athlete["email"],
            "age": athlete.get("age"),
            "profile_photo": athlete.get("profile_photo", ""),
            "gender": athlete.get("gender"),
            "location": athlete.get("location"),
            "status": athlete.get("status", "active"),
            "tests_count": stats[0]["count"] if stats else 0,
            "avgPct": round(stats[0]["avg_pct"]) if stats and stats[0]["avg_pct"] else 0,
            "bestPct": round(stats[0]["best_pct"]) if stats and stats[0]["best_pct"] else 0,
            "results": formatted_tests,
        }
    })


@athletes_bp.route("/<athlete_id>/status", methods=["PATCH"])
@jwt_required()
def update_status(athlete_id):
    _, err = _require_admin()
    if err:
        return err

    data = request.get_json()
    new_status = data.get("status")
    if new_status not in ("active", "flagged", "inactive"):
        return jsonify({"error": "Invalid status"}), 400

    db = get_db()
    result = db.users.update_one(
        {"_id": ObjectId(athlete_id)},
        {"$set": {"status": new_status}},
    )

    if result.matched_count == 0:
        return jsonify({"error": "Athlete not found"}), 404

    return jsonify({"message": "Status updated", "status": new_status})
