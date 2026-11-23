import re
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, get_csrf_token, get_jwt, get_jwt_identity, jwt_required, set_access_cookies
from sqlalchemy import func
from .extensions import db
from .models import User, StudentProfile, RevokedToken
from .validation import ApiError, text

auth_bp = Blueprint('auth', __name__)


def public_user(user):
    return jsonify(user=user.public())


def session_response(user):
    token = create_access_token(identity=str(user.id), additional_claims={'role': user.role})
    response = jsonify(user=user.public(), access_token=token, csrf_token=get_csrf_token(token), token_type='Bearer')
    
    from flask import current_app
    if 'cookies' in current_app.config.get('JWT_TOKEN_LOCATION', []):
        set_access_cookies(response, token)
    return response


@auth_bp.post('/auth/register')
def register():
    data = request.get_json(silent=True) or {}
    name = text(data, 'name', maximum=120)
    email = text(data, 'email', maximum=254).lower()
    password = data.get('password')
    if not isinstance(password, str) or not 8 <= len(password) <= 128:
        raise ApiError('Password must contain between 8 and 128 characters.')
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
        raise ApiError('Enter a valid email address.')
    if db.session.execute(db.select(User.id).filter_by(email=email)).scalar():
        raise ApiError('An account with this email already exists.', 409)
    user = User(name=name, email=email, role='student')
    user.set_password(password)
    db.session.add(user)
    db.session.flush()
    db.session.add(StudentProfile(user_id=user.id, name=name, email=email, student_id=f'STU{user.id:08d}'))
    db.session.commit()
    return jsonify(message='Account created successfully. Please sign in.', user=user.public()), 201


@auth_bp.post('/auth/login')
def login():
    data = request.get_json(silent=True) or {}
    email = text(data, 'email', maximum=254).lower()
    password = data.get('password')
    if not isinstance(password, str) or not 1 <= len(password) <= 128:
        raise ApiError('Enter your email and password.')
    user = db.session.execute(db.select(User).filter_by(email=email)).scalar_one_or_none()
    if not user or not user.check_password(password) or not user.active:
        raise ApiError('The email or password is incorrect, or the account is inactive.', 401)
    return session_response(user)


@auth_bp.get('/auth/me')
@jwt_required()
def me():
    return public_user(db.session.get(User, int(get_jwt_identity())))


@auth_bp.get('/auth/session')
@jwt_required()
def session():
    user = db.session.get(User, int(get_jwt_identity()))
    return session_response(user)


@auth_bp.post('/auth/session')
@jwt_required()
def bearer_session():
    # Existing bearer clients can exchange their Authorization header for user metadata.
    user = db.session.get(User, int(get_jwt_identity()))
    return session_response(user)


@auth_bp.post('/auth/logout')
@jwt_required()
def logout():
    token = get_jwt()
    expires = datetime.fromtimestamp(token['exp'], tz=timezone.utc)
    if not db.session.execute(db.select(RevokedToken.id).filter_by(jti=token['jti'])).scalar():
        db.session.add(RevokedToken(jti=token['jti'], expires_at=expires))
        db.session.commit()
    response = jsonify(message='Signed out successfully.')
    from flask import current_app
    if 'cookies' in current_app.config.get('JWT_TOKEN_LOCATION', []):
        from flask_jwt_extended import unset_jwt_cookies
        unset_jwt_cookies(response)
    return response
