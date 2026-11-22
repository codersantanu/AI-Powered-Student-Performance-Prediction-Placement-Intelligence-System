use Student_Performance_Prediction;
CREATE TABLE school_academic_records (

    school_record_id INT AUTO_INCREMENT PRIMARY KEY,

    student_profile_id INT NOT NULL,

    exam_type ENUM('CLASS_10', 'CLASS_12') NOT NULL,

    board_name VARCHAR(120),

    school_name VARCHAR(180),

    passing_year YEAR,

    percentage DECIMAL(5,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_profile_id)
        REFERENCES student_profiles(profile_id),

    UNIQUE (student_profile_id, exam_type),

    CHECK (
        percentage IS NULL OR
        percentage BETWEEN 0 AND 100
    )

);

CREATE TABLE college_academic_records (

    college_record_id INT AUTO_INCREMENT PRIMARY KEY,

    student_profile_id INT NOT NULL UNIQUE,

    college_name VARCHAR(180),

    university_name VARCHAR(180),

    course_name VARCHAR(100),

    branch_name VARCHAR(100),

    admission_year YEAR,

    current_semester TINYINT DEFAULT 1,

    sgpa_sem1 DECIMAL(4,2),
    sgpa_sem2 DECIMAL(4,2),
    sgpa_sem3 DECIMAL(4,2),
    sgpa_sem4 DECIMAL(4,2),
    sgpa_sem5 DECIMAL(4,2),
    sgpa_sem6 DECIMAL(4,2),
    sgpa_sem7 DECIMAL(4,2),
    sgpa_sem8 DECIMAL(4,2),

    cgpa DECIMAL(4,2),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_profile_id)
        REFERENCES student_profiles(profile_id),

    CHECK (current_semester BETWEEN 1 AND 8),

    CHECK (sgpa_sem1 IS NULL OR sgpa_sem1 BETWEEN 0 AND 10),
    CHECK (sgpa_sem2 IS NULL OR sgpa_sem2 BETWEEN 0 AND 10),
    CHECK (sgpa_sem3 IS NULL OR sgpa_sem3 BETWEEN 0 AND 10),
    CHECK (sgpa_sem4 IS NULL OR sgpa_sem4 BETWEEN 0 AND 10),
    CHECK (sgpa_sem5 IS NULL OR sgpa_sem5 BETWEEN 0 AND 10),
    CHECK (sgpa_sem6 IS NULL OR sgpa_sem6 BETWEEN 0 AND 10),
    CHECK (sgpa_sem7 IS NULL OR sgpa_sem7 BETWEEN 0 AND 10),
    CHECK (sgpa_sem8 IS NULL OR sgpa_sem8 BETWEEN 0 AND 10),

    CHECK (cgpa IS NULL OR cgpa BETWEEN 0 AND 10)

);