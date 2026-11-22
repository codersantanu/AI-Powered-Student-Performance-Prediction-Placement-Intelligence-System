CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,

    -- Account information
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,

    -- Authorization
    role ENUM('STUDENT', 'ADMIN')
        NOT NULL DEFAULT 'STUDENT',

    -- Authentication
    auth_provider ENUM('LOCAL', 'GOOGLE')
        NOT NULL DEFAULT 'LOCAL',

    google_subject VARCHAR(255) NULL UNIQUE,

    -- Account status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- Authentication validation
    CONSTRAINT chk_authentication
    CHECK (
        (
            auth_provider = 'LOCAL'
            AND password_hash IS NOT NULL
            AND google_subject IS NULL
        )
        OR
        (
            auth_provider = 'GOOGLE'
            AND password_hash IS NULL
            AND google_subject IS NOT NULL
        )
    )
);