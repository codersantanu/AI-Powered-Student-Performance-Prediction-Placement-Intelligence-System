"""StudentIQ Flask application factory. MySQL is local/production; SQLite is test-only."""
import os
from datetime import timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, get_jwt, get_jwt_identity, jwt_required, verify_jwt_in_request
from flask_migrate import Migrate
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import HTTPException
from .extensions import db
from .models import User, RevokedToken
from .validation import ApiError

migrate = Migrate()


def create_app(config=None):
    app = Flask(__name__)
    database_url = os.getenv('DATABASE_URL')
    if not database_url and not config:
        raise RuntimeError('DATABASE_URL is required. Configure the backend environment.')
    app.config.update(
        SQLALCHEMY_DATABASE_URI=database_url or 'sqlite://',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ENGINE_OPTIONS={'pool_pre_ping': True, 'pool_recycle': 1800},
        MAX_CONTENT_LENGTH=5 * 1024 * 1024 + 64 * 1024,
        JWT_SECRET_KEY=(config or {}).get('JWT_SECRET_KEY', os.getenv('JWT_SECRET_KEY', '')),
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(minutes=30),
        JWT_TOKEN_LOCATION=['headers', 'cookies'] if os.getenv('JWT_AUTH_MODE', 'bearer') == 'cookie' else ['headers'],
        JWT_ERROR_MESSAGE_KEY='message',
        JWT_COOKIE_SECURE=True,
        JWT_COOKIE_CSRF_PROTECT=True,
    )
    if config:
        app.config.update(config)
    if not app.config['JWT_SECRET_KEY'] or len(app.config['JWT_SECRET_KEY']) < 32:
        raise RuntimeError('JWT_SECRET_KEY must contain at least 32 characters.')
    origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:4173').split(',')
    CORS(app, resources={r'/api/*': {'origins': [origin.strip() for origin in origins]}}, supports_credentials=True)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt_manager = JWTManager(app)

    @app.before_request
    def verify_current_account():
        if request.method == 'OPTIONS' or request.path == '/api/health':
            return None
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity is not None:
            user = db.session.get(User, int(identity))
            if not user or not user.active or str(user.id) != identity:
                return jsonify(message='Your session is no longer valid. Please sign in again.'), 401

    def is_token_revoked(jwt_header, jwt_data):
        return bool(db.session.execute(
            db.select(RevokedToken.id).filter_by(jti=jwt_data['jti'])
        ).scalar())

    jwt_manager.token_in_blocklist_loader(is_token_revoked)

    @app.errorhandler(ApiError)
    def api_validation_error(error):
        db.session.rollback()
        return jsonify(message=error.message), error.status

    @app.errorhandler(IntegrityError)
    def database_conflict(error):
        db.session.rollback()
        return jsonify(message='A record with these details already exists, or the update conflicts with an existing record.'), 409

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify(message=error.description), error.code

    @app.get('/api/health')
    def health():
        return jsonify(status='ok', service='StudentIQ API')

    from .auth import auth_bp
    from .student import student_bp
    from .assessments import assessment_bp
    from .prediction import prediction_bp
    from .admin import admin_bp
    from .reports import reports_bp
    from .special_assessments import special_assessment_bp
    for blueprint in (auth_bp, student_bp, assessment_bp, prediction_bp, admin_bp, reports_bp, special_assessment_bp):
        app.register_blueprint(blueprint, url_prefix='/api')

    @app.teardown_appcontext
    def remove_session(exception=None):
        db.session.remove()

    return app
