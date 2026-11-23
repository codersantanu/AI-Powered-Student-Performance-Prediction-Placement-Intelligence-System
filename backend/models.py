from datetime import datetime, timezone
from werkzeug.security import check_password_hash, generate_password_hash
from .extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)


class User(TimestampMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(254), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(512), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student')
    active = db.Column(db.Boolean, nullable=False, default=True)
    profile = db.relationship('StudentProfile', back_populates='user', uselist=False, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='scrypt')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def public(self):
        return {'id': self.id, 'name': self.name, 'email': self.email, 'role': self.role}


class StudentProfile(db.Model):
    __tablename__ = 'student_profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)
    student_id = db.Column(db.String(40), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(254), nullable=False)
    phone = db.Column(db.String(30), nullable=False, default='')
    address = db.Column(db.String(500), nullable=False, default='')
    date_of_birth = db.Column(db.String(10), nullable=True)
    college = db.Column(db.String(200), nullable=False, default='')
    department = db.Column(db.String(120), nullable=False, default='')
    degree = db.Column(db.String(120), nullable=False, default='')
    specialization = db.Column(db.String(160), nullable=False, default='')
    admission_year = db.Column(db.Integer, nullable=True)
    academic_year = db.Column(db.String(30), nullable=False, default='2025–2026')
    current_semester = db.Column(db.Integer, nullable=False, default=1)
    expected_graduation_year = db.Column(db.Integer, nullable=True)
    skills = db.Column(db.JSON, nullable=False, default=list)
    career_interests = db.Column(db.JSON, nullable=False, default=list)
    preferred_roles = db.Column(db.JSON, nullable=False, default=list)
    short_term_goal = db.Column(db.String(1000), nullable=False, default='')
    long_term_goal = db.Column(db.String(1000), nullable=False, default='')
    preferred_technologies = db.Column(db.JSON, nullable=False, default=list)
    photo_filename = db.Column(db.String(80), nullable=True)
    user = db.relationship('User', back_populates='profile')

    def public(self):
        skill_entry = db.session.query(SkillEntry.id).filter(
            SkillEntry.student_id == self.user_id,
            SkillEntry.category.in_(('programming', 'technical')),
        ).first()
        has_skills = bool(self.skills or skill_entry)
        fields = [
            ('Full name', self.name),
            ('Date of birth', self.date_of_birth),
            ('Phone number', self.phone),
            ('Address', self.address),
            ('College or university', self.college),
            ('Department', self.department),
            ('Degree or course', self.degree),
            ('Specialization', self.specialization),
            ('Admission year', self.admission_year),
            ('Current academic year', self.academic_year),
            ('Current semester', self.current_semester),
            ('Expected graduation year', self.expected_graduation_year),
            ('Skills', has_skills),
            ('Career interests', self.career_interests),
            ('Preferred roles', self.preferred_roles),
        ]
        missing = [label for label, value in fields if not value]
        completed = len(fields) - len(missing)
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'studentId': self.student_id,
            'college': self.college,
            'department': self.department,
            'degree': self.degree,
            'specialization': self.specialization,
            'phone': self.phone,
            'address': self.address,
            'dateOfBirth': self.date_of_birth or '',
            'admissionYear': self.admission_year,
            'academicYear': self.academic_year,
            'currentSemester': self.current_semester,
            'expectedGraduationYear': self.expected_graduation_year,
            'skills': self.skills,
            'careerInterests': self.career_interests,
            'preferredRoles': self.preferred_roles,
            'shortTermGoal': self.short_term_goal,
            'longTermGoal': self.long_term_goal,
            'preferredTechnologies': self.preferred_technologies,
            'photoAvailable': bool(self.photo_filename),
            'accountStatus': 'Active' if self.user.active else 'Inactive',
            'completion': round(completed / len(fields) * 100),
            'missingInformation': missing,
        }


class AcademicRecord(TimestampMixin, db.Model):
    __tablename__ = 'academic_records'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    semester = db.Column(db.Integer, nullable=False)
    academic_year = db.Column(db.String(30), nullable=False)
    sgpa = db.Column(db.Float, nullable=True)
    attendance = db.Column(db.Float, nullable=True)
    classes_attended = db.Column(db.Integer, nullable=True)
    total_classes = db.Column(db.Integer, nullable=True)
    active_backlogs = db.Column(db.Integer, nullable=False, default=0)
    cleared_backlogs = db.Column(db.Integer, nullable=False, default=0)
    class10 = db.Column(db.Float, nullable=True)
    class12 = db.Column(db.Float, nullable=True)
    subjects = db.Column(db.JSON, nullable=False, default=list)
    __table_args__ = (db.UniqueConstraint('student_id', 'semester', 'academic_year', name='unique_student_semester_year'),)


class StudySession(TimestampMixin, db.Model):
    __tablename__ = 'study_sessions'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    subject = db.Column(db.String(120), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    duration = db.Column(db.Float, nullable=False)
    notes = db.Column(db.String(1000), nullable=False, default='')


class SkillEntry(TimestampMixin, db.Model):
    __tablename__ = 'skill_entries'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    category = db.Column(db.String(30), nullable=False)
    title = db.Column(db.String(160), nullable=False)
    organization = db.Column(db.String(160), nullable=False, default='')
    description = db.Column(db.String(2000), nullable=False, default='')
    level = db.Column(db.String(30), nullable=False, default='Beginner')
    start_date = db.Column(db.String(10), nullable=True)
    end_date = db.Column(db.String(10), nullable=True)
    url = db.Column(db.String(1000), nullable=False, default='')
    secondary_url = db.Column(db.String(1000), nullable=False, default='')
    project_category = db.Column(db.String(80), nullable=False, default='')
    technologies = db.Column(db.JSON, nullable=False, default=list)


class StudyGoal(TimestampMixin, db.Model):
    __tablename__ = 'study_goals'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(160), nullable=False)
    target = db.Column(db.Integer, nullable=False)
    completed = db.Column(db.Integer, nullable=False, default=0)
    period = db.Column(db.String(20), nullable=False, default='weekly')


class Question(TimestampMixin, db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(2000), nullable=False)
    options = db.Column(db.JSON, nullable=False)
    correct_index = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(100), nullable=False, index=True)
    difficulty = db.Column(db.String(20), nullable=False)
    explanation = db.Column(db.String(2000), nullable=False, default='')


class Assessment(TimestampMixin, db.Model):
    __tablename__ = 'assessments'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    difficulty = db.Column(db.String(20), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    due_at = db.Column(db.DateTime(timezone=True), nullable=True)


class AssessmentAttempt(TimestampMixin, db.Model):
    __tablename__ = 'assessment_attempts'
    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.ForeignKey('assessments.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    assessment = db.relationship('Assessment')
    question_ids = db.Column(db.JSON, nullable=False)
    answers = db.Column(db.JSON, nullable=True)
    result = db.Column(db.JSON, nullable=True)
    submitted_at = db.Column(db.DateTime(timezone=True), nullable=True)


class Prediction(TimestampMixin, db.Model):
    __tablename__ = 'predictions'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    target = db.Column(db.String(100), nullable=False)
    outcome = db.Column(db.String(30), nullable=False)
    inputs = db.Column(db.JSON, nullable=False)
    result = db.Column(db.JSON, nullable=False)
    model_version = db.Column(db.String(100), nullable=False)


class Report(TimestampMixin, db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    key = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(160), nullable=False)
    semester = db.Column(db.Integer, nullable=True)
    data = db.Column(db.JSON, nullable=False)


class RevokedToken(db.Model):
    __tablename__ = 'revoked_tokens'
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(64), unique=True, nullable=False, index=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
