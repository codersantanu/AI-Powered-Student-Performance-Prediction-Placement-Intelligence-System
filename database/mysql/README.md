# StudentIQ local MySQL setup

## Local architecture

- MySQL Workbench is the database client.
- `mysqld` is the MySQL Server background process, managed by Ubuntu's `mysql.service`.
- MySQL listens locally on `127.0.0.1:3306`.
- Flask runs on `127.0.0.1:5000` and connects to MySQL through PyMySQL.
- React/Vite runs on `127.0.0.1:5173` and calls Flask over HTTP. The browser must never connect directly to MySQL.
- MySQL manages its storage files under its configured data directory (commonly `/var/lib/mysql/`). Do not edit those files manually.

## Safe setup order

1. Install/start the native service: `sudo apt update && sudo apt install mysql-server && sudo systemctl enable --now mysql`.
2. Open Workbench and connect to host `127.0.0.1`, port `3306`, with an administrative account.
3. Run `00_create_database.sql`.
4. Edit the password in `01_create_app_user.sql`, then run it as the administrator.
5. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` to `mysql+pymysql://studentiq_app:YOUR_PASSWORD@127.0.0.1:3306/Student_Performance_Prediction?charset=utf8mb4` (URL-encode reserved characters in the password).
6. Install `backend/requirements.txt` in a Python virtual environment and start Flask once. SQLAlchemy creates the base application tables, including `student_profiles`.
7. Run `technical_assessment.sql`, `behavioural_assessment.sql`, and `psychometric_assessment.sql` in Workbench. They require `student_profiles(id)` to exist.
8. Verify: `SHOW TABLES;`, `SELECT COUNT(*) FROM tech_questions;`, `SELECT COUNT(*) FROM beh_questions;`, `SELECT COUNT(*) FROM psy_questions;`.

## Import safety

- These imports do not contain `DROP TABLE` statements.
- Tables use `CREATE TABLE IF NOT EXISTS`; seed rows use `INSERT IGNORE`, so re-running does not delete existing data or overwrite seed rows.
- Technical tables use `tech_` prefixes because the existing Flask ORM already has generic `assessments`, `questions`, and attempt/result tables.
- Behavioural and psychometric scripts retain their `beh_` and `psy_` table prefixes.
- The uploaded source SQL referenced `student_profiles.profile_id`; the current project model uses `student_profiles.id`. Foreign keys in these project copies target `id`.
- Back up the database and review SQL before making schema changes. The imports create and seed the custom assessment tables, but do not by themselves connect all three modules to the student-facing API.

## Ubuntu checks

```bash
sudo systemctl status mysql
sudo systemctl start mysql
sudo systemctl restart mysql
sudo ss -ltnp | grep 3306
```

Do not modify files directly under `/var/lib/mysql/`; use SQL/Workbench and MySQL service controls.
