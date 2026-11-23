from flask import Blueprint, jsonify, request
from sqlalchemy import func, or_, select
from .extensions import db
from .models import AcademicRecord, Assessment, AssessmentAttempt, Prediction, Question, StudentProfile, User
from .validation import ApiError, admin_required, number, record_public, subjects_value, text
from .student import assessment_public

admin_bp = Blueprint('admin', __name__)


@admin_bp.get('/admin/dashboard')
@admin_required
def dashboard(user):
    students = db.session.scalars(select(User).filter_by(role='student')).all()
    records = list(db.session.scalars(select(AcademicRecord)).all())
    latest = {}
    for record in sorted(records, key=lambda r: r.id):
        latest[record.student_id] = record
    sgpas = [r.sgpa for r in latest.values() if r.sgpa is not None]
    attendance = [r.attendance for r in latest.values() if r.attendance is not None]
    return jsonify(students=len(students), activeStudents=sum(s.active for s in students), averageCgpa=round(sum(sgpas) / len(sgpas), 2) if sgpas else None, averageAttendance=round(sum(attendance) / len(attendance), 2) if attendance else None, records=len(records), assessments=db.session.scalar(select(func.count(Assessment.id))), predictions=db.session.scalar(select(func.count(Prediction.id))))


@admin_bp.route('/admin/students', methods=['GET', 'POST'])
@admin_required
def students(user):
    if request.method == 'GET':
        search = request.args.get('search', '').strip()
        query = select(User).filter_by(role='student')
        if search:
            like = f'%{search}%'
            query = query.join(StudentProfile, isouter=True).where(or_(User.name.ilike(like), User.email.ilike(like), StudentProfile.student_id.ilike(like)))
        result = []
        for student in db.session.scalars(query.order_by(User.id)):
            profile = student.profile
            record = db.session.scalar(select(AcademicRecord).filter_by(student_id=student.id).order_by(AcademicRecord.id.desc()).limit(1))
            result.append({'id': student.id, 'name': student.name, 'email': student.email, 'studentId': profile.student_id if profile else '', 'department': profile.department if profile else '', 'academicYear': profile.academic_year if profile else '', 'currentSemester': profile.current_semester if profile else 1, 'cgpa': record.sgpa if record else None, 'attendance': record.attendance if record else None, 'active': student.active})
        return jsonify(result)
    data = request.get_json(silent=True) or {}
    name, email = text(data, 'name', maximum=120), text(data, 'email', maximum=254).lower()
    student_id = text(data, 'studentId', maximum=40)
    password = data.get('password')
    if not isinstance(password, str) or not 12 <= len(password) <= 128:
        raise ApiError('A temporary password must contain 12–128 characters.')
    if db.session.scalar(select(User.id).filter_by(email=email)) or db.session.scalar(select(StudentProfile.id).filter_by(student_id=student_id)):
        raise ApiError('The email or student ID is already in use.', 409)
    student = User(name=name, email=email, role='student')
    student.set_password(password)
    db.session.add(student)
    db.session.flush()
    db.session.add(StudentProfile(user_id=student.id, name=name, email=email, student_id=student_id, college=text(data, 'college', required=False, maximum=200) or '', department=text(data, 'department', maximum=120), degree=text(data, 'degree', required=False, maximum=120) or '', specialization=text(data, 'specialization', required=False, maximum=160) or '', admission_year=number(data, 'admissionYear', 1900, 2200, integer=True), academic_year=text(data, 'academicYear', maximum=30), current_semester=number(data, 'currentSemester', 1, 12, required=True, integer=True), expected_graduation_year=number(data, 'expectedGraduationYear', 1900, 2200, integer=True)))
    db.session.commit()
    return jsonify(id=student.id, name=student.name, email=student.email, studentId=student_id, department=student.profile.department, academicYear=student.profile.academic_year, currentSemester=student.profile.current_semester, cgpa=None, attendance=None, active=True), 201


@admin_bp.route('/admin/students/<int:student_id>', methods=['GET', 'PUT'])
@admin_required
def manage_student(user, student_id):
    student = db.session.get(User, student_id)
    if not student or student.role != 'student':
        raise ApiError('Student not found.', 404)
    if request.method == 'GET':
        return jsonify(student.profile.public())
    data = request.get_json(silent=True) or {}
    profile = student.profile
    profile.name = text(data, 'name', maximum=120)
    profile.email = text(data, 'email', maximum=254).lower()
    profile.student_id = text(data, 'studentId', maximum=40)
    profile.college = text(data, 'college', required=False, maximum=200) or ''
    profile.department = text(data, 'department', maximum=120)
    profile.degree = text(data, 'degree', required=False, maximum=120) or ''
    profile.specialization = text(data, 'specialization', required=False, maximum=160) or ''
    profile.admission_year = number(data, 'admissionYear', 1900, 2200, integer=True)
    profile.academic_year = text(data, 'academicYear', maximum=30)
    profile.current_semester = number(data, 'currentSemester', 1, 12, required=True, integer=True)
    profile.expected_graduation_year = number(data, 'expectedGraduationYear', 1900, 2200, integer=True)
    student.name, student.email = profile.name, profile.email
    db.session.commit()
    return jsonify(profile.public())


@admin_bp.route('/admin/academic-records', methods=['GET', 'POST'])
@admin_required
def academic_records(user):
    if request.method == 'GET':
        query = select(AcademicRecord, User.name).join(User, User.id == AcademicRecord.student_id)
        student_id = request.args.get('studentId', type=int)
        semester = request.args.get('semester', type=int)
        if student_id:
            query = query.where(AcademicRecord.student_id == student_id)
        if semester:
            query = query.where(AcademicRecord.semester == semester)
        return jsonify([{**record_public(record), 'studentName': name} for record, name in db.session.execute(query.order_by(AcademicRecord.id)).all()])
    data = request.get_json(silent=True) or {}
    student_id = number(data, 'studentId', 1, required=True, integer=True)
    student = db.session.get(User, student_id)
    if not student or student.role != 'student':
        raise ApiError('Student not found.', 404)
    semester = number(data, 'semester', 1, 12, required=True, integer=True)
    year = text(data, 'academicYear', maximum=30)
    if db.session.scalar(select(AcademicRecord.id).filter_by(student_id=student_id, semester=semester, academic_year=year)):
        raise ApiError('This student already has a record for this semester and academic year.', 409)
    attended, total = number(data, 'classesAttended', 0, required=False, integer=True), number(data, 'totalClasses', 0, required=False, integer=True)
    attendance = number(data, 'attendance', 0, 100)
    if attended is not None and total is not None and attended > total:
        raise ApiError('Classes attended cannot exceed total classes.')
    if attended is not None and total:
        attendance = round(attended / total * 100, 2)
    record = AcademicRecord(student_id=student_id, semester=semester, academic_year=year, sgpa=number(data, 'sgpa', 0, 10), attendance=attendance, classes_attended=attended, total_classes=total, active_backlogs=number(data, 'activeBacklogs', 0, 100, required=True, integer=True), cleared_backlogs=number(data, 'clearedBacklogs', 0, 100, required=True, integer=True), class10=number(data, 'class10', 0, 100), class12=number(data, 'class12', 0, 100), subjects=subjects_value(data))
    db.session.add(record)
    db.session.commit()
    return jsonify(record_public(record)), 201


@admin_bp.route('/admin/academic-records/<int:record_id>', methods=['PUT', 'DELETE'])
@admin_required
def manage_record(user, record_id):
    record = db.session.get(AcademicRecord, record_id)
    if not record:
        raise ApiError('Academic record not found.', 404)
    if request.method == 'DELETE':
        db.session.delete(record)
        db.session.commit()
        return jsonify(message='Academic record deleted.')
    data = request.get_json(silent=True) or {}
    semester = number(data, 'semester', 1, 12, required=True, integer=True)
    year = text(data, 'academicYear', maximum=30)
    if db.session.scalar(select(AcademicRecord.id).where(AcademicRecord.student_id == record.student_id, AcademicRecord.semester == semester, AcademicRecord.academic_year == year, AcademicRecord.id != record.id)):
        raise ApiError('An academic record already exists for this semester and year.', 409)
    attended, total = number(data, 'classesAttended', 0, required=False, integer=True), number(data, 'totalClasses', 0, required=False, integer=True)
    attendance = number(data, 'attendance', 0, 100)
    if attended is not None and total is not None and attended > total:
        raise ApiError('Classes attended cannot exceed total classes.')
    if attended is not None and total:
        attendance = round(attended / total * 100, 2)
    for key, maximum in [('activeBacklogs', 100), ('clearedBacklogs', 100)]:
        setattr(record, key, number(data, key, 0, maximum, required=True, integer=True))
    record.semester, record.academic_year, record.sgpa, record.attendance = semester, year, number(data, 'sgpa', 0, 10), attendance
    record.classes_attended, record.total_classes = attended, total
    record.class10, record.class12 = number(data, 'class10', 0, 100), number(data, 'class12', 0, 100)
    record.subjects = subjects_value(data)
    db.session.commit()
    return jsonify(record_public(record))


@admin_bp.route('/admin/assessments', methods=['GET', 'POST'])
@admin_required
def assessments(user):
    if request.method == 'GET':
        return jsonify([assessment_public(a) for a in db.session.scalars(select(Assessment).order_by(Assessment.id)).all()])
    data = request.get_json(silent=True) or {}
    category, difficulty = text(data, 'category', maximum=100), text(data, 'difficulty', maximum=20)
    if difficulty not in ['Basic', 'Intermediate', 'Advanced']:
        raise ApiError('Choose a valid difficulty.')
    count = db.session.scalar(select(func.count(Question.id)).filter_by(category=category, difficulty=difficulty))
    if not count:
        raise ApiError('Add at least one question for this category and difficulty before publishing.')
    due = data.get('dueAt')
    if due:
        from datetime import datetime
        try:
            due = datetime.fromisoformat(due.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            raise ApiError('dueAt must be an ISO date string.')
    assessment = Assessment(title=text(data, 'title', maximum=160), category=category, difficulty=difficulty, duration=number(data, 'durationMinutes', 1, 180, required=True, integer=True), due_at=due)
    db.session.add(assessment)
    db.session.commit()
    return jsonify(assessment_public(assessment)), 201


@admin_bp.route('/admin/questions', methods=['GET', 'POST'])
@admin_required
def questions(user):
    if request.method == 'GET':
        return jsonify([record_public(q) for q in db.session.scalars(select(Question).order_by(Question.id)).all()])
    data = request.get_json(silent=True) or {}
    options = data.get('options')
    if not isinstance(options, list) or len(options) != 4 or any(not isinstance(o, str) or not o.strip() or len(o) > 500 for o in options):
        raise ApiError('Provide four non-empty answer options, each up to 500 characters.')
    correct = number(data, 'correctIndex', 0, 3, required=True, integer=True)
    difficulty = text(data, 'difficulty', maximum=20)
    if difficulty not in ['Basic', 'Intermediate', 'Advanced']:
        raise ApiError('Choose a valid difficulty.')
    question = Question(text=data.get('text'), options=options, correct_index=correct, category=text(data, 'category', maximum=100), difficulty=difficulty, explanation=text(data, 'explanation', required=False, maximum=2000))
    db.session.add(question)
    db.session.commit()
    return jsonify(record_public(question)), 201


@admin_bp.route('/admin/questions/<int:question_id>', methods=['PUT', 'DELETE'])
@admin_required
def manage_question(user, question_id):
    question = db.session.get(Question, question_id)
    if not question:
        raise ApiError('Question not found.', 404)
    if request.method == 'DELETE':
        db.session.delete(question)
        db.session.commit()
        return jsonify(message='Question deleted. Existing submitted results are preserved.')
    data = request.get_json(silent=True) or {}
    options = data.get('options')
    if not isinstance(options, list) or len(options) != 4 or any(not isinstance(o, str) or not o.strip() or len(o) > 500 for o in options):
        raise ApiError('Provide four valid answer options.')
    difficulty = text(data, 'difficulty', maximum=20)
    if difficulty not in ['Basic', 'Intermediate', 'Advanced']:
        raise ApiError('Choose a valid difficulty.')
    for key, maximum in [('text', 2000), ('category', 100), ('explanation', 2000)]:
        setattr(question, key, text(data, key, required=key != 'explanation', maximum=maximum))
    question.options, question.correct_index, question.difficulty = options, number(data, 'correctIndex', 0, 3, required=True, integer=True), difficulty
    db.session.commit()
    return jsonify(record_public(question))


@admin_bp.get('/admin/predictions')
@admin_required
def predictions(user):
    items = db.session.scalars(select(Prediction).join(User, User.id == Prediction.student_id).order_by(Prediction.created_at.desc())).all()
    return jsonify([{'id': p.id, 'studentName': name, 'target': p.target, 'outcome': p.outcome, 'modelVersion': p.model_version, 'createdAt': p.created_at.isoformat(), 'inputs': p.inputs, **p.result} for p in items])
