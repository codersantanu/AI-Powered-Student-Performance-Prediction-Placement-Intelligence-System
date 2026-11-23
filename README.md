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

## Ubuntu setup

1. Install/start MySQL Server and open Workbench:

   ```bash
   sudo apt update
   sudo apt install mysql-server
   sudo systemctl enable --now mysql
   sudo systemctl status mysql
   ```

2. In MySQL Workbench, connect to `127.0.0.1`, port `3306`, using an administrative account. Run `database/mysql/00_create_database.sql`, then edit and run `database/mysql/01_create_app_user.sql` to create the least-privilege application user.

3. Create a Python virtual environment and install backend dependencies:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```

4. Copy `backend/.env.example` to `backend/.env`. Set a new JWT secret and the MySQL connection string:

   ```env
   DATABASE_URL=mysql+pymysql://studentiq_app:YOUR_PASSWORD@127.0.0.1:3306/Student_Performance_Prediction?charset=utf8mb4
   JWT_SECRET_KEY=YOUR_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
   CORS_ORIGINS=http://localhost:5173,http://localhost:4173
   ```

   URL-encode special characters in the database password.

5. Start Flask once so SQLAlchemy creates the app's base tables, including `users` and `student_profiles`:

   ```bash
   python -m backend.app
   ```

6. Run the assessment imports in Workbench after the base tables exist. The source SQL was adapted to the real `student_profiles.id` primary key; technical table names use the `tech_` prefix to avoid the existing generic Flask tables. Review each SQL script and back up the database before applying it.

7. In another terminal, start the frontend:

   ```bash
   npm install
   VITE_API_URL=http://localhost:5000/api npm run dev
   ```

   Open `http://localhost:5173`.

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

## Assessment integration status

The project includes the existing generic assessment API and the supplied technical, behavioural and psychometric SQL designs. The SQL imports must be applied after the base Flask tables exist. The specialised behavioural and psychometric score interpretation still needs to be connected to student-facing endpoints and the frontend before those two tests are fully live.

## Production checklist

Before exposing the site publicly: use HTTPS, secure JWT cookies/CSRF where appropriate, a non-root MySQL application user, secrets stored outside source control, backups, database migrations, rate limiting, and verified model evaluation. Behavioural/psychometric results are reflective assessments, not clinical diagnoses.
