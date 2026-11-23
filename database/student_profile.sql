CREATE TABLE student_profiles (

    profile_id INT AUTO_INCREMENT PRIMARY KEY,

    -- User Relationship
    user_id INT NOT NULL UNIQUE,

    -- Personal Information
    full_name VARCHAR(150) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    phone VARCHAR(20),
    profile_image VARCHAR(500),

    -- Educational Information
    college_name VARCHAR(200),
    department VARCHAR(150),
    degree VARCHAR(100),
    specialization VARCHAR(150),

    enrollment_number VARCHAR(100),

    admission_year YEAR,
    current_year TINYINT,
    current_semester TINYINT,
    graduation_year YEAR,

    -- Location Information
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(10),

    -- Additional Information
    bio TEXT,

    profile_completion TINYINT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Key
    CONSTRAINT fk_student_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    -- Validation
    CONSTRAINT chk_profile_completion
        CHECK (profile_completion BETWEEN 0 AND 100),

    CONSTRAINT chk_current_semester
        CHECK (current_semester IS NULL OR
               current_semester BETWEEN 1 AND 12),

    CONSTRAINT chk_current_year
        CHECK (current_year IS NULL OR
               current_year BETWEEN 1 AND 10)

);