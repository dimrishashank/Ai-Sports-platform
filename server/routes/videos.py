"""
Video streaming proxy route.
Streams videos from Google Drive through the server so they play inline in the browser.

Note: No JWT required — file IDs are long random strings that act as unguessable tokens.
This is the same security model as Google Drive's "anyone with the link" sharing.
"""
from flask import Blueprint, Response, jsonify
from storage import stream_video

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
