"""
Dashboard stats routes for both athlete and admin views.
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from db import get_db

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.route("/athlete", methods=["GET"])
@jwt_required()
def athlete_dashboard():
    user_id = get_jwt_identity()
    db = get_db()

    # Aggregate stats for this athlete
    pipeline = [
        {"$match": {"user_id": ObjectId(user_id)}},
        {"$group": {
            "_id": None,
            "tests_count": {"$sum": 1},
            "avg_pct": {"$avg": "$percentile"},
            "best_pct": {"$max": "$percentile"},
            "avg_score": {"$avg": "$score"},
        }},
    ]
    stats = list(db.test_results.aggregate(pipeline))

    if stats:
        s = stats[0]
        avg_pct = round(s["avg_pct"]) if s["avg_pct"] else 0
        best_pct = round(s["best_pct"]) if s["best_pct"] else 0
        rating = (
            "Excellent" if avg_pct >= 90
            else "Very Good" if avg_pct >= 75
            else "Good" if avg_pct >= 60
            else "Average"
        )
    else:
        s = {"tests_count": 0}
        avg_pct = 0
        best_pct = 0
        rating = "N/A"

    return jsonify({
        "stats": {
            "testsCompleted": s["tests_count"],
            "avgPercentile": avg_pct,
            "bestScore": best_pct,
            "overallRating": rating,
        }
    })


@dashboard_bp.route("/admin", methods=["GET"])
@jwt_required()
def admin_dashboard():
    user_id = get_jwt_identity()
    db = get_db()

    # Verify admin or headadmin
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") not in ("admin", "headadmin"):
        return jsonify({"error": "Admin access required"}), 403

    total_athletes = db.users.count_documents({"role": "athlete"})

    # Total tests
    total_tests = db.test_results.count_documents({})

    # Elite performers (avg percentile >= 90)
    elite_pipeline = [
        {"$group": {
            "_id": "$user_id",
            "avg_pct": {"$avg": "$percentile"},
        }},
        {"$match": {"avg_pct": {"$gte": 90}}},
        {"$count": "count"},
    ]
    elite = list(db.test_results.aggregate(elite_pipeline))
    elite_count = elite[0]["count"] if elite else 0

    # Flagged submissions
    flagged_count = db.submissions.count_documents({"status": "flagged"})

    # Monthly submissions trend (last 6 months)
    monthly_pipeline = [
        {"$group": {
            "_id": {
                "year": {"$year": "$date"},
                "month": {"$month": "$date"},
            },
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
        {"$limit": 6},
    ]
    monthly = list(db.submissions.aggregate(monthly_pipeline))
    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    trend = [
        {"month": month_names[m["_id"]["month"]], "value": m["count"]}
        for m in monthly
    ]

    # If no trend data, provide defaults
    if not trend:
        trend = [
            {"month": "Jan", "value": 0},
            {"month": "Feb", "value": 0},
            {"month": "Mar", "value": 0},
        ]

    # Recent submissions
    recent_subs = list(db.submissions.find().sort("date", -1).limit(5))
    recent = []
    for s in recent_subs:
        u = db.users.find_one({"_id": s["user_id"]})
        if u:
            recent.append({
                "id": str(s["_id"]),
                "name": u["name"],
                "loc": u.get("location", ""),
                "profile_photo": u.get("profile_photo", ""),
                "test": s["test_type"],
                "score": s["score"],
                "pct": s.get("percentile", 0),
                "status": s["status"],
            })

    return jsonify({
        "stats": {
            "totalAthletes": total_athletes,
            "totalTests": total_tests,
            "elitePerformers": elite_count,
            "flaggedCount": flagged_count,
        },
        "trend": trend,
        "recentSubmissions": recent,
    })
