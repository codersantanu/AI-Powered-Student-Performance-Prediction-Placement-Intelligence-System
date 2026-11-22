-- =====================================================================
-- FINAL PSYCHOMETRIC ASSESSMENT MODULE
-- Database: Student_Performance_Prediction
-- Source dataset preserved: 15 scenarios, 60 options, 5 dimensions
-- Includes 241 option-to-dimension score mappings and scoring config.
--
-- IMPORTANT:
-- 1. This script DROPS and recreates only the nine psy_* tables.
-- 2. Existing psychometric attempts, responses and results will be deleted.
-- 3. Other project tables are not dropped.
-- 4. Requires student_profiles(profile_id INT PRIMARY KEY) to exist.
-- 5. Execute this script once in MySQL Workbench.
-- ====================================================================

-- ---------------------------------------------------------------------
-- A. DROP ONLY THE PSYCHOMETRIC TABLES (child tables first)
-- ---------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS psy_student_responses;
DROP TABLE IF EXISTS psy_assessment_results;
DROP TABLE IF EXISTS psy_assessment_attempts;
DROP TABLE IF EXISTS psy_option_dimension_scores;
DROP TABLE IF EXISTS psy_answer_options;
DROP TABLE IF EXISTS psy_questions;
DROP TABLE IF EXISTS psy_scoring_config;
DROP TABLE IF EXISTS psy_dimensions;
DROP TABLE IF EXISTS psy_assessments;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- B. CREATE TABLES
-- ---------------------------------------------------------------------

CREATE TABLE psy_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_name VARCHAR(150) NOT NULL,
    assessment_type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_psy_assessment_version (assessment_name, version)
) ENGINE=InnoDB;

CREATE TABLE psy_dimensions (
    id INT PRIMARY KEY,
    assessment_id INT NOT NULL,
    dimension_code VARCHAR(20) NOT NULL,
    dimension_name VARCHAR(100) NOT NULL,
    description TEXT,
    CONSTRAINT fk_psy_dimensions_assessment
        FOREIGN KEY (assessment_id) REFERENCES psy_assessments(id),
    UNIQUE KEY uq_psy_dimension (assessment_id, dimension_code)
) ENGINE=InnoDB;

CREATE TABLE psy_questions (
    id INT PRIMARY KEY,
    assessment_id INT NOT NULL,
    question_code VARCHAR(20) NOT NULL,
    question_text TEXT NOT NULL,
    explores TEXT,
    question_type VARCHAR(30) NOT NULL DEFAULT 'scenario',
    display_order INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_psy_questions_assessment
        FOREIGN KEY (assessment_id) REFERENCES psy_assessments(id),
    UNIQUE KEY uq_psy_question_code (assessment_id, question_code),
    UNIQUE KEY uq_psy_question_order (assessment_id, display_order)
) ENGINE=InnoDB;

CREATE TABLE psy_answer_options (
    id INT PRIMARY KEY,
    question_id INT NOT NULL,
    option_code CHAR(1) NOT NULL,
    option_text TEXT NOT NULL,
    interpretation TEXT,
    display_order INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_psy_options_question
        FOREIGN KEY (question_id) REFERENCES psy_questions(id),
    UNIQUE KEY uq_psy_question_option (question_id, option_code),
    UNIQUE KEY uq_psy_question_option_id (question_id, id)
) ENGINE=InnoDB;

CREATE TABLE psy_option_dimension_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    option_id INT NOT NULL,
    dimension_id INT NOT NULL,
    score DECIMAL(4,2) NOT NULL,
    CONSTRAINT fk_psy_score_option
        FOREIGN KEY (option_id) REFERENCES psy_answer_options(id),
    CONSTRAINT fk_psy_score_dimension
        FOREIGN KEY (dimension_id) REFERENCES psy_dimensions(id),
    UNIQUE KEY uq_psy_option_dimension (option_id, dimension_id),
    CONSTRAINT chk_psy_score_range CHECK (score >= 1 AND score <= 4)
) ENGINE=InnoDB;

CREATE TABLE psy_scoring_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    min_score DECIMAL(4,2) NOT NULL DEFAULT 1,
    max_score DECIMAL(4,2) NOT NULL DEFAULT 4,
    scoring_method VARCHAR(50) NOT NULL DEFAULT 'dimension_average',
    normalization_scale DECIMAL(6,2) NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_psy_config_assessment
        FOREIGN KEY (assessment_id) REFERENCES psy_assessments(id),
    UNIQUE KEY uq_psy_config_assessment (assessment_id),
    CONSTRAINT chk_psy_config_range CHECK (max_score > min_score)
) ENGINE=InnoDB;

CREATE TABLE psy_assessment_attempts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    student_profile_id INT NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    status ENUM('in_progress', 'submitted', 'evaluated', 'cancelled')
        NOT NULL DEFAULT 'in_progress',
    CONSTRAINT fk_psy_attempt_assessment
        FOREIGN KEY (assessment_id) REFERENCES psy_assessments(id),
    CONSTRAINT fk_psy_attempt_student
        FOREIGN KEY (student_profile_id) REFERENCES student_profiles(profile_id),
    UNIQUE KEY uq_psy_student_attempt (assessment_id, student_profile_id, attempt_number),
    KEY idx_psy_attempt_student (student_profile_id),
    KEY idx_psy_attempt_status (status)
) ENGINE=InnoDB;

CREATE TABLE psy_student_responses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    question_id INT NOT NULL,
    selected_option_id INT NOT NULL,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_psy_response_attempt
        FOREIGN KEY (attempt_id) REFERENCES psy_assessment_attempts(id),
    CONSTRAINT fk_psy_response_question_option
        FOREIGN KEY (question_id, selected_option_id)
        REFERENCES psy_answer_options(question_id, id),
    UNIQUE KEY uq_psy_attempt_question (attempt_id, question_id),
    KEY idx_psy_response_option (selected_option_id)
) ENGINE=InnoDB;

CREATE TABLE psy_assessment_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    dimension_scores JSON,
    personality_profile JSON,
    summary TEXT,
    evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_psy_result_attempt
        FOREIGN KEY (attempt_id) REFERENCES psy_assessment_attempts(id),
    UNIQUE KEY uq_psy_result_attempt (attempt_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- C. INSERT ORIGINAL ASSESSMENT DATA (preserved from uploaded SQL)
-- ---------------------------------------------------------------------

INSERT INTO psy_assessments
(id, assessment_name, assessment_type, version, description, is_published)
VALUES
(
	    1,
	    'Psychometric Situation-Based Assessment',
	    'Situational Judgement',
	    '1.0',
	    'Situation-based assessment exploring emotional response, priority management, social orientation, decision-making and work preferences.',
	    FALSE
	);

INSERT INTO psy_dimensions
(id, assessment_id, dimension_code, dimension_name, description)
VALUES
(1, 1, 'EMO', 'Emotional Response',
	 'How an individual responds to emotional pressure and challenging situations.'),

	(2, 1, 'PRI', 'Priority Management',
	 'How an individual balances competing responsibilities and manages priorities.'),

	(3, 1, 'SOC', 'Social Orientation',
	 'How an individual interacts, collaborates and manages relationships.'),

	(4, 1, 'DEC', 'Decision-Making',
	 'How an individual evaluates situations and makes decisions.'),

	(5, 1, 'AUT', 'Work Preference and Autonomy',
	 'Preference for independent work, collaboration and taking initiative.');

INSERT INTO psy_questions
(id, assessment_id, question_code, question_text, explores, question_type, display_order)
VALUES
(1, 1, 'PSY_Q01',
	 'At home, your mother suddenly becomes ill. At the same time, an urgent online project-team meeting is scheduled. How would you handle this situation?',
	 'Empathy, prioritisation and responsibility.',
	 'scenario', 1),

	(2, 1, 'PSY_Q02',
	 'During a college presentation, your professor criticises your work in front of the class. You believe some of the criticism is unfair. How would you respond?',
	 'Emotional response, confidence and communication.',
	 'scenario', 2),

	(3, 1, 'PSY_Q03',
	 'You receive an internship opportunity, but your close friend is rejected. Your friend becomes upset and stops talking to you. What would you do?',
	 'Empathy, independence and social relationships.',
	 'scenario', 3),

	(4, 1, 'PSY_Q04',
	 'You have spent two weeks preparing a project presentation. One hour before the presentation, your team leader suddenly changes its structure. How would you respond?',
	 'Adaptability and emotional response.',
	 'scenario', 4),

	(5, 1, 'PSY_Q05',
	 'Your friends ask you to share answers during an online examination. They say everyone does it and refusing may damage your friendship. What would you do?',
	 'Independence, personal values and decision-making.',
	 'scenario', 5),

	(6, 1, 'PSY_Q06',
	 'Two members of your project team have a serious disagreement. Both ask you to support their side, and the disagreement is delaying the project. What would you do?',
	 'Social orientation and conflict management.',
	 'scenario', 6),

	(7, 1, 'PSY_Q07',
	 'You and your team spend one month preparing a project for a competition, but your team does not qualify. How would you react?',
	 'Resilience, emotional response and motivation.',
	 'scenario', 7),

	(8, 1, 'PSY_Q08',
	 'You are saving money for a professional certification. Suddenly, your family needs urgent financial support. How would you handle the situation?',
	 'Prioritisation and decision-making.',
	 'scenario', 8),

	(9, 1, 'PSY_Q09',
	 'You are participating in an event. The event coordinator becomes unavailable, important tasks remain incomplete, and nobody is taking responsibility. What would you do?',
	 'Initiative, leadership and work preferences.',
	 'scenario', 9),

	(10, 1, 'PSY_Q10',
	 'You are assigned to a project team where you do not know anyone. The other members already have their own friend groups. How would you approach the situation?',
	 'Social orientation and collaboration preferences.',
	 'scenario', 10),

	(11, 1, 'PSY_Q11',
	 'You have two internship opportunities. One offers a salary but limited learning, while the other is unpaid but provides extensive technical learning. How would you decide?',
	 'Career preferences and decision-making.',
	 'scenario', 11),

	(12, 1, 'PSY_Q12',
	 'Your manager assigns you a project with a clear deadline but provides no detailed instructions. You can either work independently or ask colleagues for help. What would you prefer?',
	 'Autonomy and collaboration preferences.',
	 'scenario', 12),

	(13, 1, 'PSY_Q13',
	 'You notice that a colleague is taking credit for another team member’s work. The affected person is afraid to complain. What would you do?',
	 'Personal values, social judgement and conflict response.',
	 'scenario', 13),

	(14, 1, 'PSY_Q14',
	 'During an important project demonstration, the software suddenly stops working. Your teammates panic, and the evaluators are waiting. How would you respond?',
	 'Emotional response, problem-solving and responsibility.',
	 'scenario', 14),

	(15, 1, 'PSY_Q15',
	 'You receive an important project assignment that requires working late for several days. At the same time, you have personal and family responsibilities. How would you manage the situation?',
	 'Work preferences, prioritisation and communication.',
	 'scenario', 15);

INSERT INTO psy_answer_options
(id, question_id, option_code, option_text, interpretation, display_order)
VALUES
-- Q01
	(1,1,'A','Take care of your mother first, inform the team and arrange an alternative if possible.','Shows empathy, responsibility and balanced prioritisation.',1),
	(2,1,'B','Ask another family member to help and attend the meeting.','Shows an attempt to balance family responsibilities and professional commitments.',2),
	(3,1,'C','Ignore the family situation temporarily and attend the meeting.','Places professional responsibility above an immediate family need.',3),
	(4,1,'D','Become confused and avoid both responsibilities.','May indicate difficulty managing competing responsibilities under pressure.',4),

	-- Q02
	(5,2,'A','Calmly explain your perspective using supporting facts.','Shows emotional control, confidence and constructive communication.',1),
	(6,2,'B','Remain silent and discuss the matter privately afterwards.','Shows restraint and preference for resolving disagreement privately.',2),
	(7,2,'C','Immediately argue with the professor.','May indicate an impulsive response to criticism.',3),
	(8,2,'D','Feel embarrassed and stop participating.','May indicate difficulty maintaining confidence after criticism.',4),

	-- Q03
	(9,3,'A','Talk to your friend, acknowledge their feelings and encourage them.','Shows empathy while maintaining personal career independence.',1),
	(10,3,'B','Avoid discussing your internship opportunity.','Shows sensitivity to your friend’s feelings but may involve avoiding communication.',2),
	(11,3,'C','Give up the opportunity because your friend was not selected.','May indicate that friendship strongly influences personal career decisions.',3),
	(12,3,'D','Tell your friend to accept the result.','Shows directness but may overlook the friend’s emotional situation.',4),

	-- Q04
	(13,4,'A','Adapt quickly and help reorganise the presentation.','Shows adaptability, initiative and constructive response to change.',1),
	(14,4,'B','Ask the leader why the changes are necessary before proceeding.','Shows a preference for understanding decisions before adapting.',2),
	(15,4,'C','Refuse to change the presentation because you have already invested effort.','May indicate resistance to unexpected changes.',3),
	(16,4,'D','Become frustrated and let others handle the changes.','May indicate difficulty adapting under time pressure.',4),

	-- Q05
	(17,5,'A','Refuse politely and complete the examination honestly.','Shows independence, integrity and confidence in personal decisions.',1),
	(18,5,'B','Share the answers to avoid losing your friends.','Shows that social pressure may influence personal decisions.',2),
	(19,5,'C','Ignore the messages and focus on your examination.','Shows an attempt to avoid peer pressure and maintain focus.',3),
	(20,5,'D','Report the situation to the appropriate authority.','Shows willingness to take formal action to uphold examination rules.',4),

	-- Q06
	(21,6,'A','Listen to both members and help them find a practical solution.','Shows collaboration, empathy and constructive conflict management.',1),
	(22,6,'B','Support the member who is your closer friend.','Shows that personal relationships may influence conflict decisions.',2),
	(23,6,'C','Stay away because the disagreement is not your problem.','Shows a preference to avoid involvement in interpersonal conflict.',3),
	(24,6,'D','Ask the team leader to resolve the conflict.','Shows preference for formal leadership intervention.',4),

	-- Q07
	(25,7,'A','Analyse the feedback and identify areas for improvement.','Shows learning orientation, resilience and constructive self-evaluation.',1),
	(26,7,'B','Feel disappointed but try another competition.','Shows emotional recovery and willingness to continue.',2),
	(27,7,'C','Blame the judges for the result.','May indicate difficulty accepting an unfavourable outcome.',3),
	(28,7,'D','Lose interest in participating in future competitions.','May indicate reduced motivation after failure.',4),

	-- Q08
	(29,8,'A','Discuss the situation with your family and adjust your learning budget.','Shows balanced planning, communication and decision-making.',1),
	(30,8,'B','Prioritise the urgent family expense and save again later.','Shows willingness to prioritise an immediate family responsibility.',2),
	(31,8,'C','Refuse to use your savings because your career is more important.','Shows strong commitment to a personal goal but limited flexibility.',3),
	(32,8,'D','Make an immediate decision without considering the financial consequences.','May indicate insufficient evaluation before making a decision.',4),

	-- Q09
	(33,9,'A','Take initiative, distribute tasks and coordinate the work.','Shows initiative, leadership and preference for active responsibility.',1),
	(34,9,'B','Complete only the task assigned to you.','Shows focus on individual responsibilities.',2),
	(35,9,'C','Wait for someone else to take responsibility.','May indicate hesitation to take initiative without formal authority.',3),
	(36,9,'D','Ask the faculty coordinator for instructions.','Shows preference for guidance from an authorised person.',4),

	-- Q10
	(37,10,'A','Introduce yourself and gradually build professional relationships.','Shows social confidence and willingness to collaborate.',1),
	(38,10,'B','Focus only on your assigned task and avoid unnecessary interaction.','Shows preference for task-focused and independent interaction.',2),
	(39,10,'C','Wait for someone else to approach you.','May indicate a reserved approach to new social situations.',3),
	(40,10,'D','Try to become the centre of the group immediately.','Shows willingness to interact but may indicate a strong need for social visibility.',4),

	-- Q11
	(41,11,'A','Compare learning opportunities, financial requirements and long-term benefits.','Shows balanced evaluation and structured decision-making.',1),
	(42,11,'B','Choose the paid internship because financial stability is important.','Shows preference for immediate financial stability.',2),
	(43,11,'C','Choose the unpaid internship because learning is your priority.','Shows strong preference for learning and professional development.',3),
	(44,11,'D','Ask experienced people for advice before deciding.','Shows openness to external guidance and collaborative decision-making.',4),

	-- Q12
	(45,12,'A','Work independently and take responsibility for the project.','Shows preference for autonomy and independent responsibility.',1),
	(46,12,'B','Collaborate with colleagues to exchange ideas.','Shows preference for teamwork and shared learning.',2),
	(47,12,'C','Ask the manager for detailed instructions before starting.','Shows preference for structured guidance and clarity.',3),
	(48,12,'D','Divide the work among colleagues and coordinate the tasks.','Shows preference for delegation and collaborative coordination.',4),

	-- Q13
	(49,13,'A','Discuss the matter privately with the colleague and encourage proper recognition.','Shows direct communication and preference for resolving issues privately.',1),
	(50,13,'B','Support the affected person and help raise the concern appropriately.','Shows empathy, fairness and constructive action.',2),
	(51,13,'C','Ignore the situation to avoid conflict.','Shows preference for avoiding confrontation.',3),
	(52,13,'D','Publicly confront the colleague immediately.','Shows willingness to challenge unfair behaviour but may involve an impulsive approach.',4),

	-- Q14
	(53,14,'A','Stay calm, investigate the problem and suggest a backup demonstration.','Shows emotional control, problem-solving and initiative.',1),
	(54,14,'B','Ask a technically experienced teammate to handle the issue.','Shows willingness to seek help and use available expertise.',2),
	(55,14,'C','Explain the problem to the evaluators and request more time.','Shows transparent communication and practical judgement.',3),
	(56,14,'D','Become nervous and wait for someone else to take action.','May indicate difficulty responding independently during a crisis.',4),

	-- Q15
	(57,15,'A','Discuss priorities with your manager and negotiate a realistic schedule.','Shows communication, planning and balanced responsibility.',1),
	(58,15,'B','Temporarily adjust your personal schedule to complete the project.','Shows flexibility and willingness to accommodate professional responsibilities.',2),
	(59,15,'C','Refuse extra work because personal commitments always come first.','Shows a clear personal boundary and preference for protecting personal time.',3),
	(60,15,'D','Accept everything and manage both without informing anyone of difficulties.','Shows willingness to take on responsibilities but may involve unrealistic workload management.',4);


-- =====================================================================
-- END OF FINAL PSYCHOMETRIC ASSESSMENT MODULE
-- =====================================================================
