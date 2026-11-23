from sqlalchemy import select
from .models import AcademicRecord, AssessmentAttempt, StudySession


def recommendations_for(student_id):
    """Persistently stored records drive supportive, explainable next steps."""
    # Only this student's stored academic records are used.
    from .extensions import db
    records = list(db.session.scalars(select(AcademicRecord).filter_by(student_id=student_id).order_by(AcademicRecord.id)).all())
    recommendations = []
    if records:
        latest = records[-1]
        for subject in latest.subjects:
            total, obtained = subject.get('totalMarks'), subject.get('obtainedMarks')
            if total and obtained is not None and obtained / total < .6:
                weak_topics = [topic for topic in subject.get('topics', []) if isinstance(topic.get('score'), (int, float)) and topic['score'] < 60]
                recommendations.append({'id': f'subject-{subject["name"]}', 'category': 'Academic Improvement', 'title': f"Build your understanding of {subject['name']}", 'description': f"Your available result is {obtained} out of {total}. Review foundational concepts and discuss a manageable revision plan with your mentor.", 'priority': 'high', 'action': ', '.join(topic['name'] for topic in weak_topics)[:500] or 'Practice a few worked examples and review the questions you found challenging.'})
        if latest.attendance is not None and latest.attendance < 75:
            recommendations.append({'id': 'attendance', 'category': 'Study Behaviour', 'title': 'Make a plan for attending classes', 'description': f"Your available attendance record is {latest.attendance}%. Discuss any barriers with your mentor and make a realistic plan.", 'priority': 'high', 'action': 'Review your timetable and identify the changes that would make attendance more manageable.'})
    sessions = list(db.session.scalars(select(StudySession).filter_by(student_id=student_id)).all())
    if sessions:
        recommendations.append({'id': 'study-routine', 'category': 'Study Behaviour', 'title': 'Build a sustainable study routine', 'description': 'You have recorded study sessions. Compare your routine with your goals and plan focused, manageable sessions.', 'priority': 'medium', 'action': 'Choose a few regular study times, log your sessions, and review your progress weekly.'})
    attempts = db.session.scalars(select(AssessmentAttempt).filter(AssessmentAttempt.student_id == student_id, AssessmentAttempt.submitted_at.isnot(None))).all()
    if attempts:
        recommendations.append({'id': 'assessment-review', 'category': 'Assessment Preparation', 'title': 'Turn assessment feedback into next steps', 'description': 'You have completed assessments. Reviewing your explanations can help identify topics to revisit.', 'priority': 'medium', 'action': 'Review your incorrect answers, write down the reasoning, and try a similar practice question.'})
    recommendations.extend([
        {'id': 'technical-practice', 'category': 'Technical Skills', 'title': 'Apply your skills to a small project', 'description': 'A small, well-documented project can connect your technical learning to a practical problem.', 'priority': 'low', 'action': 'Choose one skill you want to practice and build a small project around it.', 'resourceUrl': 'https://docs.python.org/3/tutorial/'},
        {'id': 'learning-resources', 'category': 'Career Skill Development', 'title': 'Explore a focused learning resource', 'description': 'Use reliable documentation to strengthen the concepts you are currently studying.', 'priority': 'low', 'action': 'Pick one topic, read its documentation, and practice a small example.', 'resourceUrl': 'https://www.khanacademy.org/computing'},
    ])
    return recommendations
