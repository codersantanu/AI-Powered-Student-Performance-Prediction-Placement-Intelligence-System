from collections import defaultdict
from .models import Assessment, Question


PRIVATE_REVIEW_FIELDS = {
    'correctAnswer',
    'correctIndex',
    'correctOption',
    'correctOptionId',
    'correct_option',
    'correct_option_id',
    'correct_index',
    'answerKey',
    'explanation',
    'correct',
    'is_correct',
}


def result_data_public(result):
    data = dict(result or {})
    review = data.get('review')
    if isinstance(review, list):
        data['review'] = []
        for item in review:
            if not isinstance(item, dict):
                data['review'].append(item)
                continue
            safe_item = {
                key: value for key, value in item.items()
                if key not in PRIVATE_REVIEW_FIELDS
            }
            safe_item['correct'] = None
            data['review'].append(safe_item)
    return data


def result_public(attempt):
    result = result_data_public(attempt.result)
    assessment = attempt.assessment
    return {'id': attempt.id, 'assessmentId': attempt.assessment_id, 'title': assessment.title, 'category': assessment.category, 'date': attempt.submitted_at.isoformat() if attempt.submitted_at else None, **result}


def score_attempt(attempt, questions):
    answers = attempt.answers
    psychometric = questions[0].category == 'Psychometric' if questions else False
    correct = 0
    category_results = defaultdict(lambda: {'correct': 0, 'total': 0, 'responses': 0})
    review = []
    for question, answer in zip(questions, answers):
        is_correct = answer == question.correct_index
        correct += int(is_correct)
        category = category_results[question.category]
        category['total'] += 1
        category['correct'] += int(is_correct)
        category['responses'] += int(answer == 0)
        review.append({'question': question.text, 'selected': question.options[answer] if answer is not None else 'Not answered', 'correct': None})
    categories = [{'name': name, 'score': round(values['responses'] / values['total'] * 100) if psychometric else round(values['correct'] / values['total'] * 100)} for name, values in category_results.items()]
    return {'score': None if psychometric else round(correct / len(questions) * 100), 'correct': correct, 'total': len(questions), 'categories': categories, 'review': review, 'note': 'Self-assessment reflection only; not a clinical or diagnostic test.' if psychometric else 'Scored using the official question bank.'}
