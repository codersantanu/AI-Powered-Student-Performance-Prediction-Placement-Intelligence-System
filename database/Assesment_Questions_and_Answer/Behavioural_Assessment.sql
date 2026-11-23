-- ARCHIVED SOURCE SQL ONLY: this script contains DROP statements and targets
-- student_profiles.profile_id. Do not execute it; use the safe import in
-- database/mysql/behavioural_assessment.sql for the separate app database.
-- =====================================================================
-- FINAL BEHAVIOURAL ASSESSMENT MODULE
-- Database: Student_Performance_Prediction
-- Source: User-provided behavioural assessment SQL dataset
--
-- Preserved source content:
-- 1 assessment, 8 behavioural dimensions, 15 questions,
-- 60 answer options, 60 option interpretations and all score mappings.
--
-- IMPORTANT:
-- 1. This script DROPS and recreates only the ten beh_* tables.
-- 2. Existing behavioural attempts, responses and results will be deleted.
-- 3. Other project tables and the psychometric module are not dropped.
-- 4. Requires student_profiles(profile_id INT PRIMARY KEY) to exist.
-- 5. Execute this script once in MySQL Workbench.
-- =====================================================================


-- ---------------------------------------------------------------------
-- A. DROP ONLY BEHAVIOURAL TABLES (child tables first)
-- ---------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS beh_student_responses;
DROP TABLE IF EXISTS beh_assessment_results;
DROP TABLE IF EXISTS beh_assessment_attempts;
DROP TABLE IF EXISTS beh_option_interpretations;
DROP TABLE IF EXISTS beh_option_dimension_scores;
DROP TABLE IF EXISTS beh_answer_options;
DROP TABLE IF EXISTS beh_questions;
DROP TABLE IF EXISTS beh_scoring_config;
DROP TABLE IF EXISTS beh_dimensions;
DROP TABLE IF EXISTS beh_assessments;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- B. CREATE TABLES
-- ---------------------------------------------------------------------

CREATE TABLE beh_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_beh_assessment_version (title, version)
) ENGINE=InnoDB;

CREATE TABLE beh_dimensions (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
) ENGINE=InnoDB;

CREATE TABLE beh_questions (
    id VARCHAR(10) PRIMARY KEY,
    assessment_id INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('behavioural','categorical') NOT NULL DEFAULT 'behavioural',
    order_number INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_beh_question_assessment
        FOREIGN KEY (assessment_id) REFERENCES beh_assessments(id),
    UNIQUE KEY uq_beh_question_order (assessment_id, order_number)
) ENGINE=InnoDB;

CREATE TABLE beh_answer_options (
    id VARCHAR(15) PRIMARY KEY,
    question_id VARCHAR(10) NOT NULL,
    option_text TEXT NOT NULL,
    order_number INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_beh_option_question
        FOREIGN KEY (question_id) REFERENCES beh_questions(id),
    UNIQUE KEY uq_beh_option_order (question_id, order_number),
    UNIQUE KEY uq_beh_question_option_id (question_id, id)
) ENGINE=InnoDB;

CREATE TABLE beh_option_dimension_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    option_id VARCHAR(15) NOT NULL,
    dimension_id VARCHAR(20) NOT NULL,
    score TINYINT NOT NULL,
    CONSTRAINT fk_beh_score_option
        FOREIGN KEY (option_id) REFERENCES beh_answer_options(id),
    CONSTRAINT fk_beh_score_dimension
        FOREIGN KEY (dimension_id) REFERENCES beh_dimensions(id),
    UNIQUE KEY uq_beh_option_dimension (option_id, dimension_id),
    CONSTRAINT chk_beh_score_range CHECK (score BETWEEN 1 AND 4)
) ENGINE=InnoDB;

CREATE TABLE beh_option_interpretations (
    option_id VARCHAR(15) PRIMARY KEY,
    interpretation TEXT NOT NULL,
    CONSTRAINT fk_beh_interpretation_option
        FOREIGN KEY (option_id) REFERENCES beh_answer_options(id)
) ENGINE=InnoDB;

CREATE TABLE beh_scoring_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    min_score DECIMAL(4,2) NOT NULL DEFAULT 1,
    max_score DECIMAL(4,2) NOT NULL DEFAULT 4,
    scoring_method VARCHAR(50) NOT NULL DEFAULT 'dimension_average',
    normalization_scale DECIMAL(6,2) NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_beh_config_assessment
        FOREIGN KEY (assessment_id) REFERENCES beh_assessments(id),
    UNIQUE KEY uq_beh_config_assessment (assessment_id),
    CONSTRAINT chk_beh_config_range CHECK (max_score > min_score)
) ENGINE=InnoDB;

CREATE TABLE beh_assessment_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    student_profile_id INT NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    status ENUM('in_progress','submitted','evaluated','cancelled')
        NOT NULL DEFAULT 'in_progress',
    CONSTRAINT fk_beh_attempt_assessment
        FOREIGN KEY (assessment_id) REFERENCES beh_assessments(id),
    CONSTRAINT fk_beh_attempt_student
        FOREIGN KEY (student_profile_id) REFERENCES student_profiles(profile_id),
    UNIQUE KEY uq_beh_student_attempt (assessment_id, student_profile_id, attempt_number),
    KEY idx_beh_attempt_student (student_profile_id),
    KEY idx_beh_attempt_status (status)
) ENGINE=InnoDB;

CREATE TABLE beh_student_responses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    question_id VARCHAR(10) NOT NULL,
    selected_option_id VARCHAR(15) NOT NULL,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_beh_response_attempt
        FOREIGN KEY (attempt_id) REFERENCES beh_assessment_attempts(id),
    CONSTRAINT fk_beh_response_question_option
        FOREIGN KEY (question_id, selected_option_id)
        REFERENCES beh_answer_options(question_id, id),
    UNIQUE KEY uq_beh_attempt_question (attempt_id, question_id),
    KEY idx_beh_response_option (selected_option_id)
) ENGINE=InnoDB;

CREATE TABLE beh_assessment_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    dimension_scores JSON,
    behavioural_profile JSON,
    summary TEXT,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_beh_result_attempt
        FOREIGN KEY (attempt_id) REFERENCES beh_assessment_attempts(id),
    UNIQUE KEY uq_beh_result_attempt (attempt_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- C. INSERT ORIGINAL ASSESSMENT DATA (preserved from uploaded file)
-- ---------------------------------------------------------------------

INSERT INTO beh_assessments
(id, title, description, version, is_published)
VALUES
(1, 'Student Behavioural Assessment',
    'Assessment of workplace behavioural tendencies and career readiness.',
    '1.0',
    FALSE);

INSERT INTO beh_dimensions (id, name, description)
VALUES
('COMM', 'Communication', 'Ability to express ideas and share information effectively.'),
('TEAM', 'Teamwork', 'Ability to collaborate and cooperate with others.'),
('LEAD', 'Leadership', 'Ability to take initiative and guide others.'),
('ADAPT', 'Adaptability', 'Ability to respond effectively to changing situations.'),
('ACC', 'Accountability', 'Ability to accept responsibility for actions and outcomes.'),
('EI', 'Emotional Intelligence', 'Ability to understand and manage emotions.'),
('PS', 'Problem Solving', 'Ability to analyse situations and find solutions.'),
('LA', 'Learning Agility', 'Ability to learn and apply new knowledge and skills.');

INSERT INTO beh_questions
(id, assessment_id, question_text, question_type, order_number)
VALUES
('Q01', 1, 'You have three important tasks with the same deadline. How would you handle them?', 'behavioural', 1),

('Q02', 1, 'One member of your team is not contributing properly to a group project. What would you do?', 'behavioural', 2),

('Q03', 1, 'Your manager criticises your work in front of other team members. How would you react?', 'behavioural', 3),

('Q04', 1, 'You are assigned a task that you have never performed before. What would you do?', 'behavioural', 4),

('Q05', 1, 'Your organisation introduces a new technology or working process. How would you respond?', 'behavioural', 5),

('Q06', 1, 'Your team leader is unavailable, but an important decision needs to be made. What would you do?', 'behavioural', 6),

('Q07', 1, 'You discover a serious mistake made by a colleague that nobody else has noticed. What would you do?', 'behavioural', 7),

('Q08', 1, 'You realise that you cannot complete your assigned work before the deadline. What would you do?', 'behavioural', 8),

('Q09', 1, 'You disagree with your senior''s opinion during a team meeting. How would you express your disagreement?', 'behavioural', 9),

('Q10', 1, 'Your assigned task requires a technical skill that you have never learned. What would you do?', 'behavioural', 10),

('Q11', 1, 'You and a coworker have different opinions about how to complete a project. What would you do?', 'behavioural', 11),

('Q12', 1, 'What motivates you the most in your professional career?', 'categorical', 12),

('Q13', 1, 'You need to make an important decision, but you do not have all the required information. What would you do?', 'behavioural', 13),

('Q14', 1, 'Your team fails to achieve its target partly because of a mistake you made. How would you react?', 'behavioural', 14),

('Q15', 1, 'You are experiencing stress because of continuous workload and multiple responsibilities. What would you do?', 'behavioural', 15);

INSERT INTO beh_answer_options
(id, question_id, option_text, order_number)
VALUES
-- Q01
('Q01_A','Q01','Prioritise tasks based on urgency and importance.',1),
('Q01_B','Q01','Complete the easiest task first.',2),
('Q01_C','Q01','Ask the manager to clarify priorities.',3),
('Q01_D','Q01','Start all tasks at the last minute.',4),

-- Q02
('Q02_A','Q02','Talk privately with the member and understand the problem.',1),
('Q02_B','Q02','Inform the team leader immediately without speaking to the member.',2),
('Q02_C','Q02','Complete their work yourself to avoid delays.',3),
('Q02_D','Q02','Ignore the situation.',4),

-- Q03
('Q03_A','Q03','Stay calm, listen and consider the feedback.',1),
('Q03_B','Q03','Defend your work immediately.',2),
('Q03_C','Q03','Ask for specific feedback and ways to improve.',3),
('Q03_D','Q03','Become upset and stop communicating.',4),

-- Q04
('Q04_A','Q04','Research the task and learn how to complete it.',1),
('Q04_B','Q04','Ask an experienced colleague for guidance.',2),
('Q04_C','Q04','Wait until someone provides detailed instructions.',3),
('Q04_D','Q04','Avoid the task because you lack experience.',4),

-- Q05
('Q05_A','Q05','Learn the new process and start applying it.',1),
('Q05_B','Q05','Explore the advantages and disadvantages before adopting it.',2),
('Q05_C','Q05','Continue using the old process until you receive instructions.',3),
('Q05_D','Q05','Resist the change because you are comfortable with the old process.',4),

-- Q06
('Q06_A','Q06','Evaluate the situation, consult the team and take appropriate action.',1),
('Q06_B','Q06','Wait until the team leader returns.',2),
('Q06_C','Q06','Make the decision independently without consulting anyone.',3),
('Q06_D','Q06','Contact another authorised senior person for guidance.',4),

-- Q07
('Q07_A','Q07','Inform the colleague privately and help correct it.',1),
('Q07_B','Q07','Report the mistake directly to the manager.',2),
('Q07_C','Q07','Ignore it because it is not your responsibility.',3),
('Q07_D','Q07','Correct the mistake silently without informing anyone.',4),

-- Q08
('Q08_A','Q08','Inform the manager early, explain the situation and suggest a revised timeline.',1),
('Q08_B','Q08','Work extra hours to try to finish it on time.',2),
('Q08_C','Q08','Wait until the deadline passes before explaining.',3),
('Q08_D','Q08','Blame external circumstances or other team members.',4),

-- Q09
('Q09_A','Q09','Respectfully explain your viewpoint with supporting facts.',1),
('Q09_B','Q09','Remain silent to avoid disagreement.',2),
('Q09_C','Q09','Publicly argue that the senior is wrong.',3),
('Q09_D','Q09','Discuss your concerns privately with the senior after the meeting.',4),

-- Q10
('Q10_A','Q10','Learn through documentation, tutorials and practical experimentation.',1),
('Q10_B','Q10','Ask an experienced colleague to teach you.',2),
('Q10_C','Q10','Request additional time to learn before starting.',3),
('Q10_D','Q10','Avoid the task because you do not know the skill.',4),

-- Q11
('Q11_A','Q11','Listen to their perspective and compare both approaches objectively.',1),
('Q11_B','Q11','Insist on your approach because you believe it is better.',2),
('Q11_C','Q11','Find a compromise that supports the project goals.',3),
('Q11_D','Q11','Ask the manager to make the final decision immediately.',4),

-- Q12 - CATEGORICAL
('Q12_A','Q12','Learning new skills and professional growth.',1),
('Q12_B','Q12','Salary, financial security and job stability.',2),
('Q12_C','Q12','Recognition, appreciation and career advancement.',3),
('Q12_D','Q12','Meaningful work, responsibility and making an impact.',4),

-- Q13
('Q13_A','Q13','Gather the most relevant available information and evaluate possible outcomes.',1),
('Q13_B','Q13','Consult experienced people before deciding.',2),
('Q13_C','Q13','Make a quick decision based mainly on intuition.',3),
('Q13_D','Q13','Avoid making the decision until every detail is available.',4),

-- Q14
('Q14_A','Q14','Accept responsibility, apologise and work on correcting the mistake.',1),
('Q14_B','Q14','Explain the circumstances and share responsibility with the team.',2),
('Q14_C','Q14','Blame other team members.',3),
('Q14_D','Q14','Analyse what went wrong and develop a prevention plan.',4),

-- Q15
('Q15_A','Q15','Organise your tasks, prioritise work and take appropriate breaks.',1),
('Q15_B','Q15','Discuss the workload with your manager and request support if needed.',2),
('Q15_C','Q15','Continue working without breaks until everything is finished.',3),
('Q15_D','Q15','Avoid responsibilities because you feel overwhelmed.',4);

INSERT INTO beh_option_interpretations (option_id, interpretation)
VALUES
('Q01_A','Demonstrates planning and prioritisation.'),
('Q01_B','Prefers immediate, manageable tasks.'),
('Q01_C','Demonstrates communication and willingness to align expectations.'),
('Q01_D','Indicates weak planning and time management.'),

('Q02_A','Shows empathy and constructive communication.'),
('Q02_B','Uses formal escalation but may miss an opportunity to resolve the issue directly.'),
('Q02_C','Shows initiative but may not address the underlying team issue.'),
('Q02_D','Shows limited collaboration and ownership.'),

('Q03_A','Shows emotional control and openness to feedback.'),
('Q03_B','Shows willingness to express a viewpoint but may react defensively.'),
('Q03_C','Demonstrates constructive communication and learning orientation.'),
('Q03_D','Indicates difficulty managing criticism.'),

('Q04_A','Demonstrates independent learning and initiative.'),
('Q04_B','Shows willingness to learn through collaboration.'),
('Q04_C','Prefers structured guidance before starting.'),
('Q04_D','Shows low confidence in unfamiliar situations.'),

('Q05_A','Demonstrates adaptability and learning agility.'),
('Q05_B','Shows analytical thinking and considered adaptation.'),
('Q05_C','Prefers clarity before changing established practices.'),
('Q05_D','Indicates difficulty adapting to change.'),

('Q06_A','Shows initiative, teamwork and decision-making.'),
('Q06_B','Respects authority but may delay necessary action.'),
('Q06_C','Shows initiative but may overlook team perspectives.'),
('Q06_D','Demonstrates responsible escalation and communication.'),

('Q07_A','Demonstrates integrity, empathy and teamwork.'),
('Q07_B','Prioritises formal reporting, especially if the issue is serious.'),
('Q07_C','Indicates limited ownership.'),
('Q07_D','Shows initiative but may reduce transparency.'),

('Q08_A','Shows accountability and proactive communication.'),
('Q08_B','Shows commitment, although early communication may still be necessary.'),
('Q08_C','Indicates delayed communication and planning.'),
('Q08_D','Indicates difficulty accepting responsibility.'),

('Q09_A','Demonstrates assertive and professional communication.'),
('Q09_B','Prefers harmony but may avoid constructive discussion.'),
('Q09_C','Shows willingness to express disagreement but lacks professional tact.'),
('Q09_D','Shows respectful communication and conflict management.'),

('Q10_A','Demonstrates independent learning.'),
('Q10_B','Demonstrates collaborative learning.'),
('Q10_C','Recognises the need for preparation and realistic planning.'),
('Q10_D','Indicates reluctance to develop new capabilities.'),

('Q11_A','Shows collaboration and analytical thinking.'),
('Q11_B','Shows confidence but limited openness to others opinions.'),
('Q11_C','Demonstrates cooperation and conflict resolution.'),
('Q11_D','Uses authority to resolve disagreement rather than exploring solutions first.'),

('Q12_A','Learning and development oriented.'),
('Q12_B','Security and financial stability oriented.'),
('Q12_C','Recognition and achievement oriented.'),
('Q12_D','Purpose and contribution oriented.'),

('Q13_A','Demonstrates analytical decision-making.'),
('Q13_B','Shows collaborative decision-making.'),
('Q13_C','Shows decisiveness but may lack sufficient analysis.'),
('Q13_D','Indicates difficulty acting under uncertainty.'),

('Q14_A','Demonstrates accountability and ownership.'),
('Q14_B','Recognises shared factors but should also acknowledge personal responsibility.'),
('Q14_C','Indicates low accountability.'),
('Q14_D','Demonstrates learning from mistakes and problem-solving.'),

('Q15_A','Shows self-management and practical stress handling.'),
('Q15_B','Demonstrates communication and responsible workload management.'),
('Q15_C','Shows commitment but may lead to ineffective workload management.'),
('Q15_D','Indicates difficulty managing pressure and responsibilities.');

INSERT INTO beh_option_dimension_scores (option_id, dimension_id, score)
VALUES
-- Q01
('Q01_A','PS',4),('Q01_A','LEAD',4),('Q01_A','ACC',4),
('Q01_B','PS',2),('Q01_B','ACC',2),
('Q01_C','COMM',4),('Q01_C','PS',3),('Q01_C','ACC',3),
('Q01_D','PS',1),('Q01_D','ACC',1),('Q01_D','LEAD',1),

-- Q02
('Q02_A','COMM',4),('Q02_A','TEAM',4),('Q02_A','EI',4),
('Q02_B','COMM',2),('Q02_B','TEAM',2),
('Q02_C','ACC',3),('Q02_C','TEAM',2),('Q02_C','LEAD',2),
('Q02_D','TEAM',1),('Q02_D','ACC',1),

-- Q03
('Q03_A','EI',4),('Q03_A','LA',4),('Q03_A','ADAPT',3),
('Q03_B','COMM',2),('Q03_B','EI',1),
('Q03_C','COMM',4),('Q03_C','LA',4),('Q03_C','EI',4),
('Q03_D','EI',1),('Q03_D','COMM',1),('Q03_D','ADAPT',1),

-- Q04
('Q04_A','LA',4),('Q04_A','ADAPT',4),('Q04_A','PS',3),
('Q04_B','COMM',4),('Q04_B','TEAM',4),('Q04_B','LA',3),
('Q04_C','LA',2),('Q04_C','ADAPT',2),
('Q04_D','LA',1),('Q04_D','ADAPT',1),

-- Q05
('Q05_A','ADAPT',4),('Q05_A','LA',4),
('Q05_B','PS',4),('Q05_B','ADAPT',3),
('Q05_C','ADAPT',2),('Q05_C','LA',2),
('Q05_D','ADAPT',1),('Q05_D','LA',1),

-- Q06
('Q06_A','LEAD',4),('Q06_A','TEAM',4),('Q06_A','PS',4),
('Q06_B','LEAD',1),('Q06_B','ACC',2),
('Q06_C','LEAD',3),('Q06_C','PS',2),('Q06_C','TEAM',1),
('Q06_D','COMM',4),('Q06_D','ACC',4),('Q06_D','PS',3),

-- Q07
('Q07_A','TEAM',4),('Q07_A','EI',4),('Q07_A','ACC',4),
('Q07_B','ACC',4),('Q07_B','COMM',3),
('Q07_C','ACC',1),('Q07_C','TEAM',1),
('Q07_D','ACC',2),('Q07_D','TEAM',2),

-- Q08
('Q08_A','COMM',4),('Q08_A','ACC',4),('Q08_A','PS',4),
('Q08_B','ACC',3),('Q08_B','LEAD',2),
('Q08_C','COMM',1),('Q08_C','ACC',1),
('Q08_D','ACC',1),('Q08_D','EI',1),

-- Q09
('Q09_A','COMM',4),('Q09_A','PS',4),('Q09_A','EI',4),
('Q09_B','COMM',1),('Q09_B','EI',2),
('Q09_C','COMM',1),('Q09_C','EI',1),
('Q09_D','COMM',4),('Q09_D','EI',4),('Q09_D','TEAM',3),

-- Q10
('Q10_A','LA',4),('Q10_A','ADAPT',4),('Q10_A','PS',3),
('Q10_B','LA',3),('Q10_B','TEAM',4),('Q10_B','COMM',4),
('Q10_C','LA',3),('Q10_C','ACC',3),
('Q10_D','LA',1),('Q10_D','ADAPT',1),

-- Q11
('Q11_A','TEAM',4),('Q11_A','EI',4),('Q11_A','PS',4),
('Q11_B','TEAM',1),('Q11_B','EI',1),
('Q11_C','TEAM',4),('Q11_C','COMM',4),('Q11_C','EI',4),
('Q11_D','COMM',2),('Q11_D','TEAM',2),

-- Q12
-- Categorical motivation question: NO competency scores

-- Q13
('Q13_A','PS',4),('Q13_A','ACC',4),
('Q13_B','COMM',4),('Q13_B','TEAM',3),('Q13_B','PS',3),
('Q13_C','PS',2),('Q13_C','LEAD',2),
('Q13_D','PS',1),('Q13_D','ADAPT',1),

-- Q14
('Q14_A','ACC',4),('Q14_A','EI',4),('Q14_A','TEAM',3),
('Q14_B','COMM',3),('Q14_B','TEAM',3),('Q14_B','ACC',2),
('Q14_C','ACC',1),('Q14_C','EI',1),('Q14_C','TEAM',1),
('Q14_D','PS',4),('Q14_D','LA',4),('Q14_D','ACC',4),

-- Q15
('Q15_A','PS',4),('Q15_A','ACC',4),('Q15_A','EI',3),
('Q15_B','COMM',4),('Q15_B','ACC',4),('Q15_B','EI',4),
('Q15_C','ACC',2),('Q15_C','EI',1),
('Q15_D','EI',1),('Q15_D','ACC',1);


-- =====================================================================
-- END OF FINAL BEHAVIOURAL ASSESSMENT MODULE
-- =====================================================================
