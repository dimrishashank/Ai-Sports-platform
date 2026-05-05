"""
Video streaming proxy route + demo video management.
Streams videos from Google Drive through the server so they play inline in the browser.
"""
from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from storage import stream_video, upload_video
from db import get_db

videos_bp = Blueprint("videos", __name__, url_prefix="/api/videos")


@videos_bp.route("/stream/<file_id>", methods=["GET"])
def stream(file_id):
    """Stream a video file from Google Drive through the server."""
    if not file_id or len(file_id) < 10:
        return jsonify({"error": "Invalid video ID"}), 400

    buffer, mime_type = stream_video(file_id)

    if not buffer:
        return jsonify({"error": "Video not found or unavailable"}), 404

    return Response(
        buffer.read(),
        mimetype=mime_type,
        headers={
            "Content-Type": mime_type,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
        },
    )


# ──────────────────── DEMO VIDEO MANAGEMENT ────────────────────

@videos_bp.route("/demo", methods=["GET"])
def get_all_demo_videos():
    """Get all demo video mappings (public, no auth needed)."""
    db = get_db()
    demos = list(db.demo_videos.find({}))
    result = {}
    for d in demos:
        result[d["test_type"]] = {
            "file_id": d["file_id"],
            "url": f"/api/videos/stream/{d['file_id']}",
        }
    return jsonify({"demos": result})


@videos_bp.route("/demo/<test_type>/stream", methods=["GET"])
def stream_demo(test_type):
    """Stream a demo video for a specific test type."""
    db = get_db()
    demo = db.demo_videos.find_one({"test_type": test_type.lower().strip()})

    if not demo:
        return jsonify({"error": f"No demo video for '{test_type}'"}), 404

    buffer, mime_type = stream_video(demo["file_id"])

    if not buffer:
        return jsonify({"error": "Could not stream demo video"}), 500

    return Response(
        buffer.read(),
        mimetype=mime_type,
        headers={
            "Content-Type": mime_type,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=86400",
        },
    )


@videos_bp.route("/demo/upload", methods=["POST"])
@jwt_required()
def upload_demo_video():
    """HeadAdmin uploads a demo video for a test type."""
    user_id = get_jwt_identity()
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})

    if not user or user.get("role") != "headadmin":
        return jsonify({"error": "Head Admin access required"}), 403

    test_type = request.form.get("test_type", "").lower().strip()
    if not test_type:
        return jsonify({"error": "test_type is required"}), 400

    video = request.files.get("video")
    if not video:
        return jsonify({"error": "video file is required"}), 400

    # Upload to Google Drive
    object_name = f"demo/{test_type}_demo_{ObjectId()}.mp4"
    content_type = video.content_type or "video/mp4"
    file_id = upload_video(video.stream, object_name, content_type)

    if not file_id:
        return jsonify({"error": "Failed to upload video to Drive"}), 500

    # Upsert in MongoDB — one demo per test type
    db.demo_videos.update_one(
        {"test_type": test_type},
        {"$set": {"test_type": test_type, "file_id": file_id}},
        upsert=True,
    )

    return jsonify({
        "message": f"Demo video for '{test_type}' uploaded successfully",
        "file_id": file_id,
    })


@videos_bp.route("/demo/<test_type>", methods=["DELETE"])
@jwt_required()
def delete_demo_video(test_type):
    """HeadAdmin deletes a demo video for a test type."""
    user_id = get_jwt_identity()
    db = get_db()
    user = db.users.find_one({"_id": ObjectId(user_id)})

    if not user or user.get("role") != "headadmin":
        return jsonify({"error": "Head Admin access required"}), 403

    result = db.demo_videos.delete_one({"test_type": test_type.lower().strip()})
    if result.deleted_count == 0:
        return jsonify({"error": "No demo video found for this test type"}), 404

    return jsonify({"message": f"Demo video for '{test_type}' deleted"})
