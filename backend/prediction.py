from flask import Blueprint, jsonify, request
from sqlalchemy import select
from .extensions import db
from .models import Prediction
from .validation import ApiError, number, student_required, text
from .ml import model_info, predict

prediction_bp = Blueprint('prediction', __name__)


@prediction_bp.get('/predictions/model-metrics')
def metrics():
    return jsonify(model_info())


@prediction_bp.post('/predictions/generate')
@student_required
def generate(user):
    data = request.get_json(silent=True) or {}
    target = text(data, 'target', maximum=100)
    if target != 'next_semester':
        raise ApiError('The connected model supports only the next_semester target. A different target requires a separately trained model.')
    raw = data.get('inputs')
    if not isinstance(raw, dict):
        raise ApiError('Provide the required academic inputs.')
    ranges = {'previousMarks': (0, 100), 'currentMarks': (0, 100), 'sgpa': (0, 10), 'cgpa': (0, 10), 'attendance': (0, 100), 'studyHours': (0, 24), 'backlogs': (0, 50), 'assessmentScore': (0, 100)}
    inputs = {key: number(raw, key, *ranges[key], required=True, integer=key == 'backlogs') for key in ranges}
    try:
        result = predict(inputs)
    except ValueError as error:
        raise ApiError(str(error), 503)
    prediction = Prediction(student_id=user.id, target=target, inputs=inputs, result=result, outcome=result['outcome'], model_version=result['modelVersion'])
    db.session.add(prediction)
    db.session.commit()
    return jsonify({'id': prediction.id, 'target': target, 'createdAt': prediction.created_at.isoformat(), 'inputs': inputs, **result}), 201


@prediction_bp.get('/predictions/history')
@student_required
def history(user):
    items = db.session.scalars(select(Prediction).filter_by(student_id=user.id).order_by(Prediction.created_at.desc(), Prediction.id.desc())).all()
    return jsonify([{'id': p.id, 'target': p.target, 'outcome': p.outcome, 'modelVersion': p.model_version, 'createdAt': p.created_at.isoformat(), 'inputs': p.inputs, **p.result} for p in items])
