from datetime import datetime, timezone
from io import BytesIO
from flask import Blueprint, jsonify, request, send_file
from sqlalchemy import select
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from .extensions import db
from .models import AcademicRecord, AssessmentAttempt, Prediction, Report, SkillEntry, StudyGoal, StudySession
from .validation import ApiError, admin_required, student_required
from .ml import model_info

reports_bp = Blueprint('reports', __name__)
CATALOG = [
    ('academic', 'Academic Performance', 'Semester results, SGPA, and subject marks.'),
    ('semester', 'Semester-wise Progress', 'Academic progress across semesters.'),
    ('attendance', 'Attendance', 'Classes attended and attendance records.'),
    ('study', 'Study Behaviour', 'Study hours, sessions, and consistency.'),
    ('psychometric', 'Psychometric Assessment', 'Self-assessment responses and development areas.'),
    ('technical', 'Technical Assessment', 'Subject quiz results and revision topics.'),
    ('prediction', 'Performance Prediction', 'Actual stored model estimates, when available.'),
    ('overall', 'Overall Student Progress', 'An overview of your academic workspace.'),
]
CATALOG_BY_KEY = {key: title for key, title, _ in CATALOG}


def semester_filter(query, semester):
    return query.filter(AcademicRecord.semester == semester) if semester else query


def report_data(user, key, semester):
    records = list(db.session.scalars(semester_filter(select(AcademicRecord).filter_by(student_id=user.id).order_by(AcademicRecord.id), semester)).all())
    attempts = db.session.scalars(select(AssessmentAttempt).filter(AssessmentAttempt.student_id == user.id, AssessmentAttempt.submitted_at.isnot(None))).all()
    predictions = list(db.session.scalars(select(Prediction).filter_by(student_id=user.id).order_by(Prediction.created_at.desc())).all())
    record_rows = lambda: [{'semester': r.semester, 'academicYear': r.academic_year, 'SGPA': r.sgpa, 'attendance': r.attendance, 'classesAttended': r.classes_attended, 'totalClasses': r.total_classes, 'activeBacklogs': r.active_backlogs, 'clearedBacklogs': r.cleared_backlogs, 'subjects': r.subjects} for r in records]
    if key == 'academic':
        return {'student': user.name, 'records': record_rows()}
    if key == 'semester':
        return {'semesters': [{'semester': r.semester, 'SGPA': r.sgpa, 'academicYear': r.academicYear} for r in records]}
    if key == 'attendance':
        return {'records': [{'semester': r.semester, 'attendance': r.attendance, 'classesAttended': r.classesAttended, 'totalClasses': r.totalClasses} for r in records]}
    if key == 'study':
        sessions = list(db.session.scalars(select(StudySession).filter_by(student_id=user.id).order_by(StudySession.date)).all())
        return {'sessions': [{'subject': s.subject, 'date': s.date, 'hours': s.duration, 'notes': s.notes} for s in sessions], 'totalHours': sum(s.duration for s in sessions)}
    if key in ['psychometric', 'technical']:
        return {'results': [{'title': a.assessment.title, 'date': a.submitted_at.isoformat(), **a.result} for a in attempts if (a.assessment.category == 'Psychometric') == (key == 'psychometric')]}
    if key == 'prediction':
        if not model_info()['available']:
            raise ApiError('A trained model is not connected. Prediction reports are not available yet.', 404)
        return {'predictions': [{'date': p.created_at.isoformat(), 'target': p.target, 'modelVersion': p.model_version, **p.result} for p in predictions], 'note': 'Model estimates are not actual marks or guarantees.'}
    if key == 'overall':
        sessions = list(db.session.scalars(select(StudySession).filter_by(student_id=user.id)).all())
        skills = list(db.session.scalars(select(SkillEntry).filter_by(student_id=user.id)).all())
        goals = list(db.session.scalars(select(StudyGoal).filter_by(student_id=user.id)).all())
        return {'student': user.profile.public(), 'latestRecords': record_rows()[-1:], 'studyHours': sum(s.duration for s in sessions), 'assessments': [{'title': a.assessment.title, 'date': a.submitted_at.isoformat(), **a.result} for a in attempts], 'skills': [{'title': s.title, 'category': s.category, 'level': s.level} for s in skills], 'goals': [{'title': g.title, 'target': g.target, 'completed': g.completed} for g in goals]}
    raise ApiError('Report category not found.', 404)


@reports_bp.get('/student/reports')
@student_required
def catalog(user):
    available = model_info()['available']
    return jsonify([{'key': key, 'title': title, 'description': description, 'available': available if key == 'prediction' else True} for key, title, description in CATALOG])


@reports_bp.get('/student/reports/history')
@student_required
def history(user):
    return jsonify([{'id': r.id, 'key': r.key, 'title': r.title, 'semester': r.semester, 'generatedAt': r.created_at.isoformat()} for r in db.session.scalars(select(Report).filter_by(student_id=user.id).order_by(Report.created_at.desc())).all()])


@reports_bp.get('/student/reports/<key>')
@student_required
def view(user, key):
    if key not in CATALOG_BY_KEY:
        raise ApiError('Report category not found.', 404)
    semester = request.args.get('semester', type=int)
    if semester and not db.session.scalar(select(AcademicRecord.id).filter_by(student_id=user.id, semester=semester)):
        raise ApiError('No academic record is available for this semester.', 404)
    return jsonify(key=key, title=CATALOG_BY_KEY[key], semester=semester, generatedAt=datetime.now(timezone.utc).isoformat(), data=report_data(user, key, semester))


def render_pdf(title, student, semester, data):
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    style = getSampleStyleSheet()
    width, height = A4

    def write(text, size=10, bold=False):
        paragraph = Paragraph(str(text), style['Heading2'] if bold else style['BodyText'])
        paragraph.wrapOn(pdf, width - 46, height - 50)
        return paragraph

    def draw(paragraph, x=22, y=None):
        current_y = y if y is not None else pdf._current_y
        w, h = paragraph.wrap(width - 46, height - 50)
        if current_y - h < 45:
            pdf.showPage()
            current_y = height - 45
        paragraph.drawOn(pdf, x, current_y - h)
        pdf._current_y = current_y - h - 10

    pdf.setFillColor(HexColor('#4F46E5'))
    pdf.rect(0, height - 5, width, 5, fill=1, stroke=0)
    pdf._current_y = height - 40
    draw(write('StudentIQ', 22, True))
    draw(write(title, 17, True))
    draw(write(f'Student: {student} | Semester: {semester or "All"} | Generated: {datetime.now(timezone.utc):%Y-%m-%d}', 9))
    for key, value in data.items():
        draw(write(key.replace('_', ' ').title(), 11, True))
        if isinstance(value, list):
            for item in value:
                draw(write(item if not isinstance(item, dict) else ', '.join(f'{k}: {v}' for k, v in item.items()), 8))
        elif isinstance(value, dict):
            draw(write(', '.join(f'{k}: {v}' for k, v in value.items()), 8))
        else:
            draw(write(value, 9))
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer


@reports_bp.get('/student/reports/<key>/download')
@student_required
def download(user, key):
    if key not in CATALOG_BY_KEY:
        raise ApiError('Report category not found.', 404)
    semester = request.args.get('semester', type=int)
    data = report_data(user, key, semester)
    title = CATALOG_BY_KEY[key]
    pdf = render_pdf(title, user.name, semester, data)
    db.session.add(Report(student_id=user.id, key=key, title=title, semester=semester, data=data))
    db.session.commit()
    return send_file(pdf, mimetype='application/pdf', as_attachment=True, download_name=f'StudentIQ-{key}-report.pdf')


@reports_bp.get('/admin/reports/download')
@admin_required
def institution_download(user):
    semester = request.args.get('semester', type=int)
    query = select(AcademicRecord, User.name).join(User, User.id == AcademicRecord.student_id)
    if semester:
        query = query.where(AcademicRecord.semester == semester)
    rows = [{'student': name, 'semester': r.semester, 'SGPA': r.sgpa, 'attendance': r.attendance, 'activeBacklogs': r.activeBacklogs} for r, name in db.session.execute(query.order_by(AcademicRecord.id)).all()]
    return send_file(render_pdf('Institution Academic Analytics', 'Authorized administrator', semester, {'records': rows}), mimetype='application/pdf', as_attachment=True, download_name='StudentIQ-institution-report.pdf')
