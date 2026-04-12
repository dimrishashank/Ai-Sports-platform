"""
Leaderboard route — ranked athletes by composite score.
Age categories: 10-14, 14-17, 17-19, 19-21, 21+
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from db import get_db

leaderboard_bp = Blueprint("leaderboard", __name__, url_prefix="/api/leaderboard")

# Age group boundaries
AGE_GROUPS = {
    "10-14": (10, 14),
    "14-17": (14, 17),
    "17-19": (17, 19),
    "19-21": (19, 21),
    "21+":   (21, 999),
}


def get_age_group_label(age: int) -> str:
    """Return the age group label for a given age."""
    if age is None:
        return "Unknown"
    for label, (lo, hi) in AGE_GROUPS.items():
        if lo <= age <= hi:
            return label
    return "Unknown"


@leaderboard_bp.route("", methods=["GET"])
@jwt_required()
def get_leaderboard():
    db = get_db()

    gender = request.args.get("gender", "all")
    age_group = request.args.get("age_group", "all")

    # Aggregation: group by user, calculate avg score & percentile
    pipeline = [
        {"$group": {
            "_id": "$user_id",
            "avg_score": {"$avg": "$score"},
            "avg_pct": {"$avg": "$percentile"},
            "tests_count": {"$sum": 1},
        }},
        {"$sort": {"avg_pct": -1}},
        {"$limit": 100},
    ]

    entries = list(db.test_results.aggregate(pipeline))

    result = []
    rank = 1
    for entry in entries:
        user = db.users.find_one({"_id": entry["_id"]})
        if not user or user.get("role") != "athlete":
            continue

        # Apply gender filter
        if gender != "all" and user.get("gender") != gender:
            continue

        # Apply age group filter
        age = user.get("age", 0)
        if age_group != "all":
            bounds = AGE_GROUPS.get(age_group)
            if bounds:
                lo, hi = bounds
                if age < lo or age > hi:
                    continue

        result.append({
            "rank": rank,
            "name": user["name"],
            "age": user.get("age"),
            "age_group": get_age_group_label(user.get("age", 0)),
            "gender": user.get("gender"),
            "location": user.get("location", ""),
            "profile_photo": user.get("profile_photo", ""),
            "score": round(entry["avg_score"]),
            "percentile": round(entry["avg_pct"]),
        })
        rank += 1

    return jsonify({"leaderboard": result})
