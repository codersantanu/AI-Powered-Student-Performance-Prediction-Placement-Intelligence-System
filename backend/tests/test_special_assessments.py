from pathlib import Path
import re

from backend.special_assessments import normalise_dimension_scores


def test_dimension_scores_use_configured_linear_scale():
    scores = [
        {"dimension_id": "COMM", "score": 4},
        {"dimension_id": "COMM", "score": 2},
        {"dimension_id": "TEAM", "score": 3},
    ]
    dimensions = [
        {"id": "COMM", "name": "Communication"},
        {"id": "TEAM", "name": "Teamwork"},
        {"id": "LEAD", "name": "Leadership"},
    ]

    result = normalise_dimension_scores(scores, dimensions, min_score=1, max_score=4, scale=100)

    assert result == [
        {"id": "COMM", "name": "Communication", "score": 50.0, "average": 3.0, "responses": 2},
        {"id": "TEAM", "name": "Teamwork", "score": 66.7, "average": 3.0, "responses": 1},
    ]


def test_dimension_scores_skip_dimensions_without_mapped_responses():
    result = normalise_dimension_scores(
        [{"dimension_id": 1, "score": 1}],
        [{"id": 1, "name": "Dimension A"}, {"id": 2, "name": "Dimension B"}],
    )
    assert len(result) == 1
    assert result[0]["score"] == 0.0


def test_mysql_imports_are_non_destructive_and_target_student_profile_id():
    root = Path(__file__).resolve().parents[2]
    paths = [
        root / "database/mysql/technical_assessment.sql",
        root / "database/mysql/behavioural_assessment.sql",
        root / "database/mysql/psychometric_assessment.sql",
    ]
    for path in paths:
        sql = path.read_text(encoding="utf-8")
        assert not re.search(r"\\bDROP\\s+TABLE\\b", sql, re.IGNORECASE), path.name
        assert "student_profiles(id)" in sql, path.name
        assert "CREATE TABLE IF NOT EXISTS" in sql, path.name
        assert "INSERT IGNORE INTO" in sql, path.name


def test_technical_import_uses_namespaced_tables():
    root = Path(__file__).resolve().parents[2]
    sql = (root / "database/mysql/technical_assessment.sql").read_text(encoding="utf-8")
    assert "CREATE TABLE IF NOT EXISTS tech_assessments" in sql
    assert "CREATE TABLE IF NOT EXISTS tech_questions" in sql
    assert "CREATE TABLE IF NOT EXISTS tech_assessment_attempts" in sql
    assert not re.search(r"CREATE TABLE IF NOT EXISTS assessments\\s*\\(", sql, re.IGNORECASE)
