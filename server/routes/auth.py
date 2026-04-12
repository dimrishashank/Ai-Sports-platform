"""
Authentication routes: register, login, forgot/reset password, profile, admin management.

Roles:
  - athlete: regular user
  - admin: sub-admin created by headadmin
  - headadmin: only one, can create/remove sub-admins
"""
from datetime import datetime
import secrets
import string
import random
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
import bcrypt
from bson import ObjectId
from db import get_db

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _generate_admin_id():
    """Generate a short admin reference ID like ADM-A3F2."""
    chars = string.ascii_uppercase + string.digits
    code = "".join(random.choices(chars, k=4))
    return f"ADM-{code}"


def _calculate_age(dob_str: str) -> int:
    """Calculate age from a date-of-birth string (YYYY-MM-DD)."""
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d")
        today = datetime.utcnow()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age
    except (ValueError, TypeError):
        return None


def _user_doc_to_dict(doc):
    """Convert MongoDB user document to JSON-safe dict (no password)."""
    dob = doc.get("dob", "")
    age = doc.get("age")
    # If dob is stored, compute age from it
    if dob and isinstance(dob, str):
        age = _calculate_age(dob)
    elif isinstance(dob, datetime):
        age = _calculate_age(dob.strftime("%Y-%m-%d"))

    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "email": doc["email"],
        "dob": dob.strftime("%Y-%m-%d") if isinstance(dob, datetime) else (dob or ""),
        "age": age,
        "gender": doc.get("gender"),
        "location": doc.get("location"),
        "role": doc["role"],  # 'athlete', 'admin', 'headadmin'
        "admin_id": doc.get("admin_id", ""),
        "status": doc.get("status", "active"),
        "profile_photo": doc.get("profile_photo", ""),
        "created_at": doc.get("created_at", "").isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at", "")),
    }


@auth_bp.route("/register", methods=["POST"])
def register():
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

    # Calculate age from DOB
    dob_str = data.get("dob", "")
    age = None
    if dob_str:
        age = _calculate_age(dob_str)
    else:
        age = int(data.get("age", 0)) or None

    user_doc = {
        "name": data["name"],
        "email": data["email"],
        "password_hash": password_hash,
        "dob": dob_str or "",
        "age": age,
        "gender": data.get("gender", ""),
        "location": data.get("location", ""),
        "profile_photo": "",
        "role": "athlete",
        "status": "active",
        "created_at": datetime.utcnow(),
    }

    result = db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token(identity=str(result.inserted_id))

    return jsonify({
        "token": token,
        "user": _user_doc_to_dict(user_doc),
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "")
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    db = get_db()
    user = db.users.find_one({"email": email})

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user["_id"]))

    return jsonify({
        "token": token,
        "user": _user_doc_to_dict(user),
    })


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user": _user_doc_to_dict(user)})


# ── Forgot Password ──────────────────────────────────

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email", "")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    db = get_db()
    user = db.users.find_one({"email": email})

    if not user:
        return jsonify({"error": "No account found with that email"}), 404

    # Generate a secure reset token
    reset_token = secrets.token_urlsafe(32)

    # Store the token in DB
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "reset_token": reset_token,
            "reset_token_created": datetime.utcnow(),
        }}
    )

    # In production, this would be emailed. For now, return it directly.
    return jsonify({
        "message": "Password reset token generated. In production, this would be emailed to you.",
        "reset_token": reset_token,
    })


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    token = data.get("token", "")
    new_password = data.get("password", "")

    if not token or not new_password:
        return jsonify({"error": "Token and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    db = get_db()
    user = db.users.find_one({"reset_token": token})

    if not user:
        return jsonify({"error": "Invalid or expired reset token"}), 400

    # Hash the new password
    password_hash = bcrypt.hashpw(
        new_password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    # Update password and clear reset token
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": password_hash},
         "$unset": {"reset_token": "", "reset_token_created": ""}}
    )

    return jsonify({"message": "Password reset successfully. You can now login with your new password."})


# ── Profile Update ────────────────────────────────────

@auth_bp.route("/profile", methods=["PATCH"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json()
    db = get_db()

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Fields that can be updated
    updates = {}
    if "name" in data and data["name"].strip():
        updates["name"] = data["name"].strip()
    if "dob" in data:
        updates["dob"] = data["dob"]
        age = _calculate_age(data["dob"]) if data["dob"] else None
        updates["age"] = age
    elif "age" in data:
        updates["age"] = int(data["age"]) if data["age"] else None
    if "gender" in data:
        updates["gender"] = data["gender"]
    if "location" in data:
        updates["location"] = data["location"]

    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": updates})

    # Return the updated user
    updated_user = db.users.find_one({"_id": ObjectId(user_id)})
    return jsonify({"user": _user_doc_to_dict(updated_user), "message": "Profile updated successfully"})


# ── Profile Photo Upload ──────────────────────────────

@auth_bp.route("/profile/photo", methods=["POST"])
@jwt_required()
def upload_profile_photo():
    """Upload a profile photo for the current user (athlete or admin)."""
    user_id = get_jwt_identity()
    db = get_db()

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404

    photo = request.files.get("photo")
    if not photo:
        return jsonify({"error": "Photo file is required"}), 400

    # Validate file type
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if photo.content_type not in allowed:
        return jsonify({"error": "Only JPEG, PNG, WebP, and GIF images are allowed"}), 400

    # Validate file size (max 5MB)
    photo.seek(0, 2)
    size = photo.tell()
    photo.seek(0)
    if size > 5 * 1024 * 1024:
        return jsonify({"error": "Photo must be under 5MB"}), 400

    import base64
    photo_data = photo.read()
    photo_b64 = base64.b64encode(photo_data).decode("utf-8")
    data_url = f"data:{photo.content_type};base64,{photo_b64}"

    db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"profile_photo": data_url}}
    )

    updated_user = db.users.find_one({"_id": ObjectId(user_id)})
    return jsonify({
        "user": _user_doc_to_dict(updated_user),
        "message": "Profile photo updated successfully",
    })


# ── HeadAdmin: Create New Sub-Admin ───────────────────

@auth_bp.route("/create-admin", methods=["POST"])
@jwt_required()
def create_admin():
    """HeadAdmin only: Create a new sub-admin account with a unique admin ID."""
    user_id = get_jwt_identity()
    db = get_db()

    # Verify the requester is a HEAD ADMIN
    requester = db.users.find_one({"_id": ObjectId(user_id)})
    if not requester or requester.get("role") != "headadmin":
        return jsonify({"error": "Only the Head Administrator can create new admin accounts"}), 403

    data = request.get_json()
    required = ["name", "email", "password"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    # Check if email exists
    if db.users.find_one({"email": data["email"]}):
        return jsonify({"error": "Email already registered"}), 409

    password_hash = bcrypt.hashpw(
        data["password"].encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")

    # Generate unique admin ID
    admin_id = _generate_admin_id()
    # Make sure it's unique
    while db.users.find_one({"admin_id": admin_id}):
        admin_id = _generate_admin_id()

    admin_doc = {
        "name": data["name"],
        "email": data["email"],
        "password_hash": password_hash,
        "role": "admin",
        "admin_id": admin_id,
        "status": "active",
        "created_at": datetime.utcnow(),
    }

    result = db.users.insert_one(admin_doc)

    return jsonify({
        "message": f"Sub-Admin account created for {data['name']}",
        "admin": {
            "id": str(result.inserted_id),
            "admin_id": admin_id,
            "name": data["name"],
            "email": data["email"],
        }
    }), 201


# ── HeadAdmin: List All Sub-Admins ────────────────────

@auth_bp.route("/admins", methods=["GET"])
@jwt_required()
def list_admins():
    """HeadAdmin only: List all sub-admin accounts."""
    user_id = get_jwt_identity()
    db = get_db()

    requester = db.users.find_one({"_id": ObjectId(user_id)})
    if not requester or requester.get("role") != "headadmin":
        return jsonify({"error": "Only the Head Administrator can view admin list"}), 403

    admins = list(db.users.find({"role": "admin"}).sort("created_at", -1))

    result = []
    for a in admins:
        result.append({
            "id": str(a["_id"]),
            "admin_id": a.get("admin_id", "N/A"),
            "name": a["name"],
            "email": a["email"],
            "status": a.get("status", "active"),
            "created_at": a["created_at"].strftime("%Y-%m-%d") if isinstance(a.get("created_at"), datetime) else str(a.get("created_at", "")),
        })

    return jsonify({"admins": result})


# ── HeadAdmin: Delete Sub-Admin ───────────────────────

@auth_bp.route("/admins/<admin_id>", methods=["DELETE"])
@jwt_required()
def delete_admin(admin_id):
    """HeadAdmin only: Delete or revoke admin privileges."""
    user_id = get_jwt_identity()
    db = get_db()

    # Verify the requester is a HEAD ADMIN
    requester = db.users.find_one({"_id": ObjectId(user_id)})
    if not requester or requester.get("role") != "headadmin":
        return jsonify({"error": "Only the Head Administrator can delete admin accounts"}), 403

    res = db.users.delete_one({"_id": ObjectId(admin_id), "role": "admin"})
    if res.deleted_count == 0:
        return jsonify({"error": "Admin account not found or cannot be deleted"}), 404

    return jsonify({"message": "Admin account deleted successfully"})
