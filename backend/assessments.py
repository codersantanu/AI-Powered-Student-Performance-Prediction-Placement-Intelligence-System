from datetime import datetime, timezone
from random import sample
from flask import Blueprint, jsonify, request
from sqlalchemy import select
from .extensions import db
from .models import Assessment, AssessmentAttempt, Question
from .validation import ApiError, number, student_required, text
from .assessment_results import result_public, score_attempt
from .student import assessment_public

assessment_bp = Blueprint('assessments', __name__)


@assessment_bp.get('/assessments')
@student_required
def assessments(user):
    category = request.args.get('category')
    query = select(Assessment).where(Assessment.due_at.is_(None) | (Assessment.due_at >= datetime.now(timezone.utc)))
    if category:
        query = query.filter_by(category=category)
    return jsonify([assessment_public(a) for a in db.session.scalars(query.order_by(Assessment.due_at)).all()])


@assessment_bp.post('/assessments/start')
@student_required
def start(user):
    data = request.get_json(silent=True) or {}
    assessment = db.session.get(Assessment, number(data, 'assessmentId', 1, required=True, integer=True))
    if not assessment:
        raise ApiError('This assessment was not found.', 404)
    questions = list(db.session.scalars(select(Question).filter_by(category=assessment.category, difficulty=assessment.difficulty)).all())
    if not questions:
        raise ApiError('No questions are available for this assessment. Please contact your administrator.')
    selected = sample(questions, min(len(questions), 30))
    attempt = AssessmentAttempt(student_id=user.id, assessment_id=assessment.id, question_ids=[q.id for q in selected])
    db.session.add(attempt)
    db.session.commit()
    # Correct answers and explanations are never sent before submission.
    return jsonify(id=attempt.id, assessmentId=assessment.id, startedAt=attempt.created_at.isoformat(), submittedAt=None, duration=assessment.duration * 60, questions=[{'id': q.id, 'text': q.text, 'options': q.options, 'category': q.category, 'difficulty': q.difficulty} for q in selected], result=None), 201


@assessment_bp.post('/assessments/submit')
@student_required
def submit(user):
    data = request.get_json(silent=True) or {}
    attempt = db.session.scalar(select(AssessmentAttempt).filter_by(id=number(data, 'attemptId', 1, required=True, integer=True), student_id=user.id).with_for_update())
    if not attempt:
        raise ApiError('Your assessment attempt was not found.', 404)
    if attempt.submitted_at:
        return jsonify(result_public(attempt))
    assessment = db.session.get(Assessment, attempt.assessment_id)
    created_at = attempt.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - created_at).total_seconds()
    if elapsed > assessment.duration * 60 + 10:
        raise ApiError('The assessment time limit has ended. Contact your administrator about a new attempt.', 409)
    answers = data.get('answers')
    if not isinstance(answers, list) or len(answers) != len(attempt.question_ids):
        raise ApiError('Provide one answer for each question.')
    questions = list(db.session.scalars(select(Question).filter(Question.id.in_(attempt.question_ids))).all())
    by_id = {q.id: q for q in questions}
    ordered = [by_id[qid] for qid in attempt.question_ids if qid in by_id]
    if len(ordered) != len(attempt.question_ids):
        raise ApiError('Some questions are no longer available. Contact your administrator.', 409)
    for question, answer in zip(ordered, answers):
        if answer is not None and (
            isinstance(answer, bool)
            or not isinstance(answer, int)
            or answer < 0
            or answer >= len(question.options)
        ):
            raise ApiError('Each answer must be a valid option index or null.')
    attempt.answers = answers
    attempt.result = score_attempt(attempt, ordered)
    attempt.submitted_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(result_public(attempt))


@assessment_bp.get('/assessments/results')
@student_required
def results(user):
    attempts = db.session.scalars(select(AssessmentAttempt).filter(AssessmentAttempt.student_id == user.id, AssessmentAttempt.submitted_at.isnot(None)).order_by(AssessmentAttempt.submitted_at.desc())).all()
    return jsonify([result_public(a) for a in attempts])
