# StudentIQ — Implementation status (local MySQL branch)

## Existing project inspected

The supplied project contained React 19, TypeScript, Vite, Tailwind 4, and a landing page. No Python backend, database models, JWT service, trained ML artifact, or API configuration existed. Its landing page, brand, and visual design were retained. Account screens were extended to support real authentication when configured.

## Added frontend

- `src/App.tsx`: authentication provider, protected application routes, page titles, and section scrolling.
- `src/routes/AppRoutes.tsx`: ten student modules and five administrator modules.
- `src/context/AuthContext.tsx`: login, registration, session restoration, server-facing roles, logout, and expiry handling.
- `src/services/api.ts`: Axios, credentials, CSRF support, errors, and authenticated downloads.
- `src/services/studentService.ts`, `assessmentService.ts`, `predictionService.ts`, `adminService.ts`: typed API integrations.
- `src/components/DashboardLayout.tsx`: fixed/collapsible sidebar, mobile drawer, search, notifications from upcoming assessments, profile menus, theme toggle, and logout.
- `src/components/dashboard/Page.tsx`: reusable cards, empty/loading/error states, dialogs, tables, pagination, progress bars, and notices.
- `src/components/dashboard/Charts.tsx`: Recharts semester, subject, attendance, study-hour, distribution, comparison, assessment, and institutional charts.
- `src/components/dashboard/Statistics.tsx`: pastel statistic and prediction-summary cards.
- `src/components/dashboard/SubjectPerformance.tsx`: subject tabs, expandable mastery analysis, revision suggestions, and prediction status.
- `src/pages/student/`: Dashboard, Profile, AcademicPerformance, StudyBehaviour, Assessments, SkillsExperience, PerformancePrediction, ImprovementRecommendations, and MyReports.
- `src/pages/admin/`: AdminDashboard, StudentManagement, AcademicRecords, AssessmentManagement, and ReportsAnalytics.
- `src/hooks/useWorkspace.ts`, `useReports.ts`: authenticated data loading and report history.
- `src/data/preview.ts`, `assessments.ts`: explicitly labeled sample workspace and preview question banks.
- `src/utils/reports.ts`: browser-generated PDFs for actual fetched records or watermarked sample previews.
- `src/dashboard.css`, `src/types.ts`, `src/vite-env.d.ts`: dashboard design system, responsive layouts, dark mode, shared types, and environment definitions.

## Selected database architecture

Production/local development database is MySQL 8 on Ubuntu. The flow is Browser/React (:5173) → Flask API (:5000) → MySQL Server (`mysqld`, `127.0.0.1:3306`) → MySQL-managed storage (normally `/var/lib/mysql/`). Workbench is the database client, not the server. The frontend does not access MySQL directly.

The database name is `Student_Performance_Prediction`. Flask uses `mysql+pymysql://` and a dedicated app account. SQLite remains limited to isolated backend tests. See `database/mysql/README.md`.

## Added backend — requires deployment/configuration

All Python files are new; no existing backend was overwritten.

- `backend/__init__.py`: Flask application factory, JWT verification, database/API error handling, and blueprints.
- `backend/extensions.py`, `models.py`: Flask-SQLAlchemy and MySQL-compatible SQLAlchemy models.
- `backend/validation.py`: input validation and ownership/role checks.
- `backend/auth.py`: registration, login, session restoration, current user, and logout.
- `backend/student.py`: profile, academic records, dashboard, study-session CRUD, portfolio CRUD, goals, and semester list.
- `backend/assessments.py`, `assessment_results.py`: published assessments, protected attempts, server-side scoring, answer review, and results.
- `backend/recommendations.py`: supportive recommendations derived only from the student's stored records.
- `backend/admin.py`: admin dashboard, student management, verified academic records, assessment publication, question-bank CRUD, and prediction summaries.
- `backend/prediction.py`, `ml.py`: actual artifact loading, validated model inputs, model metadata, pass/fail estimates, and stored prediction history. No model or probabilities are fabricated.
- `backend/train_model.py`: Decision Tree and Random Forest training using a user-provided real CSV, grouped splitting support, pipelines, validation-based selection, held-out evaluation, and calibration on validation data only.
- `backend/reports.py`: eight report categories, report history, and institution/student PDF generation using the stored data.
- `backend/app.py`, `wsgi.py`, `requirements.txt`, `.env.example`: deployment entry points and dependencies.
- `backend/tests/test_api.py`: isolated SQLite tests for API behavior. SQLite is used only for tests, not as the production database.
- `compose.yaml`: optional MySQL 8.4 container profile on host port 3307; the recommended Ubuntu setup is the native `mysql.service` on port 3306.

## API endpoints implemented in source

The frontend uses `/api` by default. Set `VITE_API_URL` to the deployed Flask API root.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a student; password is hashed server-side |
| POST | `/api/auth/login` | Verify credentials and return user/JWT |
| GET/POST | `/api/auth/session` | Restore cookie or bearer session |
| GET | `/api/auth/me` | Current authenticated user |
| POST | `/api/auth/logout` | Revoke token and clear session |
| GET/PUT | `/api/student/profile` | Read/update permitted profile fields |
| GET | `/api/student/dashboard` | Owned student workspace aggregate |
| GET | `/api/student/academic-records` | Owned verified academic records |
| GET/POST | `/api/student/study-sessions` | List/create study sessions |
| PUT/DELETE | `/api/student/study-sessions/:id` | Update/delete owned session |
| GET/POST | `/api/student/skills` | List/create portfolio entries |
| PUT/DELETE | `/api/student/skills/:id` | Update/delete owned entry |
| GET/POST | `/api/student/goals` | List/create study goals |
| PUT/DELETE | `/api/student/goals/:id` | Update/delete owned goal |
| GET | `/api/student/semesters` | Available semesters |
| GET | `/api/assessments` | Published assessments |
| POST | `/api/assessments/start` | Start an attempt without exposing answer keys |
| POST | `/api/assessments/submit` | Validate and score an owned attempt |
| GET | `/api/assessments/results` | Owned submitted results |
| POST | `/api/predictions/generate` | Generate using the connected trained model |
| GET | `/api/predictions/history` | Owned prediction history |
| GET | `/api/predictions/model-metrics` | Real model metadata and held-out metrics |
| GET | `/api/student/reports` | Report catalog |
| GET | `/api/student/reports/history` | Owned report history |
| GET | `/api/student/reports/:key` | Actual report data |
| GET | `/api/student/reports/:key/download` | Authenticated student PDF |
| GET | `/api/admin/dashboard` | Institution aggregates |
| GET/POST | `/api/admin/students` | List/create students |
| GET/PUT | `/api/admin/students/:id` | View/update official identity |
| GET/POST | `/api/admin/academic-records` | List/create official records |
| PUT/DELETE | `/api/admin/academic-records/:id` | Update/delete official record |
| GET/POST | `/api/admin/assessments` | List/publish assessments |
| GET/POST | `/api/admin/questions` | List/create official questions |
| PUT/DELETE | `/api/admin/questions/:id` | Update/delete official question |
| GET | `/api/admin/predictions` | Institution prediction summaries |
| GET | `/api/admin/reports/download` | Authorized institution PDF |
| GET | `/api/health` | API health |

**Deployment status:** source integrations and backend routes are provided, but no Flask service or MySQL database is running in this frontend sandbox. The live end-to-end account flow cannot be verified without deploying those services. Preview mode does not contact or bypass real authentication.

## Run the frontend

1. Install dependencies with `npm install`.
2. Run `npm run dev`.
3. Build with `npm run build`.

Without `VITE_API_URL`, protected routes redirect to Login. Explicit sample previews are available at `/student/dashboard?preview=1` and `/admin/dashboard?preview=1`. Preview data is marked and stored only in session storage where applicable; it never feeds real ML predictions.

## Run the backend

1. Use Python 3.11+ and create a virtual environment.
2. Install `backend/requirements.txt` (includes PyMySQL and pins scikit-learn 1.6.1 for the supplied model compatibility target).
3. Install/start Ubuntu MySQL Server: `sudo apt install mysql-server && sudo systemctl enable --now mysql`.
4. In MySQL Workbench, connect to `127.0.0.1:3306`; run `database/mysql/00_create_database.sql`, then edit and run `database/mysql/01_create_app_user.sql`.
5. Copy `backend/.env.example` to `backend/.env`; set the MySQL `DATABASE_URL`, `JWT_SECRET_KEY`, and `CORS_ORIGINS`.
6. Apply the base schema with `.venv/bin/flask --app backend.app db upgrade`. Flask startup does not create or alter production tables. For a database initialized before migration tracking, follow the backup and verified-adoption steps in `README.md`.
7. Run `database/mysql/technical_assessment.sql`, `behavioural_assessment.sql`, and `psychometric_assessment.sql` in Workbench after `student_profiles` exists.
8. Start the frontend with `VITE_API_URL=http://localhost:5000/api npm run dev`.
9. Provision the first admin through the trusted CLI command `flask --app backend.app create-admin`, not a public registration role selector.

The backend defaults to bearer tokens retained in frontend memory. For stronger browser-session security, use `JWT_AUTH_MODE=cookie`, HTTPS, and the HttpOnly JWT cookie plus CSRF protection. The frontend supports both modes. Do not store passwords or JWTs in localStorage.

## Supplied ML pickle — pending feature-contract verification

A candidate `RandomForestClassifier` pickle was supplied separately. Static pickle inspection identified the following ordered model features:

`class10marks`, `class12marks`, `sem1`, `sem2`, `sem3`, `sem4`, `sem5`, `sem6`, `sem7`, `sem8`, `techtest`, `behavioraltest`, `psycotest`, `cgpa_std`, `academic_slope`, `schooling_avg`, `tech_to_behavioral_ratio`.

The recorded scikit-learn version is 1.6.1 and `backend/requirements.txt` now pins that exact version. The pickle has not been unpickled or run yet. Do not load pickle files from untrusted sources; unpickling can execute arbitrary code.

The existing prediction API still has a different eight-field input contract. The last four model features are engineered values. The exact formulas, missing-semester handling, zero-denominator handling, target class meanings, and output interpretation must come from the original training notebook or Python script. Do not guess these rules and do not expose model metrics until they are actually obtained from a verified evaluation artifact. Once the training code is available, add a small parity test comparing the web API feature vector with the feature vector used during training.

The earlier `train_model.py` is for a different eight-feature demonstration contract and is not the correct way to retrain this supplied 17-feature model.

## Test the complete flow

### Automated frontend and API checks

- `node tests/smoke.mjs` checks the landing page and its dashboard preview.
- `node tests/responsive.mjs` checks the landing preview and account-screen widths.
- `node tests/workspace.mjs` checks all student/admin preview routes, five screen widths, subject tabs, profile editing, study-session and portfolio CRUD, assessments, goals, report downloads, mobile drawer, and theme switching.
- `PYTHONPATH=/path/to/backend/deps python -m pytest backend/tests -q` checks the Flask API in an isolated test database.
- Start Vite with `VITE_API_URL=http://localhost:5000/api` on port 5174, then run `node tests/auth-flow.mjs`. It mocks the configured API to verify registration feedback, direct student/admin redirects, protected routes, and logout without contacting real services.

### Manual end-to-end test with deployed services

1. Register a new student and confirm the success message.
2. Sign in and verify `/student/dashboard` opens directly.
3. Confirm an empty workspace shows no invented academic data.
4. As an authorized admin, create verified academic records and publish a question-backed assessment.
5. As the student, refresh the dashboard and verify only that student's data appears.
6. Edit permitted profile fields, log a study session, add a portfolio entry, and submit an assessment.
7. Generate a prediction only after a real model is deployed; inspect metrics, history, and report PDFs.
8. Sign in as admin and verify `/admin/dashboard`.
9. Sign out and confirm protected routes redirect to Login.
10. Repeat with an expired/invalid token and confirm the frontend clears the session.

## Security and scope notes

- Role checks use the active database account, not frontend role selection.
- Student queries filter by authenticated user ID; ownership is checked on writes.
- Official academic records are read-only for students.
- Assessment scoring happens on the backend using the official answer key.
- Passwords are hashed with scrypt; JWTs expire and logout records revocations.
- Deployed HTTPS, secure cookies/CSRF, database backups, rate limiting, and administrator provisioning should be configured before public production use.
- Psychometric scenarios are a reflection/self-assessment demonstration, not a clinically validated instrument or diagnosis. Preview response frequencies are not presented as clinical scores.
