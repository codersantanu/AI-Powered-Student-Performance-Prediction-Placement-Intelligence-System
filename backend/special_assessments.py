"""StudentIQ specialised assessment API backed by the supplied MySQL schemas.

The technical test is objectively scored with the uploaded answer key and configured
negative marking. Behavioural and psychometric tests report dimension summaries only;
they are not clinical or validated diagnostic instruments.
"""
import json
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from sqlalchemy import text

from .extensions import db
from .validation import ApiError, admin_required, number, student_required

special_assessment_bp = Blueprint("special_assessments", __name__)

KINDS = {"technical", "behavioural", "psychometric"}


def _kind(kind):
    if kind not in KINDS:
        raise ApiError("Choose technical, behavioural or psychometric.", 404)
    return kind


def _profile_id(user):
    if not user.profile:
        raise ApiError("Complete your student profile before starting an assessment.", 409)
    return user.profile.id


def _rows(sql, params=None):
    return [dict(row) for row in db.session.execute(text(sql), params or {}).mappings().all()]


def _row(sql, params=None):
    result = db.session.execute(text(sql), params or {}).mappings().first()
    return dict(result) if result else None


def _as_json(value, fallback):
    if value is None:
        return fallback
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            return fallback
    return value


def _assessment(kind, assessment_id):
    kind = _kind(kind)
    if kind == "technical":
        return _row(
            "SELECT id, title, description, duration_minutes AS duration, is_published "
            "FROM tech_assessments WHERE id=:id",
            {"id": assessment_id},
        )
    if kind == "behavioural":
        return _row(
            "SELECT id, title, description, 20 AS duration, is_published "
            "FROM beh_assessments WHERE id=:id",
            {"id": assessment_id},
        )
    return _row(
        "SELECT id, assessment_name AS title, description, 20 AS duration, is_published "
        "FROM psy_assessments WHERE id=:id",
        {"id": assessment_id},
    )


def _published_assessments(kind):
    if kind == "technical":
        rows = _rows(
            "SELECT a.id, a.title, a.description, a.duration_minutes * 60 AS duration, "
            "COUNT(q.id) AS question_count "
            "FROM tech_assessments a LEFT JOIN tech_questions q "
            "ON q.assessment_id=a.id AND q.is_active=1 "
            "WHERE a.is_published=1 GROUP BY a.id, a.title, a.description, a.duration_minutes "
            "ORDER BY a.id"
        )
        category, difficulty = "Technical", "Mixed"
    elif kind == "behavioural":
        rows = _rows(
            "SELECT a.id, a.title, a.description, 1200 AS duration, COUNT(q.id) AS question_count "
            "FROM beh_assessments a LEFT JOIN beh_questions q "
            "ON q.assessment_id=a.id AND q.is_active=1 "
            "WHERE a.is_published=1 GROUP BY a.id, a.title, a.description ORDER BY a.id"
        )
        category, difficulty = "Behavioural", "Situational"
    else:
        rows = _rows(
            "SELECT a.id, a.assessment_name AS title, a.description, 1200 AS duration, "
            "COUNT(q.id) AS question_count FROM psy_assessments a "
            "LEFT JOIN psy_questions q ON q.assessment_id=a.id AND q.is_active=1 "
            "WHERE a.is_published=1 GROUP BY a.id, a.assessment_name, a.description ORDER BY a.id"
        )
        category, difficulty = "Psychometric", "Situational"
    return [
        {
            "id": int(item["id"]),
            "title": item["title"],
            "description": item["description"],
            "category": category,
            "difficulty": difficulty,
            "duration": int(item["duration"]),
            "questionCount": int(item["question_count"] or 0),
            "dueAt": None,
        }
        for item in rows
    ]


def _questions(kind, assessment_id):
    if kind == "technical":
        questions = _rows(
            "SELECT q.id, q.question_code AS code, q.question_text AS question, "
            "q.difficulty, q.marks, q.negative_marks, q.display_order, "
            "c.category_name AS dimension, t.topic_name AS topic "
            "FROM tech_questions q "
            "JOIN tech_categories c ON c.id=q.category_id "
            "JOIN tech_topics t ON t.id=q.topic_id "
            "WHERE q.assessment_id=:assessment_id AND q.is_active=1 "
            "ORDER BY q.display_order, q.id",
            {"assessment_id": assessment_id},
        )
        for q in questions:
            q["options"] = _rows(
                "SELECT id, option_label AS label, option_text AS text, display_order "
                "FROM tech_question_options WHERE question_id=:question_id "
                "ORDER BY display_order, id",
                {"question_id": q["id"]},
            )
        return questions
    if kind == "behavioural":
        questions = _rows(
            "SELECT id, question_text AS question, question_type AS type, order_number AS display_order "
            "FROM beh_questions WHERE assessment_id=:assessment_id AND is_active=1 "
            "ORDER BY order_number, id",
            {"assessment_id": assessment_id},
        )
        for q in questions:
            q["options"] = _rows(
                "SELECT id, option_text AS text, order_number AS display_order "
                "FROM beh_answer_options WHERE question_id=:question_id AND is_active=1 "
                "ORDER BY order_number, id",
                {"question_id": q["id"]},
            )
        return questions
    questions = _rows(
        "SELECT id, question_code AS code, question_text AS question, explores, "
        "question_type AS type, display_order FROM psy_questions "
        "WHERE assessment_id=:assessment_id AND is_active=1 ORDER BY display_order, id",
        {"assessment_id": assessment_id},
    )
    for q in questions:
        q["options"] = _rows(
            "SELECT id, option_code AS label, option_text AS text, interpretation, display_order "
            "FROM psy_answer_options WHERE question_id=:question_id AND is_active=1 "
            "ORDER BY display_order, id",
            {"question_id": q["id"]},
        )
    return questions


def _public_attempt_question(kind, question):
    # Never expose correct answer keys or dimension mappings before submission.
    return {
        "id": question["id"],
        "text": question["question"],
        "options": [option["text"] for option in question["options"]],
        "category": question.get("dimension") or question.get("topic") or kind.title(),
        "difficulty": question.get("difficulty") or "Situational",
    }


def normalise_dimension_scores(score_rows, dimension_rows, min_score=1.0, max_score=4.0, scale=100.0):
    """Return dimension averages and linear normalisation configured by the SQL seed."""
    buckets = {}
    for item in score_rows:
        key = str(item["dimension_id"])
        if key not in buckets:
            buckets[key] = []
        buckets[key].append(float(item["score"]))
    result = []
    for dim in dimension_rows:
        key = str(dim["id"])
        values = buckets.get(key, [])
        if not values:
            continue
        average = sum(values) / len(values)
        normalised = ((average - min_score) / (max_score - min_score)) * scale if max_score > min_score else 0
        result.append({
            "id": dim["id"],
            "name": dim["name"],
            "score": round(max(0.0, min(scale, normalised)), 1),
            "average": round(average, 2),
            "responses": len(values),
        })
    return result


def _insert_attempt(kind, assessment_id, profile_id):
    if kind == "technical":
        table = "tech_assessment_attempts"
        status = "IN_PROGRESS"
    elif kind == "behavioural":
        table = "beh_assessment_attempts"
        status = "in_progress"
    else:
        table = "psy_assessment_attempts"
        status = "in_progress"
    next_number = db.session.execute(
        text(f"SELECT COALESCE(MAX(attempt_number),0)+1 FROM {table} "
             "WHERE assessment_id=:assessment_id AND student_profile_id=:profile_id"),
        {"assessment_id": assessment_id, "profile_id": profile_id},
    ).scalar_one()
    result = db.session.execute(
        text(f"INSERT INTO {table} (assessment_id, student_profile_id, attempt_number, status) "
             "VALUES (:assessment_id, :profile_id, :attempt_number, :status)"),
        {"assessment_id": assessment_id, "profile_id": profile_id,
         "attempt_number": next_number, "status": status},
    )
    return int(result.lastrowid)


def _get_attempt(kind, attempt_id, profile_id, lock=False):
    table = {
        "technical": "tech_assessment_attempts",
        "behavioural": "beh_assessment_attempts",
        "psychometric": "psy_assessment_attempts",
    }[kind]
    suffix = " FOR UPDATE" if lock else ""
    return _row(
        f"SELECT * FROM {table} WHERE id=:id AND student_profile_id=:profile_id{suffix}",
        {"id": attempt_id, "profile_id": profile_id},
    )


def _response_table(kind):
    return {
        "technical": "tech_student_responses",
        "behavioural": "beh_student_responses",
        "psychometric": "psy_student_responses",
    }[kind]


def _result_table(kind):
    return {
        "technical": "tech_assessment_results",
        "behavioural": "beh_assessment_results",
        "psychometric": "psy_assessment_results",
    }[kind]


def _score_technical(attempt, questions, answers, assessment):
    config = _row(
        "SELECT apply_negative_marking, allow_negative_total, pass_percentage, "
        "excellent_percentage, good_percentage, intermediate_percentage "
        "FROM tech_scoring_config WHERE assessment_id=:id AND is_active=1",
        {"id": assessment["id"]},
    ) or {
        "apply_negative_marking": 1, "allow_negative_total": 0,
        "pass_percentage": 40, "excellent_percentage": 85,
        "good_percentage": 70, "intermediate_percentage": 50,
    }
    answer_key = {
        int(row["question_id"]): int(row["correct_option_id"])
        for row in _rows(
            "SELECT qa.question_id, qa.correct_option_id FROM tech_question_answers qa "
            "JOIN tech_questions q ON q.id=qa.question_id "
            "WHERE q.assessment_id=:assessment_id",
            {"assessment_id": assessment["id"]},
        )
    }
    response_rows = []
    review = []
    correct = attempted = wrong = unanswered = 0
    maximum = total_score = 0.0
    category_totals = {}
    for question, selected_index in zip(questions, answers):
        options = question["options"]
        qid = int(question["id"])
        marks = float(question["marks"] or 0)
        negative = float(question["negative_marks"] or 0)
        maximum += marks
        selected = options[selected_index] if selected_index is not None else None
        is_correct = selected is not None and int(selected["id"]) == answer_key.get(qid)
        if selected is None:
            unanswered += 1
            awarded = 0.0
        else:
            attempted += 1
            if is_correct:
                correct += 1
                awarded = marks
            else:
                wrong += 1
                awarded = -negative if config["apply_negative_marking"] else 0.0
        total_score += awarded
        group = category_totals.setdefault(question["dimension"], {"marks": 0.0, "maximum": 0.0})
        group["marks"] += awarded
        group["maximum"] += marks
        response_rows.append({
            "question_id": qid,
            "selected_option_id": int(selected["id"]) if selected else None,
            "is_correct": int(is_correct) if selected else None,
            "awarded_marks": round(awarded, 2),
        })
        right = next((option for option in options if int(option["id"]) == answer_key.get(qid)), None)
        answer_details = _row(
            "SELECT explanation FROM tech_question_answers WHERE question_id=:question_id",
            {"question_id": qid},
        )
        review.append({
            "question": question["question"],
            "selected": selected["text"] if selected else "Not answered",
            "correctAnswer": right["text"] if right else "Answer key unavailable",
            "explanation": answer_details["explanation"] if answer_details else "",
            "correct": bool(is_correct),
        })
    if not config["allow_negative_total"]:
        total_score = max(0.0, total_score)
    percentage = (total_score / maximum * 100) if maximum else 0.0
    if percentage >= float(config["excellent_percentage"]):
        band = "Excellent"
    elif percentage >= float(config["good_percentage"]):
        band = "Good"
    elif percentage >= float(config["intermediate_percentage"]):
        band = "Developing"
    elif percentage >= float(config["pass_percentage"]):
        band = "Pass"
    else:
        band = "Needs improvement"
    categories = [
        {"name": name, "score": round(max(0, min(100, values["marks"] / values["maximum"] * 100)), 1)}
        for name, values in category_totals.items() if values["maximum"]
    ]
    result = {
        "id": int(attempt["id"]),
        "assessmentId": int(assessment["id"]),
        "title": assessment["title"],
        "category": "Technical",
        "scoringType": "technical",
        "score": round(percentage, 2),
        "correct": correct,
        "total": len(questions),
        "attempted": attempted,
        "wrong": wrong,
        "unanswered": unanswered,
        "maximumMarks": round(maximum, 2),
        "scoreObtained": round(total_score, 2),
        "performanceBand": band,
        "date": datetime.now(timezone.utc).isoformat(),
        "categories": categories,
        "review": review,
        "note": "Scored with the assessment answer key and scoring configuration.",
    }
    return result, response_rows


def _score_reflection(kind, attempt, questions, answers, assessment):
    if kind == "behavioural":
        dimension_rows = _rows("SELECT id, name FROM beh_dimensions ORDER BY name")
        config = _row(
            "SELECT min_score, max_score, normalization_scale FROM beh_scoring_config "
            "WHERE assessment_id=:id AND is_active=1",
            {"id": assessment["id"]},
        ) or {"min_score": 1, "max_score": 4, "normalization_scale": 100}
        mapping_table, question_key = "beh_option_dimension_scores", "option_id"
        dimension_key = "dimension_id"
        interpretation_table = "beh_option_interpretations"
        interpretation_field = "interpretation"
    else:
        dimension_rows = _rows(
            "SELECT id, dimension_name AS name FROM psy_dimensions "
            "WHERE assessment_id=:id ORDER BY id",
            {"id": assessment["id"]},
        )
        config = _row(
            "SELECT min_score, max_score, normalization_scale FROM psy_scoring_config "
            "WHERE assessment_id=:id AND is_active=1",
            {"id": assessment["id"]},
        ) or {"min_score": 1, "max_score": 4, "normalization_scale": 100}
        mapping_table, question_key = "psy_option_dimension_scores", "option_id"
        dimension_key = "dimension_id"
        interpretation_table = None
        interpretation_field = "interpretation"

    dimension_rows_scores = []
    response_rows = []
    review = []
    choice_summaries = []
    for question, selected_index in zip(questions, answers):
        selected = question["options"][selected_index] if selected_index is not None else None
        option_id = selected["id"] if selected else None
        if selected is None:
            scores = []
            interpretation = None
        elif kind == "behavioural":
            scores = _rows(
                "SELECT dimension_id, score FROM beh_option_dimension_scores WHERE option_id=:id",
                {"id": option_id},
            )
            interpretation = _row(
                "SELECT interpretation FROM beh_option_interpretations WHERE option_id=:id",
                {"id": option_id},
            )
        else:
            scores = _rows(
                "SELECT dimension_id, score FROM psy_option_dimension_scores WHERE option_id=:id",
                {"id": option_id},
            )
            interpretation = {"interpretation": selected.get("interpretation", "")}
        for score in scores:
            dimension_rows_scores.append(score)
        response_rows.append({
            "question_id": question["id"],
            "selected_option_id": option_id,
        })
        detail = interpretation["interpretation"] if interpretation else ""
        review.append({
            "question": question["question"],
            "selected": selected["text"] if selected else "Not answered",
            "interpretation": detail,
            "correct": None,
        })
        if selected and kind == "behavioural" and question.get("type") == "categorical":
            choice_summaries.append({
                "question": question["question"],
                "choice": selected["text"],
                "interpretation": detail,
            })

    dimensions = normalise_dimension_scores(
        dimension_rows_scores, dimension_rows,
        float(config["min_score"]), float(config["max_score"]),
        float(config["normalization_scale"]),
    )
    categories = [{"name": item["name"], "score": item["score"]} for item in dimensions]
    label = "Behavioural" if kind == "behavioural" else "Psychometric"
    result = {
        "id": int(attempt["id"]),
        "assessmentId": int(assessment["id"]),
        "title": assessment["title"],
        "category": label,
        "scoringType": kind,
        "score": None,
        "correct": 0,
        "total": len(questions),
        "date": datetime.now(timezone.utc).isoformat(),
        "categories": categories,
        "dimensions": dimensions,
        "choices": choice_summaries,
        "review": review,
        "note": (
            "Behavioural self-reflection summary. Dimension scores describe selected response tendencies; they are not an objective measure of character or job suitability."
            if kind == "behavioural" else
            "Situational self-reflection summary. This is not a clinically validated psychological instrument or a diagnosis."
        ),
    }
    return result, response_rows


@special_assessment_bp.get("/special-assessments/<kind>")
@student_required
def list_assessments(user, kind):
    return jsonify(_published_assessments(_kind(kind)))


@special_assessment_bp.post("/special-assessments/<kind>/start")
@student_required
def start_assessment(user, kind):
    kind = _kind(kind)
    data = request.get_json(silent=True) or {}
    assessment_id = number(data, "assessmentId", 1, required=True, integer=True)
    assessment = _assessment(kind, assessment_id)
    if not assessment or not assessment["is_published"]:
        raise ApiError("This assessment is not available yet. Ask your administrator to publish it.", 404)
    questions = _questions(kind, assessment_id)
    if not questions:
        raise ApiError("This assessment has no active questions.", 409)
    if kind != "technical" and any(not q["options"] for q in questions):
        raise ApiError("Some questions have no active answer options. Contact your administrator.", 409)
    attempt_id = _insert_attempt(kind, assessment_id, _profile_id(user))
    db.session.commit()
    started_at = datetime.now(timezone.utc).isoformat()
    return jsonify(
        id=attempt_id,
        assessmentId=assessment_id,
        startedAt=started_at,
        submittedAt=None,
        duration=int(assessment["duration"]) * 60,
        questions=[_public_attempt_question(kind, q) for q in questions],
        result=None,
    ), 201


@special_assessment_bp.post("/special-assessments/<kind>/submit")
@student_required
def submit_assessment(user, kind):
    kind = _kind(kind)
    data = request.get_json(silent=True) or {}
    attempt_id = number(data, "attemptId", 1, required=True, integer=True)
    profile_id = _profile_id(user)
    attempt = _get_attempt(kind, attempt_id, profile_id, lock=True)
    if not attempt:
        raise ApiError("Assessment attempt not found for this student.", 404)
    submitted = attempt.get("submitted_at")
    already_submitted = (
        attempt.get("status") in ("SUBMITTED", "EVALUATED", "submitted", "evaluated")
        or submitted is not None
    )
    if already_submitted:
        return jsonify(_saved_result(kind, attempt)), 200
    assessment = _assessment(kind, int(attempt["assessment_id"]))
    started_at = attempt.get("started_at")
    if isinstance(started_at, str):
        try:
            started_at = datetime.fromisoformat(started_at)
        except ValueError:
            started_at = None
    if started_at is not None:
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
        allowed = int(assessment["duration"]) * 60 + 30
        if elapsed > allowed:
            raise ApiError("The assessment time limit has ended. Your answers were not accepted.", 409)
    questions = _questions(kind, int(attempt["assessment_id"]))
    answers = data.get("answers")
    if not isinstance(answers, list) or len(answers) != len(questions):
        raise ApiError("Submit one option index for every question. Use null only for unanswered technical questions.")
    validated = []
    for q, choice in zip(questions, answers):
        if choice is None:
            validated.append(None)
            continue
        if isinstance(choice, bool) or not isinstance(choice, int) or not 0 <= choice < len(q["options"]):
            raise ApiError("Each answer must be a valid option index.")
        validated.append(choice)

    if kind == "technical":
        result, response_rows = _score_technical(attempt, questions, validated, assessment)
    else:
        result, response_rows = _score_reflection(kind, attempt, questions, validated, assessment)

    response_table = _response_table(kind)
    for response in response_rows:
        if kind == "technical":
            db.session.execute(
                text(f"INSERT INTO {response_table} "
                     "(attempt_id, question_id, selected_option_id, is_correct, awarded_marks, answered_at) "
                     "VALUES (:attempt_id, :question_id, :selected_option_id, :is_correct, :awarded_marks, UTC_TIMESTAMP())"),
                {"attempt_id": attempt_id, **response},
            )
        else:
            db.session.execute(
                text(f"INSERT INTO {response_table} "
                     "(attempt_id, question_id, selected_option_id, answered_at) "
                     "VALUES (:attempt_id, :question_id, :selected_option_id, UTC_TIMESTAMP())"),
                {"attempt_id": attempt_id, **response},
            )

    if kind == "technical":
        db.session.execute(
            text("INSERT INTO tech_assessment_results "
                 "(attempt_id, total_questions, attempted_questions, correct_answers, wrong_answers, "
                 "unanswered_questions, maximum_marks, score_obtained, percentage, performance_band) "
                 "VALUES (:attempt_id, :total, :attempted, :correct, :wrong, :unanswered, "
                 ":maximum, :obtained, :percentage, :band)"),
            {"attempt_id": attempt_id, "total": result["total"], "attempted": result["attempted"],
             "correct": result["correct"], "wrong": result["wrong"], "unanswered": result["unanswered"],
             "maximum": result["maximumMarks"], "obtained": result["scoreObtained"],
             "percentage": result["score"], "band": result["performanceBand"]},
        )
        db.session.execute(
            text("UPDATE tech_assessment_attempts SET status='SUBMITTED', submitted_at=UTC_TIMESTAMP() WHERE id=:id"),
            {"id": attempt_id},
        )
    elif kind == "behavioural":
        db.session.execute(
            text("INSERT INTO beh_assessment_results "
                 "(attempt_id, dimension_scores, behavioural_profile, summary) "
                 "VALUES (:attempt_id, :dimension_scores, :profile, :summary)"),
            {"attempt_id": attempt_id,
             "dimension_scores": json.dumps(result["dimensions"], ensure_ascii=False),
             "profile": json.dumps(result, ensure_ascii=False),
             "summary": result["note"]},
        )
        db.session.execute(
            text("UPDATE beh_assessment_attempts SET status='evaluated', submitted_at=UTC_TIMESTAMP() WHERE id=:id"),
            {"id": attempt_id},
        )
    else:
        db.session.execute(
            text("INSERT INTO psy_assessment_results "
                 "(attempt_id, dimension_scores, personality_profile, summary) "
                 "VALUES (:attempt_id, :dimension_scores, :profile, :summary)"),
            {"attempt_id": attempt_id,
             "dimension_scores": json.dumps(result["dimensions"], ensure_ascii=False),
             "profile": json.dumps(result, ensure_ascii=False),
             "summary": result["note"]},
        )
        db.session.execute(
            text("UPDATE psy_assessment_attempts SET status='evaluated', submitted_at=UTC_TIMESTAMP() WHERE id=:id"),
            {"id": attempt_id},
        )
    db.session.commit()
    return jsonify(result), 200


def _saved_result(kind, attempt):
    attempt_id = int(attempt["id"])
    if kind == "technical":
        row = _row("SELECT * FROM tech_assessment_results WHERE attempt_id=:id", {"id": attempt_id})
        if not row:
            raise ApiError("The saved result could not be found.", 404)
        assessment = _assessment(kind, int(attempt["assessment_id"]))
        questions = _questions(kind, int(attempt["assessment_id"]))
        responses = _rows(
            "SELECT question_id, selected_option_id FROM tech_student_responses WHERE attempt_id=:id",
            {"id": attempt_id},
        )
        selected = {int(item["question_id"]): item["selected_option_id"] for item in responses}
        answer_key = {
            int(item["question_id"]): int(item["correct_option_id"])
            for item in _rows("SELECT question_id, correct_option_id FROM tech_question_answers")
        }
        review = []
        category_totals = {}
        awarded_rows = {
            int(item["question_id"]): float(item["awarded_marks"] or 0)
            for item in _rows(
                "SELECT question_id, awarded_marks FROM tech_student_responses WHERE attempt_id=:id",
                {"id": attempt_id},
            )
        }
        for q in questions:
            picked_id = selected.get(int(q["id"]))
            chosen = next((o for o in q["options"] if o["id"] == picked_id), None)
            right = next((o for o in q["options"] if int(o["id"]) == answer_key.get(int(q["id"]))), None)
            exp = _row("SELECT explanation FROM tech_question_answers WHERE question_id=:id", {"id": q["id"]})
            review.append({
                "question": q["question"], "selected": chosen["text"] if chosen else "Not answered",
                "correctAnswer": right["text"] if right else "Answer key unavailable",
                "explanation": exp["explanation"] if exp else "",
                "correct": bool(chosen and right and chosen["id"] == right["id"]),
            })
            bucket = category_totals.setdefault(q["dimension"], {"awarded": 0.0, "maximum": 0.0})
            bucket["awarded"] += awarded_rows.get(int(q["id"]), 0.0)
            bucket["maximum"] += float(q["marks"] or 0)
        categories = [
            {
                "name": name,
                "score": round(max(0.0, min(100.0, value["awarded"] / value["maximum"] * 100)), 1),
            }
            for name, value in category_totals.items() if value["maximum"] > 0
        ]
        return {
            "id": attempt_id, "assessmentId": int(attempt["assessment_id"]),
            "title": assessment["title"], "category": "Technical", "scoringType": "technical",
            "score": float(row["percentage"]), "correct": int(row["correct_answers"]),
            "total": int(row["total_questions"]), "attempted": int(row["attempted_questions"]),
            "wrong": int(row["wrong_answers"]), "unanswered": int(row["unanswered_questions"]),
            "maximumMarks": float(row["maximum_marks"]), "scoreObtained": float(row["score_obtained"]),
            "performanceBand": row["performance_band"], "date": str(attempt["submitted_at"]),
            "categories": categories, "review": review,
            "note": "Scored with the assessment answer key and scoring configuration.",
        }
    result_table = _result_table(kind)
    row = _row(f"SELECT * FROM {result_table} WHERE attempt_id=:id", {"id": attempt_id})
    if not row:
        raise ApiError("The saved result could not be found.", 404)
    profile_field = "behavioural_profile" if kind == "behavioural" else "personality_profile"
    saved = _as_json(row.get(profile_field), {})
    saved["id"] = attempt_id
    return saved


@special_assessment_bp.get("/special-assessments/<kind>/results")
@student_required
def assessment_results(user, kind):
    kind = _kind(kind)
    profile_id = _profile_id(user)
    table = {
        "technical": "tech_assessment_attempts",
        "behavioural": "beh_assessment_attempts",
        "psychometric": "psy_assessment_attempts",
    }[kind]
    attempts = _rows(
        f"SELECT * FROM {table} WHERE student_profile_id=:profile_id "
        "AND submitted_at IS NOT NULL ORDER BY submitted_at DESC, id DESC",
        {"profile_id": profile_id},
    )
    results = []
    for attempt in attempts:
        results.append(_saved_result(kind, attempt))
    return jsonify(results)


@special_assessment_bp.get("/admin/special-assessments")
@admin_required
def admin_list_assessments(user):
    items = []
    for kind in ("technical", "behavioural", "psychometric"):
        if kind == "technical":
            rows = _rows("SELECT id, title, is_published FROM tech_assessments ORDER BY id")
        elif kind == "behavioural":
            rows = _rows("SELECT id, title, is_published FROM beh_assessments ORDER BY id")
        else:
            rows = _rows("SELECT id, assessment_name AS title, is_published FROM psy_assessments ORDER BY id")
        items.extend([
            {"kind": kind, "id": int(row["id"]), "title": row["title"], "published": bool(row["is_published"])}
            for row in rows
        ])
    return jsonify(items)


@special_assessment_bp.put("/admin/special-assessments/<kind>/<int:assessment_id>/publish")
@admin_required
def publish_assessment(user, kind, assessment_id):
    kind = _kind(kind)
    table = {"technical": "tech_assessments", "behavioural": "beh_assessments",
             "psychometric": "psy_assessments"}[kind]
    field = "title" if kind != "psychometric" else "assessment_name"
    exists = _row(f"SELECT id FROM {table} WHERE id=:id", {"id": assessment_id})
    if not exists:
        raise ApiError("Assessment not found.", 404)
    data = request.get_json(silent=True) or {}
    published = data.get("published")
    if not isinstance(published, bool):
        raise ApiError("published must be true or false.")
    if published:
        questions = _row(
            {"technical": "SELECT COUNT(*) AS count FROM tech_questions WHERE assessment_id=:id AND is_active=1",
             "behavioural": "SELECT COUNT(*) AS count FROM beh_questions WHERE assessment_id=:id AND is_active=1",
             "psychometric": "SELECT COUNT(*) AS count FROM psy_questions WHERE assessment_id=:id AND is_active=1"}[kind],
            {"id": assessment_id},
        )
        if not questions or not questions["count"]:
            raise ApiError("Add at least one active question before publishing.")
    db.session.execute(
        text(f"UPDATE {table} SET is_published=:published WHERE id=:id"),
        {"published": int(published), "id": assessment_id},
    )
    db.session.commit()
    return jsonify(kind=kind, id=assessment_id, published=published)
