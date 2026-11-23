import os
from pathlib import Path
from threading import Lock
import joblib

MODEL_PATH = os.getenv('MODEL_PATH', 'artifacts/studentiq_model.joblib')
_lock = Lock()
_model = None
_mtime = None


def load_model():
    """Load a locally trained artifact; never fabricate metrics or predictions."""
    global _model, _mtime
    path = Path(MODEL_PATH)
    if not path.is_file():
        return None
    mtime = path.stat().st_mtime
    with _lock:
        if _model is None or _mtime != mtime:
            artifact = joblib.load(path)
            required = {'model', 'feature_names', 'target', 'metrics', 'dataset', 'version', 'calibrated', 'trainedAt'}
            if not required.issubset(artifact):
                raise ValueError('The model artifact is missing required metadata.')
            _model, _mtime = artifact, mtime
        return _model


def model_info():
    artifact = load_model()
    if not artifact:
        return {'available': False, 'selectedModel': 'Not connected', 'target': 'Pending verification: confirm the supplied model training target, class meanings and 17-feature engineering contract before predictions are enabled.', 'version': '', 'metrics': None, 'dataset': None, 'calibrated': False, 'trainedAt': ''}
    return {'available': True, 'selectedModel': artifact['selectedModel'], 'target': artifact['target'], 'version': artifact['version'], 'metrics': artifact['metrics'], 'dataset': artifact['dataset'], 'calibrated': bool(artifact['calibrated']), 'trainedAt': artifact['trainedAt']}


def predict(inputs):
    from flask import jsonify
    artifact = load_model()
    if not artifact:
        raise ValueError('A trained model is not connected. Ask your institution to connect the model.')
    feature_names = artifact['feature_names']
    if any(name not in inputs for name in feature_names):
        missing = [name for name in feature_names if name not in inputs]
        raise ValueError(f'Required academic inputs are missing: {", ".join(missing)}.')
    import pandas as pd
    frame = pd.DataFrame([[inputs[name] for name in feature_names]], columns=feature_names)
    prediction = artifact['model'].predict(frame)[0]
    probabilities = artifact['model'].predict_proba(frame)[0] if hasattr(artifact['model'], 'predict_proba') else None
    classes = list(artifact['model'].classes_) if hasattr(artifact['model'], 'classes_') else []
    if probabilities is None or 1 not in classes:
        raise ValueError('The connected model does not support a binary pass probability.')
    probability = float(probabilities[classes.index(1)])
    outcome = 'Pass' if int(prediction) == 1 else 'At risk'
    risks = []
    if inputs.get('attendance', 100) < 75:
        risks.append('Your available attendance is below 75%. Review your schedule with your mentor.')
    if inputs.get('previousMarks', 100) < 60 or inputs.get('currentMarks', 100) < 60:
        risks.append('Some available academic marks are below 60%. Focused revision may help you strengthen your understanding.')
    if inputs.get('backlogs', 0) > 0:
        risks.append('You have active backlogs. Ask your institution about the available academic support.')
    return {'outcome': outcome, 'passProbability': probability, 'failProbability': 1 - probability, 'confidence': probability if artifact['calibrated'] else None, 'riskFactors': risks, 'modelVersion': artifact['version']}
