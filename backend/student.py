import os
import re
import uuid
from datetime import datetime, timezone
from flask import Blueprint, current_app, jsonify, request, send_from_directory
from sqlalchemy import func, select
from .extensions import db
from .models import AcademicRecord, Assessment, AssessmentAttempt, Prediction, Question, SkillEntry, StudyGoal, StudySession
from .validation import ApiError, date_value, number, owned, record_public, strings, student_required, text, url_value
from .recommendations import recommendations_for
from .assessment_results import result_public

student_bp = Blueprint('student', __name__)


@student_bp.get('/student/profile')
@student_required
def profile(user):
    if not user.profile:
        raise ApiError('A student profile has not been created for this account.', 404)
    return jsonify(user.profile.public())


@student_bp.put('/student/profile')
@student_required
def update_profile(user):
    data = request.get_json(silent=True) or {}
    profile = user.profile
    if not profile:
        raise ApiError('A student profile has not been created for this account.', 404)
    if 'name' in data:
        profile.name = text(data, 'name', maximum=120)
        user.name = profile.name
    if 'dateOfBirth' in data:
        birth_date = date_value(data, 'dateOfBirth')
        if birth_date and birth_date > datetime.now(timezone.utc).date().isoformat():
            raise ApiError('Date of birth cannot be in the future.')
        profile.date_of_birth = birth_date
    if 'phone' in data:
        phone = text(data, 'phone', required=False, maximum=30) or ''
        if phone and not re.fullmatch(r'\+?[0-9][0-9\s().-]{5,29}', phone):
            raise ApiError('Enter a valid phone number.')
        profile.phone = phone
    if 'address' in data:
        profile.address = text(data, 'address', required=False, maximum=500) or ''
    if 'skills' in data:
        profile.skills = strings(data, 'skills')
    if 'careerInterests' in data:
        profile.career_interests = strings(data, 'careerInterests')
    if 'preferredRoles' in data:
        profile.preferred_roles = strings(data, 'preferredRoles')
    if 'shortTermGoal' in data:
        profile.short_term_goal = text(data, 'shortTermGoal', required=False, maximum=1000) or ''
    if 'longTermGoal' in data:
        profile.long_term_goal = text(data, 'longTermGoal', required=False, maximum=1000) or ''
    if 'preferredTechnologies' in data:
        profile.preferred_technologies = strings(data, 'preferredTechnologies')
    db.session.commit()
    return jsonify(profile.public())


@student_bp.get('/student/profile/photo')
@student_required
def profile_photo(user):
    if not user.profile.photo_filename:
        raise ApiError('No profile photo has been uploaded.', 404)
    directory = os.path.join(current_app.instance_path, 'profile-photos')
    return send_from_directory(directory, user.profile.photo_filename, conditional=True, max_age=0)


@student_bp.post('/student/profile/photo')
@student_required
def upload_profile_photo(user):
    if not user.profile:
        raise ApiError('A student profile has not been created for this account.', 404)
    image = request.files.get('photo')
    if image is None or not image.filename:
        raise ApiError('Choose an image to upload.')
    content = image.stream.read(5 * 1024 * 1024 + 1)
    if not content or len(content) > 5 * 1024 * 1024:
        raise ApiError('Profile photos must be no larger than 5 MB.')
    signatures = {
        'image/jpeg': ('.jpg', lambda value: value.startswith(b'\xff\xd8\xff')),
        'image/png': ('.png', lambda value: value.startswith(b'\x89PNG\r\n\x1a\n')),
        'image/webp': ('.webp', lambda value: value[:4] == b'RIFF' and value[8:12] == b'WEBP'),
    }
    image_type = image.mimetype
    if image_type not in signatures or not signatures[image_type][1](content):
        raise ApiError('Upload a valid JPEG, PNG, or WebP image.')
    extension = signatures[image_type][0]
    directory = os.path.join(current_app.instance_path, 'profile-photos')
    os.makedirs(directory, exist_ok=True)
    filename = f'{uuid.uuid4().hex}{extension}'
    path = os.path.join(directory, filename)
    with open(path, 'wb') as photo_file:
        photo_file.write(content)
    old_filename = user.profile.photo_filename
    user.profile.photo_filename = filename
    try:
        db.session.commit()
    except Exception:
        os.remove(path)
        raise
    if old_filename:
        old_path = os.path.join(directory, old_filename)
        if os.path.isfile(old_path):
            os.remove(old_path)
    return jsonify(user.profile.public())


@student_bp.get('/student/academic-records')
@student_required
def academic_records(user):
    records = db.session.scalars(select(AcademicRecord).filter_by(student_id=user.id).order_by(AcademicRecord.academic_year, AcademicRecord.semester)).all()
    return jsonify([record_public(record) for record in records])


@student_bp.get('/student/dashboard')
@student_required
def dashboard(user):
    records = db.session.scalars(select(AcademicRecord).filter_by(student_id=user.id).order_by(AcademicRecord.id)).all()
    sessions = db.session.scalars(select(StudySession).filter_by(student_id=user.id).order_by(StudySession.date)).all()
    attempts = db.session.scalars(select(AssessmentAttempt).filter(AssessmentAttempt.student_id == user.id, AssessmentAttempt.submitted_at.isnot(None)).order_by(AssessmentAttempt.submitted_at)).all()
    upcoming = db.session.scalars(select(Assessment).where(Assessment.due_at.is_(None) | (Assessment.due_at >= datetime.now(timezone.utc))).order_by(Assessment.due_at)).all()
    prediction = db.session.scalars(select(Prediction).filter_by(student_id=user.id).order_by(Prediction.created_at.desc(), Prediction.id.desc())).first()
    return jsonify(profile=user.profile.public(), academicRecords=[record_public(r) for r in records], studySessions=[record_public(s) for s in sessions], assessmentResults=[result_public(a) for a in attempts], upcomingAssessments=[assessment_public(a) for a in upcoming], prediction=prediction_public(prediction), recommendations=recommendations_for(user.id), goals=[record_public(g) for g in db.session.scalars(select(StudyGoal).filter_by(student_id=user.id)).all()])


@student_bp.route('/student/study-sessions', methods=['GET', 'POST'])
@student_required
def study_sessions(user):
    if request.method == 'GET':
        items = db.session.scalars(select(StudySession).filter_by(student_id=user.id).order_by(StudySession.date.desc())).all()
        return jsonify([record_public(s) for s in items])
    data = request.get_json(silent=True) or {}
    today = datetime.now(timezone.utc).date().isoformat()
    session = StudySession(student_id=user.id, subject=text(data, 'subject', maximum=120), date=date_value(data, 'date', required=True), duration=number(data, 'duration', 0.01, 24, required=True), notes=text(data, 'notes', required=False, maximum=1000))
    if session.date > today:
        raise ApiError('Study sessions cannot be logged in the future.')
    db.session.add(session)
    db.session.commit()
    return jsonify(record_public(session)), 201


@student_bp.route('/student/study-sessions/<int:session_id>', methods=['PUT', 'DELETE'])
@student_required
def manage_session(user, session_id):
    session = owned(StudySession, user.id, session_id)
    if request.method == 'DELETE':
        db.session.delete(session)
        db.session.commit()
        return jsonify(message='Study session deleted.')
    data = request.get_json(silent=True) or {}
    session.subject = text(data, 'subject', maximum=120)
    session.date = date_value(data, 'date', required=True)
    if session.date > datetime.now(timezone.utc).date().isoformat():
        raise ApiError('Study sessions cannot be logged in the future.')
    session.duration = number(data, 'duration', 0.01, 24, required=True)
    session.notes = text(data, 'notes', required=False, maximum=1000)
    db.session.commit()
    return jsonify(record_public(session))


@student_bp.route('/student/skills', methods=['GET', 'POST'])
@student_required
def skills(user):
    if request.method == 'GET':
        return jsonify([skill_public(s) for s in db.session.scalars(select(SkillEntry).filter_by(student_id=user.id).order_by(SkillEntry.id)).all()])
    data = request.get_json(silent=True) or {}
    category = text(data, 'category', maximum=30)
    if category not in ['programming', 'technical', 'internship', 'certification', 'project']:
        raise ApiError('Choose a valid portfolio category.')
    start = date_value(data, 'startDate')
    end = date_value(data, 'endDate')
    if start and end and end < start:
        raise ApiError('End date cannot be before start date.')
    entry = SkillEntry(student_id=user.id, category=category, title=text(data, 'title', maximum=160), organization=text(data, 'organization', required=False, maximum=160), description=text(data, 'description', required=False, maximum=2000), level=text(data, 'level', maximum=30), start_date=start, end_date=end, url=url_value(data), secondary_url=url_value(data, 'secondaryUrl'), project_category=text(data, 'projectCategory', required=False, maximum=80) or '', technologies=strings(data, 'technologies'))
    db.session.add(entry)
    db.session.commit()
    return jsonify(skill_public(entry)), 201


@student_bp.route('/student/skills/<int:entry_id>', methods=['PUT', 'DELETE'])
@student_required
def manage_skill(user, entry_id):
    entry = owned(SkillEntry, user.id, entry_id)
    if request.method == 'DELETE':
        db.session.delete(entry)
        db.session.commit()
        return jsonify(message='Portfolio entry deleted.')
    data = request.get_json(silent=True) or {}
    category = text(data, 'category', maximum=30)
    if category not in ['programming', 'technical', 'internship', 'certification', 'project']:
        raise ApiError('Choose a valid portfolio category.')
    start, end = date_value(data, 'startDate'), date_value(data, 'endDate')
    if start and end and end < start:
        raise ApiError('End date cannot be before start date.')
    for key, maximum in [('title', 160), ('organization', 160), ('description', 2000), ('level', 30)]:
        setattr(entry, key, text(data, key, required=key == 'title', maximum=maximum))
    entry.category, entry.start_date, entry.end_date = category, start, end
    entry.url = url_value(data)
    entry.secondary_url = url_value(data, 'secondaryUrl')
    entry.project_category = text(data, 'projectCategory', required=False, maximum=80) or ''
    entry.technologies = strings(data, 'technologies')
    db.session.commit()
    return jsonify(skill_public(entry))


def skill_public(entry):
    return {
        'id': entry.id,
        'category': entry.category,
        'title': entry.title,
        'organization': entry.organization,
        'description': entry.description,
        'level': entry.level,
        'startDate': entry.start_date or '',
        'endDate': entry.end_date or '',
        'url': entry.url,
        'secondaryUrl': entry.secondary_url,
        'projectCategory': entry.project_category,
        'technologies': entry.technologies,
    }


@student_bp.route('/student/goals', methods=['GET', 'POST'])
@student_required
def goals(user):
    if request.method == 'GET':
        return jsonify([record_public(g) for g in db.session.scalars(select(StudyGoal).filter_by(student_id=user.id)).all()])
    data = request.get_json(silent=True) or {}
    period = text(data, 'period', maximum=20)
    if period not in ['weekly', 'monthly']:
        raise ApiError('Choose a weekly or monthly goal.')
    goal = StudyGoal(student_id=user.id, title=text(data, 'title', maximum=160), target=number(data, 'target', 1, 100, required=True, integer=True), completed=0, period=period)
    db.session.add(goal)
    db.session.commit()
    return jsonify(record_public(goal)), 201


@student_bp.route('/student/goals/<int:goal_id>', methods=['PUT', 'DELETE'])
@student_required
def manage_goal(user, goal_id):
    goal = owned(StudyGoal, user.id, goal_id)
    if request.method == 'DELETE':
        db.session.delete(goal)
        db.session.commit()
        return jsonify(message='Study goal deleted.')
    data = request.get_json(silent=True) or {}
    goal.completed = number(data, 'completed', 0, goal.target, required=True, integer=True)
    db.session.commit()
    return jsonify(record_public(goal))


@student_bp.get('/student/semesters')
@student_required
def semesters(user):
    return jsonify(sorted({r.semester for r in db.session.scalars(select(AcademicRecord).filter_by(student_id=user.id)).all()}))


def assessment_public(assessment):
    question_count = db.session.scalar(
        select(func.count(Question.id)).filter_by(
            category=assessment.category,
            difficulty=assessment.difficulty,
        )
    )
    return {'id': assessment.id, 'title': assessment.title, 'category': assessment.category, 'difficulty': assessment.difficulty, 'duration': assessment.duration * 60, 'questionCount': min(question_count, 30), 'dueAt': assessment.due_at.isoformat() if assessment.due_at else None}


def prediction_public(prediction):
    if not prediction:
        return None
    return {'id': prediction.id, 'target': prediction.target, 'outcome': prediction.outcome, 'modelVersion': prediction.model_version, 'createdAt': prediction.created_at.isoformat(), 'inputs': prediction.inputs, **prediction.result}
