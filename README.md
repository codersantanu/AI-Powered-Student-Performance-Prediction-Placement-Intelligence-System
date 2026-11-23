# StudentIQ

A student academic analytics and placement-readiness application built with React, TypeScript, Vite, Tailwind CSS and a Flask API.

## Architecture: local MySQL on Ubuntu

This project follows the local client/server layout:

```text
Browser (React/Vite :5173)
        |
        | HTTP / JSON
        v
Flask API (:5000)
        |
        | MySQL protocol / TCP
        v
MySQL Server (mysqld :3306)
        |
        v
MySQL data directory (Ubuntu default: /var/lib/mysql/)
```

- MySQL Workbench is the database client. It is not the database server.
- MySQL Server runs as the Ubuntu `mysql.service` background service.
- Flask connects to `127.0.0.1:3306` using PyMySQL.
- React never connects directly to MySQL; browser clients must only call the Flask API.
- The database engine manages its storage files under its configured data directory. Do not edit files in `/var/lib/mysql/` manually.

## One-command Ubuntu setup (recommended)

From the repository root on Ubuntu, run:

```bash
bash scripts/setup_ubuntu.sh
```

The setup script installs/starts MySQL Server if needed, creates the `Student_Performance_Prediction` database and a dedicated application account, generates local secrets, creates a Python virtual environment, installs backend/frontend dependencies, creates the Flask base tables, and imports all three safe assessment SQL files. It then offers to create your first administrator account.

The script is designed for a fresh local StudentIQ setup. It backs up an existing `backend/.env` before writing a new one. It does **not** drop the database or its tables. The assessment imports use `CREATE TABLE IF NOT EXISTS` and `INSERT IGNORE` to preserve existing rows.

Start both development servers:

```bash
bash scripts/start_dev.sh
```

Open `http://127.0.0.1:5173`. Flask health is available at `http://127.0.0.1:5000/api/health`. To stop the services, press Ctrl+C in that terminal.

### MySQL Workbench connection

```text
Connection method: Standard TCP/IP
Hostname:          127.0.0.1
Port:              3306
Username:          studentiq_app
```

Use the generated password stored in the private `backend/.env` file. Do not commit that file or share its contents. Workbench is only the database client; MySQL Server continues running as Ubuntu's `mysql.service`.

## Useful MySQL checks

```bash
sudo systemctl status mysql
sudo systemctl start mysql
sudo systemctl restart mysql
sudo ss -ltnp | grep 3306
```

In Workbench or the MySQL CLI:

```sql
SHOW DATABASES;
USE Student_Performance_Prediction;
SHOW TABLES;
SELECT COUNT(*) FROM users;
```

The native Ubuntu data directory is commonly `/var/lib/mysql/`; use SQL or Workbench to work with data, not direct file edits.

## Frontend commands

```bash
npm install
npm run dev
npx tsc --noEmit
npm run build
npm run preview
```

Preview routes are explicitly sample-only: `/student/dashboard?preview=1` and `/admin/dashboard?preview=1`. Preview data is not real student data and must not be used as model input.

## Backend and tests

- Backend dependencies: `backend/requirements.txt`
- Environment template: `backend/.env.example`
- API entry point: `backend.app`
- Run tests: `python -m pytest backend/tests -q` (the test fixture uses isolated SQLite; production uses MySQL)
- API health: `GET /api/health`

## ML model integration status

A candidate Random Forest pickle was supplied separately. Its serialized metadata indicates a scikit-learn 1.6.1 model with 17 named features. The project dependency is pinned to scikit-learn 1.6.1, but the pickle has not yet been executed or verified. Do not load pickle files from an untrusted source: unpickling can execute code.

The existing prediction API uses a different eight-feature contract. Four features in the supplied model are engineered values, and the original training notebook/script is needed to reproduce their formulas exactly. Until that feature engineering and target-label meaning are confirmed, the API must not generate a prediction by guessing formulas or reporting invented model metrics.

## Three integrated assessment types

The specialised assessment API and frontend routes are included for all three supplied question banks:

- Technical: 20 MCQs with the uploaded answer key, negative marking, performance bands and category-wise results.
- Behavioural: 15 scenarios, 8 dimensions, option interpretations and dimension score summaries.
- Psychometric: 15 scenarios, 5 dimensions, option interpretations and dimension score summaries.

Students use the three separate assessment pages. Administrators can publish/unpublish imported suites from Admin → Assessments. Correct-answer keys and dimension mappings are kept server-side and are not sent before a student submits. Behavioural and psychometric results are reflective summaries, not clinically validated tests or diagnoses.

The SQL suites must be imported after the Flask base tables are created. The quick-start script performs this in the correct order.

## Production checklist

Before exposing the site publicly: use HTTPS, secure JWT cookies/CSRF where appropriate, a non-root MySQL application user, secrets stored outside source control, backups, database migrations, rate limiting, and verified model evaluation. Behavioural/psychometric results are reflective assessments, not clinical diagnoses.
