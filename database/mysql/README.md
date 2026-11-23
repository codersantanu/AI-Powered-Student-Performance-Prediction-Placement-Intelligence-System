# StudentIQ local MySQL setup

## Local architecture

- MySQL Workbench is the database client.
- `mysqld` is the MySQL Server background process, managed by Ubuntu's `mysql.service`.
- MySQL listens locally on `127.0.0.1:3306`.
- Flask runs on `127.0.0.1:5000` and connects to MySQL through PyMySQL.
- React/Vite runs on `127.0.0.1:5173` and calls Flask over HTTP. The browser must never connect directly to MySQL.
- MySQL manages its storage files under its configured data directory (commonly `/var/lib/mysql/`). Do not edit those files manually.

## Recommended automated setup

From the repository root, run `bash scripts/setup_ubuntu.sh`. It installs/starts MySQL Server, creates the separate `studentiq_app` database and least-privilege account, installs dependencies, applies the Flask-Migrate base schema and imports all three assessment suites. Then run `bash scripts/start_dev.sh` to start Flask and React together. The script does not drop the database and refuses an unversioned StudentIQ schema before changing database credentials.

## Manual safe setup order

1. Install/start the native service: `sudo apt update && sudo apt install mysql-server && sudo systemctl enable --now mysql`.
2. Open Workbench and connect to host `127.0.0.1`, port `3306`, with an administrative account.
3. Run `00_create_database.sql`; it selects the new `studentiq_app` schema, not `Student_Performance_Prediction`.
4. Edit the password in `01_create_app_user.sql`, then run it as the administrator.
5. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` to `mysql+pymysql://studentiq_app:YOUR_PASSWORD@127.0.0.1:3306/studentiq_app?charset=utf8mb4` (URL-encode reserved characters in the password).
6. Install `backend/requirements.txt` in a Python virtual environment and apply the reviewed base schema with `.venv/bin/flask --app backend.app db upgrade`. Flask startup does not create or alter tables.
7. Run `technical_assessment.sql`, `behavioural_assessment.sql`, and `psychometric_assessment.sql` in Workbench. They require `student_profiles(id)` to exist.
8. Verify in `studentiq_app`: `SHOW TABLES;`, `SELECT COUNT(*) FROM tech_questions;`, `SELECT COUNT(*) FROM beh_questions;`, `SELECT COUNT(*) FROM psy_questions;`.

## Import safety

- These imports do not contain `DROP TABLE` statements.
- Tables use `CREATE TABLE IF NOT EXISTS`; seed rows use `INSERT IGNORE`, so re-running does not delete existing data or overwrite seed rows.
- Technical tables use `tech_` prefixes because the existing Flask ORM already has generic `assessments`, `questions`, and attempt/result tables.
- Behavioural and psychometric scripts retain their `beh_` and `psy_` table prefixes.
- The uploaded source SQL referenced `student_profiles.profile_id`; the current project model uses `student_profiles.id`. Foreign keys in these project copies target `id`.
- Back up the database and review SQL before making schema changes. The repository includes student-facing APIs for all three imported suites, with technical answer-key scoring and behavioural/psychometric dimension summaries. The administrator must publish each suite before students can start it.
- The psychometric SQL currently seeds questions and dimensions but does not provide option-to-dimension score mappings. The API refuses publication until every dimension has mappings; do not invent mappings to make the assessment appear complete.

## Legacy database comparison and migration plan

The existing `Student_Performance_Prediction` database was inspected read-only on MySQL 8.4.13. Its tables use InnoDB and `utf8mb4_0900_ai_ci`. The schema has no `alembic_version`; the application-owned user/profile/academic/attempt tables inspected currently contain zero rows. Assessment seed tables are present. This does not make the legacy schema compatible with the application.

| Area | Legacy schema | Current application schema | Compatibility |
|---|---|---|---|
| Users | `users.user_id` primary key; `email VARCHAR(150)`; nullable `password_hash VARCHAR(255)`; `role ENUM('STUDENT','ADMIN')`; `auth_provider`, `google_subject`, `is_active`, `email_verified`; unique email and Google subject | `users.id`; required `name`, `email VARCHAR(254)`, `password_hash VARCHAR(512)`, lowercase role string and `active` | Same table name, different key, required fields and account semantics. Migration must preserve Google identity/verification fields outside the current model or add a reviewed target extension. Password hashes must be format-checked; do not reset or discard them automatically. |
| Student profile | `student_profiles.profile_id`; FK `user_id -> users.user_id`; `full_name`, `college_name`, `enrollment_number VARCHAR(100)`, date/demographic/location/bio fields | `student_profiles.id`; FK `user_id -> users.id`; `name`, `college`, `student_id VARCHAR(40)`, JSON skills/interests/goals and other profile fields | Same table name and incompatible keys/columns. Enrollment values need duplicate/length checks; legacy demographic and location fields have no direct target fields and must be retained in an archive/extension. |
| Academic records | Separate `school_academic_records` and wide `college_academic_records` tables; FKs point to `student_profiles.profile_id`; college SGPA is stored in `sgpa_sem1`–`sgpa_sem8` columns | One `academic_records` row per semester, FK to `users.id`, with `academic_year`, SGPA, attendance, backlogs and JSON subjects | No direct table/row mapping. College rows require an approved semester expansion; the source has no per-semester academic-year value, so do not infer it. School board/name/year and college CGPA also need preservation outside current fields. |
| Generic assessments | `assessments` uses `BIGINT id`, `assessment_code`, `version_no`, `duration_minutes`, `is_published`; normalized `questions`, `question_options`, `question_answers` | `assessments` uses `INT id`, title/category/difficulty/duration; `questions` stores JSON options and a correct index | Same table names, different types and semantics. Do not point the ORM or Alembic at these tables. |
| Attempts/results | Legacy attempts reference `student_profiles.profile_id`, use status/attempt number and separate response/result tables | Application attempts reference `users.id`, store question IDs, answers and result JSON | Incompatible foreign keys and storage model. Preserve as legacy data until an explicit, audited conversion is designed. |
| Imported suites | Legacy technical tables are unprefixed; behavioural/psychometric attempt FKs reference `student_profiles.profile_id` | Current imports use `tech_` tables and `beh_`/`psy_` FKs to `student_profiles.id` | Re-importing these definitions into the legacy schema is unsafe. Import only into the separate migrated schema. |

The index and relationship sets also differ: legacy `student_profiles.user_id` is unique but references `users.user_id`; the current profile has unique `user_id` and `student_id` indexes referencing `users.id`. Legacy school records are unique by `(student_profile_id, exam_type)`, college records have a unique `student_profile_id`, and assessment attempts are unique by `(assessment_id, student_profile_id, attempt_number)`. The current academic-record uniqueness key is `(student_id, semester, academic_year)`; its academic records, attempts, study data, predictions and reports reference `users.id`. Legacy assessment/question indexes use `assessment_code`/`version_no`, `question_code`, category/topic and legacy IDs; those cannot be reused as the current ORM's category, user-ID, or question-bank indexes. The current imports add their own foreign keys to the new profile IDs. Retain all legacy indexes and FKs in place; build and validate the target constraints independently.

### Fresh-schema verification

The separate MySQL 8.4.13 schemas were prepared without accessing legacy tables for writes. `studentiq_app` and `studentiq_app_test` each have Alembic revision `53dc7fa208d7`, 42 tables, and 45 foreign-key constraints. The application schema has zero users, profiles and academic records; its imported banks contain 20 technical, 15 behavioural and 15 psychometric questions. Psychometric option-dimension mappings remain at zero as supplied and the API correctly prevents publishing that incomplete assessment. The live-MySQL integration test passed against `studentiq_app_test` (1 passed); the standard backend suite passed (15 passed, 1 opt-in test skipped). Test-created records remain only in the `_test` schema.

### Data-preserving migration sequence (approval required)

1. Keep `Student_Performance_Prediction` read-only. Do not stamp Alembic, alter/rename columns, disable foreign keys, or run imports there.
2. Before any approved transfer, take a timestamped, non-overwriting backup and rehearse its restore into a separate schema. Record checksums and row counts; restrict backup permissions and store it outside the repository on protected storage.
3. Create `studentiq_app`, apply the reviewed Alembic migration and safe assessment imports. Keep a separate `_test` schema for integration tests; never use the production app database as the test target.
4. After explicit approval, implement a one-way, idempotent transfer into `studentiq_app` using source read-only access. Maintain source-to-target ID crosswalks for users and profiles, validate every FK, and log any duplicate, null, oversized or unmappable value for manual resolution. Never update or delete source rows.
5. Map only fields with confirmed semantics. For example, derive profile `name` from `full_name`, but do not assume `current_year` is `academic_year`; expand semester SGPA columns only after the academic-year policy is supplied. Preserve all unrepresented source columns and historical assessment rows in an archive/extension instead of dropping them.
6. Compare per-table counts, ID crosswalks, checksums, unique constraints and FK violations. Validate authentication hash compatibility and representative profiles/records. Run API and workflow tests against the target, then obtain approval before changing the application `DATABASE_URL`.

### Backup and rollback

The following backup command uses a new timestamped filename, private permissions and shell no-clobber mode. If the filename already exists, the command fails instead of overwriting it. Run it only when an approved migration is scheduled; no backup or migration has been run against the legacy database in this phase.

```bash
set -euo pipefail
umask 077
backup_dir="$HOME/studentiq-backups"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
set -o noclobber
backup_file="$backup_dir/Student_Performance_Prediction-$(date +%Y%m%dT%H%M%S).sql"
sudo -A mysqldump --single-transaction --routines --triggers --events \
  Student_Performance_Prediction > "$backup_file"
sha256sum "$backup_file" > "$backup_file.sha256"
```

Rehearse restoration into a newly named, empty verification schema, never over the source:

```bash
restore_db="studentiq_restore_check_YYYYMMDD"
sudo -A mysql -e "CREATE DATABASE \`$restore_db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
sudo -A mysql "$restore_db" < "$backup_file"
```

For application rollback, stop the app and restore the previous `DATABASE_URL` only to a schema whose compatibility has been verified. Keep `studentiq_app` and the legacy database intact while investigating. Do not run Alembic downgrade or `DROP DATABASE`; if a new schema is faulty, leave it in place and use a separately named corrected schema after review. Restoring to the legacy schema requires separate explicit approval.

## MySQL integration tests

The standard backend tests use isolated SQLite databases. The live-MySQL workflow test is opt-in and writes uniquely named test accounts, profile/academic records, reports, assessments, and attempts, so point it only at a dedicated schema whose name ends in `_test`. On Ubuntu with MySQL root configured for socket authentication, prepare and test the dedicated schema with:

```bash
test_db_url='mysql+pymysql://root@localhost/studentiq_app_test?unix_socket=/run/mysqld/mysqld.sock&charset=utf8mb4'
sudo -A mysql -e "CREATE DATABASE IF NOT EXISTS studentiq_app_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
sudo -A env JWT_SECRET_KEY='local-test-secret-at-least-32-characters-long' \
  DATABASE_URL="$test_db_url" \
  .venv/bin/flask --app backend.app db upgrade
for sql_file in \
  database/mysql/technical_assessment.sql \
  database/mysql/behavioural_assessment.sql \
  database/mysql/psychometric_assessment.sql; do
  sudo -A mysql studentiq_app_test < "$sql_file"
done
sudo -A env PYTHONDONTWRITEBYTECODE=1 STUDENTIQ_MYSQL_TEST_URL="$test_db_url" \
  .venv/bin/python -m pytest -p no:cacheprovider backend/tests/test_mysql_integration.py -q
```

Use a unique `_test` schema for this workflow; never point it at `studentiq_app` or the legacy database. The commands do not drop or clean up tables or records. The test leaves generated records in the dedicated test schema and verifies persistence through a second Flask app instance. The standard suite can be run with `.venv/bin/python -m pytest backend/tests -q`.

## Ubuntu checks

```bash
sudo systemctl status mysql
sudo systemctl start mysql
sudo systemctl restart mysql
sudo ss -ltnp | grep 3306
```

Do not modify files directly under `/var/lib/mysql/`; use SQL/Workbench and MySQL service controls.
