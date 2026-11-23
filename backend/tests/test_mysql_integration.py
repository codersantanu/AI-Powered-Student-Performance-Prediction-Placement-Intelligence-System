import os
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import inspect, make_url, text

from backend import create_app
from backend.extensions import db


TEST_JWT_SECRET = "mysql-integration-only-secret-key-0123456789"


@pytest.fixture(scope="module")
def mysql_app():
    database_url = os.getenv("STUDENTIQ_MYSQL_TEST_URL")
    if not database_url:
        pytest.skip("Set STUDENTIQ_MYSQL_TEST_URL to an isolated MySQL test database.")

    database_name = make_url(database_url).database or ""
    if not database_name.endswith("_test"):
        raise RuntimeError("The MySQL integration URL must target a database ending in _test.")

    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": database_url,
        "JWT_SECRET_KEY": TEST_JWT_SECRET,
    })
    with app.app_context():
        required_tables = {
            "users",
            "student_profiles",
            "alembic_version",
            "tech_assessments",
            "tech_question_answers",
            "beh_assessments",
            "beh_option_dimension_scores",
            "psy_assessments",
            "psy_option_dimension_scores",
        }
        missing = required_tables - set(inspect(db.engine).get_table_names())
        assert not missing, f"MySQL test schema is missing tables: {sorted(missing)}"

    yield app

    with app.app_context():
        db.session.remove()
        db.engine.dispose()


def _auth(client, email, password="IntegrationPassword123!"):
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.get_json()
    return {"Authorization": f"Bearer {response.get_json()['access_token']}"}


def _submit_reflection(client, headers, kind, assessment_id):
    started = client.post(
        f"/api/special-assessments/{kind}/start",
        headers=headers,
        json={"assessmentId": assessment_id},
    )
    assert started.status_code == 201, started.get_json()
    attempt = started.get_json()
    assert attempt["questions"]
    for question in attempt["questions"]:
        assert not {"correctAnswer", "correctIndex", "explanation"} & question.keys()
        assert all(isinstance(option, str) for option in question["options"])

    submitted = client.post(
        f"/api/special-assessments/{kind}/submit",
        headers=headers,
        json={"attemptId": attempt["id"], "answers": [0] * len(attempt["questions"])},
    )
    assert submitted.status_code == 200, submitted.get_json()
    result = submitted.get_json()
    assert result["total"] == len(attempt["questions"])
    assert result["dimensions"]
    assert all(item["correct"] is None for item in result["review"])
    assert all(
        not {"correctAnswer", "explanation"} & item.keys()
        for item in result["review"]
    )
    return result


def test_mysql_auth_assessment_persistence_privacy_and_isolation(mysql_app, monkeypatch):
    from backend.models import StudentProfile, User

    client = mysql_app.test_client()
    suffix = uuid.uuid4().hex
    student_email = f"mysql-student-{suffix}@example.test"
    other_email = f"mysql-other-{suffix}@example.test"
    admin_email = f"mysql-admin-{suffix}@example.test"
    password = "IntegrationPassword123!"
    question_category = f"MySQL-{suffix[:12]}"

    assert client.get("/api/special-assessments/technical").status_code == 401
    assert client.post(
        "/api/auth/register",
        json={"name": "MySQL Integration Student", "email": student_email, "password": password},
    ).status_code == 201
    assert client.post(
        "/api/auth/register",
        json={"name": "MySQL Integration Other", "email": other_email, "password": password},
    ).status_code == 201
    assert client.post(
        "/api/auth/register",
        json={"name": "Duplicate Student", "email": student_email, "password": password},
    ).status_code == 409
    assert client.post(
        "/api/auth/login",
        json={"email": student_email, "password": "IncorrectPassword123!"},
    ).status_code == 401

    with mysql_app.app_context():
        admin = User(name="MySQL Integration Admin", email=admin_email, role="admin")
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
        student = db.session.scalar(db.select(User).filter_by(email=student_email))
        profile_id = student.profile.id
        student_id = student.id

    student_headers = _auth(client, student_email, password)
    other_headers = _auth(client, other_email, password)
    admin_headers = _auth(client, admin_email, password)

    profile = client.get("/api/student/profile", headers=student_headers)
    assert profile.status_code == 200
    assert "password_hash" not in profile.get_json()
    updated_profile = client.put(
        "/api/student/profile",
        headers=student_headers,
        json={"phone": "1234567890", "skills": ["Python", "SQL"]},
    )
    assert updated_profile.status_code == 200
    assert updated_profile.get_json()["skills"] == ["Python", "SQL"]

    today = datetime.now(timezone.utc).date().isoformat()
    study_session = client.post(
        "/api/student/study-sessions",
        headers=student_headers,
        json={"subject": "MySQL integration", "date": today, "duration": 1.5, "notes": "Test persistence"},
    )
    assert study_session.status_code == 201
    study_session_id = study_session.get_json()["id"]
    assert client.get(
        "/api/student/study-sessions", headers=other_headers
    ).get_json() == []
    assert client.put(
        f"/api/student/study-sessions/{study_session_id}",
        headers=student_headers,
        json={"subject": "Updated MySQL integration", "date": today, "duration": 1, "notes": "Updated"},
    ).status_code == 200

    skill = client.post(
        "/api/student/skills",
        headers=student_headers,
        json={
            "category": "technical",
            "title": "MySQL integration test",
            "organization": "StudentIQ",
            "description": "A test-only portfolio entry.",
            "level": "Intermediate",
            "technologies": ["Python", "MySQL"],
        },
    )
    assert skill.status_code == 201
    skill_id = skill.get_json()["id"]
    assert client.get("/api/student/skills", headers=student_headers).get_json()
    assert client.get("/api/student/skills", headers=other_headers).get_json() == []

    goal = client.post(
        "/api/student/goals",
        headers=student_headers,
        json={"title": "MySQL integration goal", "target": 5, "period": "weekly"},
    )
    assert goal.status_code == 201
    goal_id = goal.get_json()["id"]
    assert client.put(
        f"/api/student/goals/{goal_id}",
        headers=student_headers,
        json={"completed": 2},
    ).get_json()["completed"] == 2
    assert client.get("/api/student/dashboard", headers=student_headers).status_code == 200

    assert client.get(
        "/api/admin/special-assessments", headers=student_headers
    ).status_code == 403
    assert client.get(
        "/api/admin/special-assessments", headers=admin_headers
    ).status_code == 200
    assert client.get("/api/admin/students", headers=admin_headers).status_code == 200
    assert client.get("/api/admin/students", headers=student_headers).status_code == 403

    academic_record = client.post(
        "/api/admin/academic-records",
        headers=admin_headers,
        json={
            "studentId": student_id,
            "semester": 2,
            "academicYear": "2025-2026",
            "sgpa": 8.25,
            "attendance": 90,
            "classesAttended": 45,
            "totalClasses": 50,
            "activeBacklogs": 0,
            "clearedBacklogs": 1,
            "class10": 88,
            "class12": 91,
            "subjects": [],
        },
    )
    assert academic_record.status_code == 201, academic_record.get_json()
    student_records = client.get(
        "/api/student/academic-records", headers=student_headers
    )
    assert student_records.status_code == 200
    assert student_records.get_json()[0]["classesAttended"] == 45
    assert client.get(
        "/api/student/academic-records", headers=other_headers
    ).get_json() == []
    assert client.get(
        "/api/student/reports/semester", headers=student_headers
    ).get_json()["data"]["semesters"][0]["academicYear"] == "2025-2026"
    assert client.get(
        "/api/student/reports/attendance", headers=student_headers
    ).get_json()["data"]["records"][0]["classesAttended"] == 45
    academic_pdf = client.get(
        "/api/student/reports/academic/download", headers=student_headers
    )
    assert academic_pdf.status_code == 200
    assert academic_pdf.mimetype == "application/pdf"
    assert client.get(
        "/api/student/reports/history", headers=student_headers
    ).get_json()
    admin_pdf = client.get("/api/admin/reports/download", headers=admin_headers)
    assert admin_pdf.status_code == 200
    assert admin_pdf.mimetype == "application/pdf"

    created_question = client.post(
        "/api/admin/questions",
        headers=admin_headers,
        json={
            "text": "Which option is correct?",
            "options": ["A", "B", "C", "D"],
            "correctIndex": 2,
            "category": question_category,
            "difficulty": "Basic",
            "explanation": "Administrative-only explanation.",
        },
    )
    assert created_question.status_code == 201, created_question.get_json()
    created_assessment = client.post(
        "/api/admin/assessments",
        headers=admin_headers,
        json={
            "title": f"MySQL integration {suffix}",
            "category": question_category,
            "difficulty": "Basic",
            "durationMinutes": 10,
        },
    )
    assert created_assessment.status_code == 201, created_assessment.get_json()
    generic_start = client.post(
        "/api/assessments/start",
        headers=student_headers,
        json={"assessmentId": created_assessment.get_json()["id"]},
    )
    assert generic_start.status_code == 201, generic_start.get_json()
    generic_question = generic_start.get_json()["questions"][0]
    assert "correctIndex" not in generic_question
    assert "explanation" not in generic_question
    generic_result = client.post(
        "/api/assessments/submit",
        headers=student_headers,
        json={"attemptId": generic_start.get_json()["id"], "answers": [2]},
    )
    assert generic_result.status_code == 200
    assert generic_result.get_json()["score"] == 100
    assert generic_result.get_json()["review"][0]["correct"] is None
    assert "correctAnswer" not in generic_result.get_json()["review"][0]
    assert "explanation" not in generic_result.get_json()["review"][0]

    monkeypatch.setenv("MODEL_PATH", "/tmp/studentiq-missing-test-model.joblib")
    import backend.ml
    monkeypatch.setattr(backend.ml, "_model", None)
    monkeypatch.setattr(backend.ml, "_mtime", None)
    assert client.get("/api/predictions/model-metrics").get_json()["available"] is False
    prediction = client.post(
        "/api/predictions/generate",
        headers=student_headers,
        json={
            "target": "next_semester",
            "inputs": {
                "previousMarks": 80,
                "currentMarks": 80,
                "sgpa": 8,
                "cgpa": 8,
                "attendance": 90,
                "studyHours": 3,
                "backlogs": 0,
                "assessmentScore": 80,
            },
        },
    )
    assert prediction.status_code == 503
    assert client.get(
        "/api/predictions/history", headers=student_headers
    ).get_json() == []

    assert client.delete(
        f"/api/student/study-sessions/{study_session_id}",
        headers=student_headers,
    ).status_code == 200
    assert client.delete(
        f"/api/student/skills/{skill_id}", headers=student_headers
    ).status_code == 200
    assert client.delete(
        f"/api/student/goals/{goal_id}", headers=student_headers
    ).status_code == 200

    for kind in ("technical", "behavioural"):
        response = client.put(
            f"/api/admin/special-assessments/{kind}/1/publish",
            headers=admin_headers,
            json={"published": True},
        )
        assert response.status_code == 200, response.get_json()

    psychometric_publish = client.put(
        "/api/admin/special-assessments/psychometric/1/publish",
        headers=admin_headers,
        json={"published": True},
    )
    if psychometric_publish.status_code == 409:
        assert "every psychometric dimension" in psychometric_publish.get_json()["message"]
        assert client.get(
            "/api/special-assessments/psychometric", headers=student_headers
        ).get_json() == []
    else:
        assert psychometric_publish.status_code == 200, psychometric_publish.get_json()
        psychometric_result = _submit_reflection(
            client, student_headers, "psychometric", 1
        )
        assert len(psychometric_result["dimensions"]) == 5

    technical_start = client.post(
        "/api/special-assessments/technical/start",
        headers=student_headers,
        json={"assessmentId": 1},
    )
    assert technical_start.status_code == 201, technical_start.get_json()
    attempt = technical_start.get_json()
    assert len(attempt["questions"]) == 20
    for question in attempt["questions"]:
        assert not {"correctAnswer", "correctIndex", "explanation"} & question.keys()
        assert all(isinstance(option, str) for option in question["options"])

    with mysql_app.app_context():
        question_rows = db.session.execute(text(
            "SELECT q.id, a.correct_option_id FROM tech_questions q "
            "JOIN tech_question_answers a ON a.question_id=q.id "
            "WHERE q.assessment_id=1 AND q.is_active=1 ORDER BY q.display_order, q.id"
        )).mappings().all()
        answers = []
        for row in question_rows:
            option_ids = db.session.execute(text(
                "SELECT id FROM tech_question_options "
                "WHERE question_id=:question_id ORDER BY display_order, id"
            ), {"question_id": row["id"]}).scalars().all()
            answers.append(option_ids.index(row["correct_option_id"]))
    assert len(answers) == len(attempt["questions"])
    wrong_index = (answers[0] + 1) % len(attempt["questions"][0]["options"])
    answers[0] = wrong_index

    invalid_answers = list(answers)
    invalid_answers[1] = len(attempt["questions"][1]["options"])
    invalid = client.post(
        "/api/special-assessments/technical/submit",
        headers=student_headers,
        json={"attemptId": attempt["id"], "answers": invalid_answers},
    )
    assert invalid.status_code == 400

    submitted = client.post(
        "/api/special-assessments/technical/submit",
        headers=student_headers,
        json={"attemptId": attempt["id"], "answers": answers},
    )
    assert submitted.status_code == 200, submitted.get_json()
    technical_result = submitted.get_json()
    assert technical_result["wrong"] == 1
    assert technical_result["correct"] == 19
    assert technical_result["scoreObtained"] == 18.75
    assert technical_result["score"] == 93.75
    assert all(item["correct"] is None for item in technical_result["review"])
    assert all(
        not {"correctAnswer", "explanation"} & item.keys()
        for item in technical_result["review"]
    )

    behavioural_result = _submit_reflection(
        client, student_headers, "behavioural", 1
    )
    assert len(behavioural_result["dimensions"]) == 8
    assert client.get(
        "/api/special-assessments/technical/results", headers=other_headers
    ).get_json() == []
    assert client.post(
        "/api/special-assessments/technical/submit",
        headers=other_headers,
        json={"attemptId": attempt["id"], "answers": answers},
    ).status_code == 404

    admin_results = client.get(
        f"/api/admin/special-assessments/technical/{profile_id}/results",
        headers=admin_headers,
    )
    assert admin_results.status_code == 200
    assert len(admin_results.get_json()) == 1
    assert not {
        "correctAnswer",
        "explanation",
    } & admin_results.get_json()[0]["review"][0].keys()
    assert client.get(
        f"/api/admin/special-assessments/technical/{profile_id}/results",
        headers=student_headers,
    ).status_code == 403

    with mysql_app.app_context():
        assert db.session.scalar(text(
            "SELECT COUNT(*) FROM tech_assessment_results WHERE attempt_id=:id"
        ), {"id": attempt["id"]}) == 1
        assert db.session.scalar(text(
            "SELECT COUNT(*) FROM beh_assessment_results WHERE attempt_id=:id"
        ), {"id": behavioural_result["id"]}) == 1
        assert db.session.get(User, student_id).profile.id == profile_id
        assert db.session.scalar(db.select(StudentProfile.id).filter_by(id=profile_id))

    restarted_app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": mysql_app.config["SQLALCHEMY_DATABASE_URI"],
        "JWT_SECRET_KEY": TEST_JWT_SECRET,
    })
    restarted_client = restarted_app.test_client()
    restarted_headers = _auth(restarted_client, student_email, password)
    persisted = restarted_client.get(
        "/api/special-assessments/technical/results",
        headers=restarted_headers,
    )
    assert persisted.status_code == 200
    assert len(persisted.get_json()) == 1
    assert persisted.get_json()[0]["score"] == 93.75
    with restarted_app.app_context():
        db.session.remove()
        db.engine.dispose()

    for kind in ("technical", "behavioural"):
        response = client.put(
            f"/api/admin/special-assessments/{kind}/1/publish",
            headers=admin_headers,
            json={"published": False},
        )
        assert response.status_code == 200
        assert client.get(
            f"/api/special-assessments/{kind}", headers=student_headers
        ).get_json() == []
