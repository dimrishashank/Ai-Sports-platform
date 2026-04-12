"""
Flask application entry point.
AI Sports Platform — Backend API Server.
"""
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from db import init_db
from storage import init_storage

# Import route blueprints
from routes.auth import auth_bp
from routes.athletes import athletes_bp
from routes.tests import tests_bp
from routes.submissions import submissions_bp
from routes.leaderboard import leaderboard_bp
from routes.dashboard import dashboard_bp
from routes.support import support_bp
from routes.notifications import notifications_bp
from routes.videos import videos_bp
from routes.training import training_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend dev server
    CORS(app, origins=["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"], supports_credentials=True)

    # JWT setup
    JWTManager(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(athletes_bp)
    app.register_blueprint(tests_bp)
    app.register_blueprint(submissions_bp)
    app.register_blueprint(leaderboard_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(support_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(videos_bp)
    app.register_blueprint(training_bp)

    # Health check
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "AI Sports Platform API"})

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({"error": "Unprocessable request"}), 422

    # Initialize services on startup
    with app.app_context():
        init_db()
        init_storage()

    return app


if __name__ == "__main__":
    app = create_app()
    print("\n🚀 AI Sports Platform API running on http://localhost:5000")
    print("   Health check: http://localhost:5000/api/health\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
