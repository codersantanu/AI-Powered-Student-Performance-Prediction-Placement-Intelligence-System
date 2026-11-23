import pytest
from sqlalchemy import inspect
from backend import create_app
from backend.extensions import db


def test_app_factory_does_not_create_database_schema():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite://',
        'JWT_SECRET_KEY': 'test-only-secret-key-with-more-than-32-characters',
    })
    with app.app_context():
        assert inspect(db.engine).get_table_names() == []


@pytest.fixture()
def app():
    app = create_app({'TESTING': True, 'SQLALCHEMY_DATABASE_URI': 'sqlite://', 'JWT_SECRET_KEY': 'test-only-secret-key-with-more-than-32-characters'})
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def register(client, email='student@example.com'):
    return client.post('/api/auth/register', json={'name': 'Test Student', 'email': email, 'password': 'SecurePassword123!'})


def login(client, email='student@example.com', password='SecurePassword123!'):
    return client.post('/api/auth/login', json={'email': email, 'password': password})


def auth_header(response):
    return {'Authorization': f"Bearer {response.get_json()['access_token']}"}


def make_admin(app):
    from backend.models import User
    user = User(name='Administrator', email='admin@example.com', role='admin')
    user.set_password('AdminPassword123!')
    db.session.add(user)
    db.session.commit()
    return user.id


def test_registration_login_and_session(client):
    assert register(client).status_code == 201
    response = login(client)
    assert response.status_code == 200
    assert response.get_json()['user']['role'] == 'student'
    headers = auth_header(response)
    assert client.get('/api/auth/me', headers=headers).get_json()['user']['email'] == 'student@example.com'
    assert client.get('/api/auth/session', headers=headers).status_code == 200
    assert client.post('/api/auth/logout', headers=headers).status_code == 200
    assert client.get('/api/auth/me', headers=headers).status_code == 401


def test_duplicate_registration(client):
    assert register(client).status_code == 201
    assert register(client).status_code == 409


def test_protected_routes(client):
    assert client.get('/api/student/dashboard').status_code == 401
    register(client)
    response = login(client)
    headers = auth_header(response)
    assert client.get('/api/student/dashboard', headers=headers).status_code == 200
    assert client.get('/api/admin/students', headers=headers).status_code == 403


def test_role_from_database_not_client(client, app):
    response = register(client)
    user_id = response.get_json()['user']['id']
    headers = auth_header(login(client))
    from backend.models import User
    user = db.session.get(User, user_id)
    user.role = 'admin'
    db.session.commit()
    assert client.get('/api/admin/students', headers=headers).status_code == 200
    assert client.get('/api/admin/dashboard', headers=headers).status_code == 200


def test_profile_read_and_update(client):
    register(client)
    headers = auth_header(login(client))
    response = client.put('/api/student/profile', headers=headers, json={'name': 'Updated Student', 'phone': '1234567890', 'address': 'Address', 'skills': ['Python', 'SQL'], 'careerInterests': ['Data Science'], 'preferredRoles': ['Engineer']})
    assert response.status_code == 200
    assert response.get_json()['name'] == 'Updated Student'
    assert 'password_hash' not in response.get_json()


def test_study_session_crud_and_ownership(client, app):
    register(client)
    headers = auth_header(login(client))
    response = client.post('/api/student/study-sessions', headers=headers, json={'subject': 'Python', 'date': '2026-01-01', 'duration': 2.5, 'notes': 'Practice'})
    assert response.status_code == 201
    session_id = response.get_json()['id']
    assert client.put(f'/api/student/study-sessions/{session_id}', headers=headers, json={'subject': 'SQL', 'date': '2026-01-02', 'duration': 1.5, 'notes': 'Queries'}).status_code == 200
    register(client, 'other@example.com')
    other_headers = auth_header(login(client, 'other@example.com'))
    assert client.get('/api/student/study-sessions', headers=other_headers).get_json() == []
    assert client.delete(f'/api/student/study-sessions/{session_id}', headers=other_headers).status_code == 404
    assert client.delete(f'/api/student/study-sessions/{session_id}', headers=headers).status_code == 200


def test_technical_assessment_server_scoring(client, app):
    register(client)
    headers = auth_header(login(client))
    from backend.models import Assessment, Question
    question = Question(text='2 + 3 * 4 = ?', options=['20', '14', '24', '9'], correct_index=1, category='Python', difficulty='Basic', explanation='Multiply before adding.')
    db.session.add(question)
    db.session.commit()
    make_admin(app)
    admin_headers = auth_header(login(client, 'admin@example.com', 'AdminPassword123!'))
    published = client.post('/api/admin/assessments', headers=admin_headers, json={'title': 'Python check', 'category': 'Python', 'difficulty': 'Basic', 'durationMinutes': 10})
    assert published.status_code == 201
    assessment = db.session.get(Assessment, published.get_json()['id'])
    assessment.question_ids = [question.id]
    db.session.commit()
    started = client.post('/api/assessments/start', headers=headers, json={'assessmentId': assessment.id})
    assert started.status_code == 201
    body = started.get_json()
    assert 'correctIndex' not in body['questions'][0]
    assert 'explanation' not in body['questions'][0]
    result = client.post('/api/assessments/submit', headers=headers, json={'attemptId': body['id'], 'answers': [1]})
    assert result.status_code == 200
    assert result.get_json()['score'] == 100
    assert result.get_json()['correct'] == 1


def test_prediction_unavailable_without_model(client, monkeypatch):
    monkeypatch.setenv('MODEL_PATH', 'does-not-exist.joblib')
    import backend.ml
    backend.ml._model = None
    register(client)
    headers = auth_header(login(client))
    response = client.post('/api/predictions/generate', headers=headers, json={'target': 'next_semester', 'inputs': {'previousMarks': 80, 'currentMarks': 80, 'sgpa': 8, 'cgpa': 8, 'attendance': 90, 'studyHours': 3, 'backlogs': 0, 'assessmentScore': 80}})
    assert response.status_code == 503
    assert 'not connected' in response.get_json()['message']
    assert client.get('/api/predictions/model-metrics').get_json()['available'] is False


def test_reports_use_real_records(client):
    register(client)
    headers = auth_header(login(client))
    response = client.get('/api/student/reports/academic', headers=headers)
    assert response.status_code == 200
    assert response.get_json()['data']['records'] == []
    assert client.get('/api/student/reports/study', headers=headers).get_json()['data'] == {'sessions': [], 'totalHours': 0}
    pdf = client.get('/api/student/reports/academic/download', headers=headers)
    assert pdf.status_code == 200
    assert pdf.mimetype == 'application/pdf'
    assert len(client.get('/api/student/reports/history', headers=headers).get_json()) == 1


def test_academic_records_use_frontend_field_names_and_populated_reports(client, app):
    student_id = register(client).get_json()['user']['id']
    student_headers = auth_header(login(client))
    make_admin(app)
    admin_headers = auth_header(login(client, 'admin@example.com', 'AdminPassword123!'))

    created = client.post(
        '/api/admin/academic-records',
        headers=admin_headers,
        json={
            'studentId': student_id,
            'semester': 2,
            'academicYear': '2025-2026',
            'sgpa': 8.25,
            'attendance': 90,
            'classesAttended': 45,
            'totalClasses': 50,
            'activeBacklogs': 0,
            'clearedBacklogs': 1,
            'class10': 88,
            'class12': 91,
            'subjects': [],
        },
    )
    assert created.status_code == 201
    assert created.get_json()['academicYear'] == '2025-2026'
    assert 'academic_year' not in created.get_json()

    student_records = client.get('/api/student/academic-records', headers=student_headers)
    assert student_records.status_code == 200
    assert student_records.get_json()[0]['classesAttended'] == 45
    assert student_records.get_json()[0]['activeBacklogs'] == 0

    report = client.get('/api/student/reports/academic', headers=student_headers)
    assert report.status_code == 200
    assert report.get_json()['data']['records'][0]['academicYear'] == '2025-2026'
    assert client.get('/api/student/reports/academic/download', headers=student_headers).mimetype == 'application/pdf'
