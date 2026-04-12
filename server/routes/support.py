"""
Support and contact message handling.
Athletes send messages to admins, admins can escalate to headadmin.
"""
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from db import get_db

support_bp = Blueprint("support", __name__, url_prefix="/api/support")


def _require_admin():
    """Verify if the requester is an administrator."""
    user_id = get_jwt_identity()
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") not in ["admin", "headadmin"]:
        return None, (jsonify({"error": "Admin access required"}), 403)
    return user, None


@support_bp.route("/message", methods=["POST"])
@jwt_required(optional=True)
def send_message():
    """Unified route for both guest and authenticated support messages."""
    data = request.get_json()
    user_id = get_jwt_identity()
    db = get_db()

    # Required fields
    subject = data.get("subject", "").strip()
    message = data.get("message", "").strip()

    if not subject or not message:
        return jsonify({"error": "Subject and message are required"}), 400

    msg_doc = {
        "subject": subject,
        "message": message,
        "created_at": datetime.utcnow(),
        "status": "pending",
        "user_id": None,
        "target_role": "admin",
        "replies": [],
    }

    if user_id:
        # Authenticated user
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            msg_doc["user_id"] = ObjectId(user_id)
            msg_doc["name"] = user["name"]
            msg_doc["email"] = user["email"]
            msg_doc["is_guest"] = False
            msg_doc["sender_role"] = user["role"]

            # Target logic:
            # Athletes → admin
            # Admin → headadmin
            # HeadAdmin → admin
            if user["role"] == "athlete":
                msg_doc["target_role"] = "admin"
            elif user["role"] in ["admin", "headadmin"]:
                message_id = data.get("message_id")
                target_user_id = data.get("target_user_id")
                target_role = data.get("target_role")

                # If this is a reply to an existing message (has message_id)
                if message_id:
                    # If replying to an athlete, dispatch a personal notification directly to their dashboard
                    if target_role == "athlete" and target_user_id:
                        db.notifications.insert_one({
                            "title": subject,
                            "message": message,
                            "user_id": ObjectId(target_user_id),
                            "type": "personal",
                            "sender_id": user["_id"],
                            "sender_name": user["name"],
                            "created_at": datetime.utcnow()
                        })
                        
                    # Always append the reply body directly to the original support message tree
                    db.support_messages.update_one(
                        {"_id": ObjectId(message_id)},
                        {
                            "$push": {
                                "replies": {
                                    "sender_name": user["name"],
                                    "sender_role": user["role"],
                                    "message": message,
                                    "created_at": datetime.utcnow()
                                }
                            },
                            "$set": {"status": "replied"}
                        }
                    )
                    return jsonify({"message": "Reply tracked successfully"}), 201

                # Otherwise, it's a completely new internal dispatch from an Admin
                if target_role:
                    msg_doc["target_role"] = target_role
                else:
                    msg_doc["target_role"] = "headadmin" if user["role"] == "admin" else "admin"
    else:
        # Guest user
        name = data.get("name", "").strip()
        email = data.get("email", "").strip()

        if not name or not email:
            return jsonify({"error": "Name and email are required for guests"}), 400

        msg_doc["name"] = name
        msg_doc["email"] = email
        msg_doc["is_guest"] = True
        msg_doc["target_role"] = "admin"

    db.support_messages.insert_one(msg_doc)

    return jsonify({"message": "Message sent successfully"}), 201


@support_bp.route("/messages", methods=["GET"])
@jwt_required()
def list_messages():
    """Admin/HeadAdmin: Retrieve support messages targeted to them."""
    admin_user, err = _require_admin()
    if err:
        return err

    db = get_db()

    # HeadAdmin sees messages targeted to headadmin
    # Admin sees messages targeted to admin
    role = admin_user.get("role")
    if role == "headadmin":
        # HeadAdmin sees everything
        query = {}
    else:
        # Admins see messages targeted to them OR messages they themselves sent (internal feedback)
        query = {
            "$or": [
                {"target_role": "admin"},
                {"user_id": ObjectId(admin_user["_id"])}
            ]
        }

    messages = list(db.support_messages.find(query).sort("created_at", -1))

    result = []
    for m in messages:
        result.append({
            "id": str(m["_id"]),
            "name": m.get("name", "Unknown"),
            "email": m.get("email", ""),
            "subject": m.get("subject", ""),
            "message": m.get("message", ""),
            "status": m.get("status", "pending"),
            "isGuest": m.get("is_guest", False),
            "target_role": m.get("target_role", "admin"),
            "date": m["created_at"].isoformat() + "Z" if isinstance(m.get("created_at"), datetime) else str(m.get("created_at", "")),
            "userId": str(m.get("user_id")) if m.get("user_id") else None,
            "replies": [
                {
                    "message": r.get("message"),
                    "sender_name": r.get("sender_name"),
                    "sender_role": r.get("sender_role"),
                    "date": r["created_at"].isoformat() + "Z" if isinstance(r.get("created_at"), datetime) else str(r.get("created_at", ""))
                }
                for r in m.get("replies", [])
            ],
        })

    return jsonify({"messages": result})
