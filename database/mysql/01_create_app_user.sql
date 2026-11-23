-- Run as a MySQL administrator after 00_create_database.sql.
-- Replace the example password with a unique strong password before execution.
CREATE USER IF NOT EXISTS 'studentiq_app'@'127.0.0.1'
  IDENTIFIED BY 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON Student_Performance_Prediction.* TO 'studentiq_app'@'127.0.0.1';
FLUSH PRIVILEGES;
