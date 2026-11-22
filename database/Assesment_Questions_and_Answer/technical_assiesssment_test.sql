
-- =====================================================
-- CSE TECHNICAL ASSESSMENT SYSTEM
-- 20 MCQ QUESTIONS | NO CYBERSECURITY
-- MySQL 8.0+
-- Run once on a fresh database.
-- =====================================================

-- INTEGRATED MODULE: run this inside your existing main database.
-- Prerequisite: student_profiles(profile_id INT PRIMARY KEY) already exists.
-- Assessment IDs use BIGINT; the student profile FK uses INT to match the parent.

-- =====================================================
-- 1. ASSESSMENTS
-- =====================================================

CREATE TABLE assessments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    assessment_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    target_group VARCHAR(50) DEFAULT 'CSE',
    version_no INT DEFAULT 1,
    duration_minutes INT DEFAULT 30,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_assessment_version (assessment_code, version_no)
);

INSERT INTO assessments
(id, assessment_code, title, description, target_group,
 version_no, duration_minutes, is_published)
VALUES
(1, 'CSE-TECH-001',
 'CSE Technical Assessment - MCQ',
 'Computer Science technical knowledge assessment covering Programming, DSA, DBMS, OS, Networks and Software Engineering.',
 'CSE', 1, 30, FALSE);

-- =====================================================
-- 2. TECHNICAL CATEGORIES
-- =====================================================

CREATE TABLE technical_categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_code VARCHAR(30) UNIQUE NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO technical_categories
(id, category_code, category_name, description)
VALUES
(1, 'PROG', 'Programming Fundamentals',
 'Programming logic, Python, Java and OOP'),
(2, 'DSA', 'Data Structures and Algorithms',
 'Arrays, stacks, queues, trees and algorithms'),
(3, 'DBMS', 'Database Management Systems',
 'SQL, joins and normalization'),
(4, 'OS', 'Operating Systems',
 'Processes, threads and memory management'),
(5, 'NET', 'Computer Networks',
 'TCP/IP, DNS and network devices'),
(6, 'SE', 'Software Engineering',
 'SDLC, testing and software development');

-- =====================================================
-- 3. TECHNICAL TOPICS
-- =====================================================

CREATE TABLE technical_topics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_id BIGINT NOT NULL,
    topic_name VARCHAR(120) NOT NULL,
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (category_id)
        REFERENCES technical_categories(id),
    UNIQUE KEY uq_category_topic (category_id, topic_name)
);

INSERT INTO technical_topics
(id, category_id, topic_name)
VALUES
(1,1,'Object-Oriented Programming'),
(2,1,'Programming Logic'),
(3,1,'Python Basics'),
(4,2,'Stacks and Queues'),
(5,2,'Trees'),
(6,2,'Searching and Sorting'),
(7,3,'SQL'),
(8,3,'Normalization'),
(9,4,'Processes and Threads'),
(10,4,'Memory Management'),
(11,5,'TCP/IP'),
(12,5,'Network Addressing'),
(13,6,'Software Development Lifecycle'),
(14,6,'Software Testing');

-- =====================================================
-- 4. QUESTIONS
-- =====================================================

CREATE TABLE questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    assessment_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    topic_id BIGINT NOT NULL,
    question_code VARCHAR(30) UNIQUE NOT NULL,
    question_text TEXT NOT NULL,
    difficulty ENUM('EASY','MEDIUM','HARD')
        DEFAULT 'MEDIUM',
    question_type ENUM('SINGLE_MCQ')
        DEFAULT 'SINGLE_MCQ',
    marks DECIMAL(7,2) DEFAULT 1.00,
    negative_marks DECIMAL(7,2) DEFAULT 0.25,
    display_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (assessment_id) REFERENCES assessments(id),
    FOREIGN KEY (category_id) REFERENCES technical_categories(id),
    FOREIGN KEY (topic_id) REFERENCES technical_topics(id),

    CHECK (marks >= 0 AND negative_marks >= 0),

    INDEX idx_assessment_questions
        (assessment_id, is_active, display_order)
);

INSERT INTO questions
(id, assessment_id, category_id, topic_id,
 question_code, question_text, difficulty,
 marks, negative_marks, display_order)
VALUES

-- PROGRAMMING FUNDAMENTALS (4)

(1,1,1,1,'CSE001',
 'Which OOP concept allows the same method name to perform different behaviours?',
 'EASY',1,0.25,1),

(2,1,1,2,'CSE002',
 'What is the time complexity of accessing an element by index in an array?',
 'EASY',1,0.25,2),

(3,1,1,3,'CSE003',
 'Which Python data type is immutable?',
 'EASY',1,0.25,3),

(4,1,1,1,'CSE004',
 'Which OOP concept combines data and methods into a single unit?',
 'MEDIUM',1,0.25,4),

-- DATA STRUCTURES AND ALGORITHMS (4)

(5,1,2,4,'CSE005',
 'Which data structure follows the Last In, First Out principle?',
 'EASY',1,0.25,5),

(6,1,2,4,'CSE006',
 'Which data structure follows the First In, First Out principle?',
 'EASY',1,0.25,6),

(7,1,2,5,'CSE007',
 'In a standard Binary Search Tree, values in the left subtree are generally:',
 'MEDIUM',1,0.25,7),

(8,1,2,6,'CSE008',
 'What is the average time complexity of binary search on a sorted array?',
 'MEDIUM',1,0.25,8),

-- DBMS (3)

(9,1,3,7,'CSE009',
 'Which SQL clause filters grouped records after GROUP BY?',
 'EASY',1,0.25,9),

(10,1,3,7,'CSE010',
 'Which SQL JOIN returns only matching rows from both tables?',
 'EASY',1,0.25,10),

(11,1,3,8,'CSE011',
 'What is the primary purpose of database normalization?',
 'MEDIUM',1,0.25,11),

-- OPERATING SYSTEMS (3)

(12,1,4,9,'CSE012',
 'Which statement best describes a process?',
 'EASY',1,0.25,12),

(13,1,4,9,'CSE013',
 'Which resource is generally shared by threads of the same process?',
 'MEDIUM',1,0.25,13),

(14,1,4,10,'CSE014',
 'Which memory management technique divides memory into fixed-size pages?',
 'MEDIUM',1,0.25,14),

-- COMPUTER NETWORKS (3)

(15,1,5,11,'CSE015',
 'Which transport-layer protocol provides reliable, connection-oriented communication?',
 'EASY',1,0.25,15),

(16,1,5,12,'CSE016',
 'What is the primary purpose of DNS?',
 'EASY',1,0.25,16),

(17,1,5,11,'CSE017',
 'Which device forwards packets between different IP networks?',
 'EASY',1,0.25,17),

-- SOFTWARE ENGINEERING (3)

(18,1,6,13,'CSE018',
 'Which SDLC phase identifies and documents what a software system must do?',
 'EASY',1,0.25,18),

(19,1,6,14,'CSE019',
 'Which testing type checks individual functions or components in isolation?',
 'EASY',1,0.25,19),

(20,1,6,13,'CSE020',
 'Which software development model follows a sequential phase-by-phase approach?',
 'MEDIUM',1,0.25,20);

-- =====================================================
-- 5. QUESTION OPTIONS
-- =====================================================

CREATE TABLE question_options (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    question_id BIGINT NOT NULL,
    option_label CHAR(1) NOT NULL,
    option_text TEXT NOT NULL,
    display_order TINYINT NOT NULL,

    FOREIGN KEY (question_id)
        REFERENCES questions(id) ON DELETE CASCADE,

    UNIQUE (question_id, option_label),
    UNIQUE (question_id, display_order),
    UNIQUE (question_id, id)
);

INSERT INTO question_options
(id, question_id, option_label, option_text, display_order)
VALUES

-- Q1
(1,1,'A','Encapsulation',1),
(2,1,'B','Polymorphism',2),
(3,1,'C','Abstraction',3),
(4,1,'D','Compilation',4),

-- Q2
(5,2,'A','O(1)',1),
(6,2,'B','O(log n)',2),
(7,2,'C','O(n)',3),
(8,2,'D','O(n log n)',4),

-- Q3
(9,3,'A','List',1),
(10,3,'B','Dictionary',2),
(11,3,'C','Tuple',3),
(12,3,'D','Set',4),

-- Q4
(13,4,'A','Inheritance',1),
(14,4,'B','Encapsulation',2),
(15,4,'C','Polymorphism',3),
(16,4,'D','Recursion',4),

-- Q5
(17,5,'A','Queue',1),
(18,5,'B','Stack',2),
(19,5,'C','Graph',3),
(20,5,'D','Tree',4),

-- Q6
(21,6,'A','Stack',1),
(22,6,'B','Queue',2),
(23,6,'C','Heap',3),
(24,6,'D','Graph',4),

-- Q7
(25,7,'A','Greater than the node',1),
(26,7,'B','Equal to the node',2),
(27,7,'C','Less than the node',3),
(28,7,'D','Unrelated to the node',4),

-- Q8
(29,8,'A','O(n)',1),
(30,8,'B','O(log n)',2),
(31,8,'C','O(n log n)',3),
(32,8,'D','O(1)',4),

-- Q9
(33,9,'A','WHERE',1),
(34,9,'B','ORDER BY',2),
(35,9,'C','HAVING',3),
(36,9,'D','DISTINCT',4),

-- Q10
(37,10,'A','LEFT JOIN',1),
(38,10,'B','RIGHT JOIN',2),
(39,10,'C','CROSS JOIN',3),
(40,10,'D','INNER JOIN',4),

-- Q11
(41,11,'A','Increase data duplication',1),
(42,11,'B','Reduce redundancy and update anomalies',2),
(43,11,'C','Remove primary keys',3),
(44,11,'D','Return all rows',4),

-- Q12
(45,12,'A','A program currently being executed',1),
(46,12,'B','A file stored on disk only',2),
(47,12,'C','A single line of source code',3),
(48,12,'D','A hardware input device',4),

-- Q13
(49,13,'A','Thread registers',1),
(50,13,'B','Process address space and shared resources',2),
(51,13,'C','Private thread stack',3),
(52,13,'D','Thread execution state',4),

-- Q14
(53,14,'A','Segmentation',1),
(54,14,'B','Paging',2),
(55,14,'C','Spooling',3),
(56,14,'D','Caching',4),

-- Q15
(57,15,'A','UDP',1),
(58,15,'B','IP',2),
(59,15,'C','TCP',3),
(60,15,'D','ARP',4),

-- Q16
(61,16,'A','Convert domain names to IP addresses',1),
(62,16,'B','Encrypt files',2),
(63,16,'C','Assign MAC addresses',3),
(64,16,'D','Compress web pages',4),

-- Q17
(65,17,'A','Hub',1),
(66,17,'B','Router',2),
(67,17,'C','Repeater',3),
(68,17,'D','Bridge',4),

-- Q18
(69,18,'A','Requirements analysis',1),
(70,18,'B','Deployment',2),
(71,18,'C','Maintenance',3),
(72,18,'D','Coding',4),

-- Q19
(73,19,'A','System testing',1),
(74,19,'B','Acceptance testing',2),
(75,19,'C','Unit testing',3),
(76,19,'D','Load testing',4),

-- Q20
(77,20,'A','Agile model',1),
(78,20,'B','Waterfall model',2),
(79,20,'C','Spiral model',3),
(80,20,'D','Prototype model',4);

-- =====================================================
-- 6. CORRECT ANSWERS AND EXPLANATIONS
-- PRIVATE: BACKEND AND ADMIN ONLY
-- =====================================================

CREATE TABLE question_answers (
    question_id BIGINT PRIMARY KEY,
    correct_option_id BIGINT NOT NULL,
    explanation TEXT,

    FOREIGN KEY (question_id)
        REFERENCES questions(id) ON DELETE CASCADE,

    FOREIGN KEY (question_id, correct_option_id)
        REFERENCES question_options(question_id, id)
);

INSERT INTO question_answers
(question_id, correct_option_id, explanation)
VALUES
(1,2,'Polymorphism allows the same interface or method name to exhibit different behaviours.'),
(2,5,'Array indexing provides constant-time access, O(1).'),
(3,11,'A tuple cannot be modified after creation.'),
(4,14,'Encapsulation combines data and related methods into a single unit.'),
(5,18,'A stack follows Last In, First Out.'),
(6,22,'A queue follows First In, First Out.'),
(7,27,'In a standard BST, left-subtree values are smaller than the node value.'),
(8,30,'Binary search halves the search interval at each step.'),
(9,35,'HAVING filters grouped records after GROUP BY.'),
(10,40,'INNER JOIN returns rows matching the join condition in both tables.'),
(11,42,'Normalization reduces redundancy and modification anomalies.'),
(12,45,'A process is an instance of a program in execution.'),
(13,50,'Threads generally share their process address space and resources, but have private stacks and execution states.'),
(14,54,'Paging divides virtual memory into fixed-size pages.'),
(15,59,'TCP provides reliable, connection-oriented communication.'),
(16,61,'DNS resolves domain names into IP addresses.'),
(17,66,'A router forwards packets between different IP networks.'),
(18,69,'Requirements analysis identifies the system requirements.'),
(19,75,'Unit testing checks individual components in isolation.'),
(20,78,'The Waterfall model follows sequential development phases.');

-- =====================================================
-- 7. DYNAMIC ADMIN SCORING CONFIGURATION
-- =====================================================

CREATE TABLE scoring_config (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    assessment_id BIGINT UNIQUE NOT NULL,

    scoring_method ENUM('SUM_WITH_NEGATIVE_MARKING')
        DEFAULT 'SUM_WITH_NEGATIVE_MARKING',

    apply_negative_marking BOOLEAN DEFAULT TRUE,
    allow_negative_total BOOLEAN DEFAULT FALSE,

    pass_percentage DECIMAL(5,2) DEFAULT 40.00,
    excellent_percentage DECIMAL(5,2) DEFAULT 85.00,
    good_percentage DECIMAL(5,2) DEFAULT 70.00,
    intermediate_percentage DECIMAL(5,2) DEFAULT 50.00,

    is_active BOOLEAN DEFAULT TRUE,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (assessment_id)
        REFERENCES assessments(id)
);

INSERT INTO scoring_config
(assessment_id, scoring_method, apply_negative_marking,
 allow_negative_total, pass_percentage,
 excellent_percentage, good_percentage,
 intermediate_percentage, is_active)
VALUES
(1,'SUM_WITH_NEGATIVE_MARKING',TRUE,FALSE,
 40.00,85.00,70.00,50.00,TRUE);

-- =====================================================
-- 8. STUDENT ASSESSMENT ATTEMPTS
-- =====================================================

CREATE TABLE assessment_attempts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    assessment_id BIGINT NOT NULL,
    student_profile_id INT NOT NULL,
    attempt_number INT DEFAULT 1,

    status ENUM('IN_PROGRESS','SUBMITTED',
                'EVALUATED','CANCELLED')
        DEFAULT 'IN_PROGRESS',

    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME NULL,

    FOREIGN KEY (assessment_id)
        REFERENCES assessments(id),

    UNIQUE (assessment_id, student_profile_id, attempt_number),

    FOREIGN KEY (student_profile_id)
        REFERENCES student_profiles(profile_id), 

    INDEX idx_student_attempt (student_profile_id, assessment_id)
);

-- =====================================================
-- 9. STUDENT RESPONSES
-- =====================================================

CREATE TABLE student_responses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    attempt_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    selected_option_id BIGINT NULL,

    is_correct BOOLEAN NULL,
    awarded_marks DECIMAL(7,2) NULL,
    answered_at DATETIME NULL,

    FOREIGN KEY (attempt_id)
        REFERENCES assessment_attempts(id) ON DELETE CASCADE,

    FOREIGN KEY (question_id)
        REFERENCES questions(id),

    FOREIGN KEY (question_id, selected_option_id)
        REFERENCES question_options(question_id, id),

    UNIQUE (attempt_id, question_id)
);

-- =====================================================
-- 10. ASSESSMENT RESULTS
-- =====================================================

CREATE TABLE assessment_results (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    attempt_id BIGINT UNIQUE NOT NULL,

    total_questions INT NOT NULL,
    attempted_questions INT NOT NULL,
    correct_answers INT NOT NULL,
    wrong_answers INT NOT NULL,
    unanswered_questions INT NOT NULL,

    maximum_marks DECIMAL(9,2) NOT NULL,
    score_obtained DECIMAL(9,2) NOT NULL,
    percentage DECIMAL(6,2) NOT NULL,

    performance_band VARCHAR(30) NOT NULL,

    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (attempt_id)
        REFERENCES assessment_attempts(id) ON DELETE CASCADE
);

-- =====================================================
-- 11. ADMIN MANAGEMENT EXAMPLES
-- =====================================================

-- Change a question's marks.
-- UPDATE questions
-- SET marks = 2.00, negative_marks = 0.50
-- WHERE id = 1;

-- Disable negative marking.
-- UPDATE scoring_config
-- SET apply_negative_marking = FALSE
-- WHERE assessment_id = 1;

-- Change pass percentage.
-- UPDATE scoring_config
-- SET pass_percentage = 45.00
-- WHERE assessment_id = 1;

-- Deactivate a question without deleting it.
-- UPDATE questions SET is_active = FALSE WHERE id = 1;

-- Publish assessment after review.
-- UPDATE assessments
-- SET is_published = TRUE
-- WHERE id = 1;

-- =====================================================
-- 12. VERIFICATION QUERIES
-- =====================================================

-- Check category-wise question distribution.
SELECT
    c.category_name,
    COUNT(q.id) AS question_count
FROM technical_categories c
LEFT JOIN questions q
    ON c.id = q.category_id
    AND q.assessment_id = 1
    AND q.is_active = TRUE
GROUP BY c.id, c.category_name
ORDER BY c.id;

-- Check total active questions and maximum marks.
SELECT
    COUNT(*) AS total_questions,
    SUM(marks) AS maximum_marks
FROM questions
WHERE assessment_id = 1
AND is_active = TRUE;

-- View question text and options.
-- Do not include correct answers in student-facing API responses.
SELECT
    q.question_code,
    q.question_text,
    qo.option_label,
    qo.option_text
FROM questions q
JOIN question_options qo
    ON q.id = qo.question_id
WHERE q.assessment_id = 1
AND q.is_active = TRUE
ORDER BY q.display_order, qo.display_order;

-- Admin-only answer key query.
SELECT
    q.question_code,
    qo.option_label AS correct_option,
    qo.option_text AS correct_answer,
    qa.explanation
FROM question_answers qa
JOIN questions q
    ON qa.question_id = q.id
JOIN question_options qo
    ON qa.correct_option_id = qo.id
ORDER BY q.display_order;

-- =====================================================
-- END OF SCRIPT
-- =====================================================