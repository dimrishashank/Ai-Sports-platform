"""
Notification system — broadcasts + personal notifications.

Types:
  - broadcast: sent by HeadAdmin/Admin to groups (all/athletes/admins)
  - personal: auto-sent to individual athletes (e.g., video upload success)
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from db import get_db

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


def _get_user():
    user_id = get_jwt_identity()
    db = get_db()
    return db.users.find_one({"_id": ObjectId(user_id)})


@notifications_bp.route("/broadcast", methods=["POST"])
@jwt_required()
def send_broadcast():
    """HeadAdmin only: Send message to All, Admins, or Athletes."""
    user = _get_user()
    if not user or user.get("role") != "headadmin":
        return jsonify({"error": "Only HeadAdmin can send global broadcasts"}), 403

    data = request.get_json()
    title = data.get("title", "").strip()
    message = data.get("message", "").strip()
    target = data.get("target", "all")  # 'all', 'admins', 'athletes'

    if not title or not message:
        return jsonify({"error": "Title and message are required"}), 400

    db = get_db()
    notif_doc = {
        "title": title,
        "message": message,
        "target": target,
        "sender_id": user["_id"],
        "sender_name": user["name"],
        "created_at": datetime.utcnow(),
        "type": "broadcast",
    }
    db.notifications.insert_one(notif_doc)
    return jsonify({"message": f"Broadcast sent to {target}"}), 201


@notifications_bp.route("/send", methods=["POST"])
@jwt_required()
def send_notification():
    """Admin/HeadAdmin: Send notification to Athletes."""
    user = _get_user()
    if not user or user.get("role") not in ["admin", "headadmin"]:
        return jsonify({"error": "Admin access required"}), 403

    data = request.get_json()
    title = data.get("title", "").strip()
    message = data.get("message", "").strip()

    # Admins can only send to athletes
    target = "athletes" if user["role"] == "admin" else data.get("target", "athletes")

    if not title or not message:
        return jsonify({"error": "Title and message are required"}), 400

    db = get_db()
    notif_doc = {
        "title": title,
        "message": message,
        "target": target,
        "sender_id": user["_id"],
        "sender_name": user["name"],
        "created_at": datetime.utcnow(),
        "type": "notification",
    }
    db.notifications.insert_one(notif_doc)
    return jsonify({"message": "Notification sent successfully"}), 201


@notifications_bp.route("", methods=["GET"])
@jwt_required()
def get_notifications():
    """
    Retrieve notifications for the current user.
    Includes both broadcast notifications AND personal (user-specific) ones.
    """
    user = _get_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    db = get_db()
    role = user["role"]
    user_id = user["_id"]

    # Build query for broadcasts based on role
    if role == "headadmin":
        broadcast_query = {"type": {"$in": ["broadcast", "notification"]}}
    elif role == "admin":
        broadcast_query = {
            "type": {"$in": ["broadcast", "notification"]},
            "target": {"$in": ["all", "admins"]},
        }
    else:
        # Athletes
        broadcast_query = {
            "type": {"$in": ["broadcast", "notification"]},
            "target": {"$in": ["all", "athletes"]},
        }

    # Get broadcasts
    broadcasts = list(db.notifications.find(broadcast_query).sort("created_at", -1).limit(20))

    # Get personal notifications for this user
    personal = list(
        db.notifications.find({
            "type": "personal",
            "user_id": user_id,
        }).sort("created_at", -1).limit(10)
    )

    # Combine and sort by date
    all_notifs = broadcasts + personal
    all_notifs.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)

    result = []
    for n in all_notifs[:30]:  # Max 30 total
        result.append({
            "id": str(n["_id"]),
            "title": n["title"],
            "message": n["message"],
            "sender": n.get("sender_name", "System"),
            "date": n["created_at"].isoformat() + "Z" if isinstance(n["created_at"], datetime) else str(n["created_at"]),
            "target": n.get("target", "personal"),
            "type": n.get("type", "broadcast"),
            "read": n.get("read", True),
        })

    return jsonify({"notifications": result})
