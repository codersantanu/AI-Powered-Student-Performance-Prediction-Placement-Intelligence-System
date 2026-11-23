import math
import re
from datetime import datetime
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from .extensions import db
from .models import User


class ApiError(Exception):
    def __init__(self, message, status=400):
        self.message = message
        self.status = status


def error_response(error):
    # Imported locally to avoid circular application initialization.
    from . import create_app
    globals()['error_response'] = error_response


def text(data, key, required=True, maximum=160, default=''):
    value = data.get(key, default)
    if value is None and not required:
        return None
    if not isinstance(value, str) or (required and not value.strip()):
        raise ApiError(f'{key} must be a non-empty text value.')
    value = value.strip()
    if len(value) > maximum:
        raise ApiError(f'{key} is too long.')
    return value


def number(data, key, minimum=None, maximum=None, required=False, integer=False):
    value = data.get(key)
    if value is None and not required:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise ApiError(f'{key} must be numeric.')
    try:
        value = int(value) if integer else float(value)
    except (TypeError, ValueError):
        raise ApiError(f'{key} must be numeric.')
    if not math.isfinite(value) or (minimum is not None and value < minimum) or (maximum is not None and value > maximum):
        raise ApiError(f'{key} is outside the permitted range.')
    return value


def strings(data, key, maximum=500):
    value = data.get(key, [])
    if not isinstance(value, list) or any(not isinstance(item, str) or len(item) > maximum for item in value):
        raise ApiError(f'{key} must be a list of strings.')
    return list(dict.fromkeys(item.strip() for item in value if item.strip()))


def date_value(data, key, required=False):
    value = data.get(key)
    if not value:
        if required:
            raise ApiError(f'{key} is required.')
        return None
    try:
        datetime.strptime(value, '%Y-%m-%d')
    except (ValueError, TypeError):
        raise ApiError(f'{key} must be a valid date in YYYY-MM-DD format.')
    return value


def url_value(data, key='url'):
    value = text(data, key, required=False, maximum=1000)
    if value and not re.fullmatch(r'https?://[^\s]+', value):
        raise ApiError(f'{key} must be an http or https URL.')
    return value


def subjects_value(data):
    subjects = data.get('subjects', [])
    if not isinstance(subjects, list) or len(subjects) > 30:
        raise ApiError('subjects must be a list of at most 30 subjects.')
    names = set()
    for subject in subjects:
        if not isinstance(subject, dict):
            raise ApiError('Each subject must be an object.')
        name = text(subject, 'name', maximum=120)
        if name.lower() in names:
            raise ApiError('Subject names must be unique within a record.')
        names.add(name.lower())
        total = number(subject, 'totalMarks', 1, 100, required=True)
        obtained = number(subject, 'obtainedMarks', 0, total)
        previous = number(subject, 'previousMarks', 0, 100)
        topics = subject.get('topics', [])
        if not isinstance(topics, list) or len(topics) > 50:
            raise ApiError('topics must be a list of at most 50 topics.')
        for topic in topics:
            if not isinstance(topic, dict):
                raise ApiError('Each topic must be an object.')
            text(topic, 'name', maximum=120)
            number(topic, 'score', 0, 100)
            text(topic, 'description', required=False, maximum=2000)
            text(topic, 'improvement', required=False, maximum=2000)
            revision = topic.get('revisionTopics', [])
            if not isinstance(revision, list) or any(not isinstance(item, str) or len(item) > 120 for item in revision):
                raise ApiError('revisionTopics must be a list of strings.')
    return subjects


def current_user():
    identity = get_jwt_identity()
    user = db.session.get(User, int(identity))
    if not user or not user.active:
        raise ApiError('Please sign in again.', 401)
    return user


def student_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = current_user()
        if user.role != 'student':
            raise ApiError('This action requires a student account.', 403)
        return fn(user, *args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = current_user()
        if user.role != 'admin':
            raise ApiError('Administrator access is required.', 403)
        return fn(user, *args, **kwargs)
    return wrapper


def owned(model, student_id, record_id):
    item = db.session.get(model, record_id)
    if not item or item.student_id != student_id:
        raise ApiError('This record was not found for your account.', 404)
    return item


def record_public(record):
    result = {
        re.sub(r'_([a-z])', lambda match: match.group(1).upper(), column.name): getattr(record, column.name)
        for column in record.__table__.columns
    }
    if 'studentId' in result:
        student = db.session.get(User, result['studentId'])
        if student:
            result['studentName'] = student.name
    return result
