"""Train on a real, consented CSV dataset. No synthetic student records are supplied.

Required target: next_semester_pass, binary 0/1, defined by the institution's verified
outcomes. This program does not relabel arbitrary continuous marks as pass/fail.
Use student_id for grouped splitting to prevent the same student appearing in
training and test partitions. All imputation and scaling is inside the pipeline.
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, precision_score, recall_score, f1_score
from sklearn.model_selection import GroupShuffleSplit, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

FEATURES = ['previousMarks', 'currentMarks', 'sgpa', 'cgpa', 'attendance', 'studyHours', 'backlogs', 'assessmentScore']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('csv', type=Path, help='Real dataset CSV path')
    parser.add_argument('output', type=Path, help='Output joblib artifact path')
    args = parser.parse_args()
    frame = pd.read_csv(args.csv)
    required = FEATURES + ['next_semester_pass'] + (['student_id'] if 'student_id' in frame.columns else [])
    missing = [key for key in required if key not in frame.columns]
    if missing:
        raise SystemExit(f'Missing columns: {missing}')
    if frame['next_semester_pass'].isna().any() or set(frame['next_semester_pass'].unique()).difference({0, 1}):
        raise SystemExit('next_semester_pass must contain only verified binary outcomes 0 and 1, with no missing labels.')
    if len(frame) < 20 or frame['next_semester_pass'].nunique() != 2:
        raise SystemExit('At least 20 labeled examples from both outcome classes are required. No model will be fabricated.')
    groups = frame['student_id'] if 'student_id' in frame.columns else None
    if groups is not None:
        splitter = GroupShuffleSplit(test_size=.2, random_state=42)
        train_index, test_index = next(splitter.split(frame, groups=groups))
        train, test = frame.iloc[train_index], frame.iloc[test_index]
    else:
        train, test = train_test_split(frame, test_size=.2, random_state=42, stratify=frame['next_semester_pass'])
    if groups is not None and set(train['student_id']).intersection(test['student_id']):
        raise SystemExit('Student leakage detected. The train and test partitions must be disjoint.')
    if len(train) < 20 or train['next_semester_pass'].nunique() != 2:
        raise SystemExit('The training partition is too small or contains only one class. Use a larger real dataset.')
    if groups is not None:
        train_val, validation = train_test_split(train, test_size=.2, random_state=42, stratify=train['next_semester_pass'], groups=train['student_id'])
        if set(train_val['student_id']).intersection(validation['student_id']):
            raise SystemExit('Student leakage detected between training and validation partitions.')
    else:
        train_val, validation = train_test_split(train, test_size=.2, random_state=42, stratify=train['next_semester_pass'])
    preprocessor = ColumnTransformer([('numeric', Pipeline([('impute', SimpleImputer(strategy='median')), ('scale', StandardScaler())]), FEATURES)], sparse_threshold=0)
    candidates = {
        'Decision Tree': DecisionTreeClassifier(max_depth=6, min_samples_leaf=3, class_weight='balanced', random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=200, max_depth=10, min_samples_leaf=3, class_weight='balanced', random_state=42, n_jobs=-1),
    }
    validation_results = {}
    fitted = {}
    for name, estimator in candidates.items():
        pipeline = Pipeline([('preprocess', preprocessor), ('model', estimator)])
        pipeline.fit(train_val[FEATURES], train_val['next_semester_pass'])
        calibrated = False
        model = pipeline
        if name == 'Random Forest':
            # Calibrate on validation labels only; test labels never enter model fitting.
            model = CalibratedClassifierCV(estimator=pipeline, method='sigmoid', cv='prefit')
            model.fit(validation[FEATURES], validation['next_semester_pass'])
            calibrated = True
        prediction = model.predict(validation[FEATURES])
        validation_results[name] = f1_score(validation['next_semester_pass'], prediction, zero_division=0)
        fitted[name] = (model, calibrated)
    selected = max(validation_results, key=validation_results.get)
    model, calibrated = fitted[selected]
    predicted = model.predict(test[FEATURES])
    metrics = {'accuracy': float(accuracy_score(test['next_semester_pass'], predicted)), 'precision': float(precision_score(test['next_semester_pass'], predicted, zero_division=0)), 'recall': float(recall_score(test['next_semester_pass'], predicted, zero_division=0)), 'f1': float(f1_score(test['next_semester_pass'], predicted, zero_division=0)), 'confusionMatrix': confusion_matrix(test['next_semester_pass'], predicted, labels=[0, 1]).tolist(), 'report': classification_report(test['next_semester_pass'], predicted, labels=[0, 1], zero_division=0, output_dict=True)}
    artifact = {'model': model, 'selectedModel': selected, 'feature_names': FEATURES, 'target': 'next_semester_pass', 'metrics': metrics, 'dataset': {'name': args.csv.name, 'rows': len(frame), 'features': len(FEATURES), 'train': len(train_val), 'validation': len(validation), 'test': len(test), 'source': 'User-provided dataset; provenance and consent must be verified by the institution.'}, 'version': hashlib.sha256(args.csv.read_bytes()).hexdigest()[:12], 'calibrated': calibrated, 'trainedAt': datetime.now(timezone.utc).isoformat(), 'validationResults': validation_results}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, args.output)
    print(json.dumps({'selectedModel': selected, 'metrics': metrics, 'output': str(args.output)}, indent=2))


if __name__ == '__main__':
    main()
