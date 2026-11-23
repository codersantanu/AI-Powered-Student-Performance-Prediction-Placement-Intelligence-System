# StudentIQ — Complete workspace implementation

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

## Added backend — requires deployment/configuration

All Python files are new; no existing backend was overwritten.

- `backend/__init__.py`: Flask application factory, JWT verification, database/API error handling, and blueprints.
- `backend/extensions.py`, `models.py`: Flask-SQLAlchemy and PostgreSQL-oriented models.
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
- `compose.yaml`: local PostgreSQL 17 service. A local database password must be supplied through the environment.

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

**Deployment status:** source integrations and backend routes are provided, but no Flask service or PostgreSQL database is running in this frontend sandbox. The live end-to-end account flow cannot be verified without deploying those services. Preview mode does not contact or bypass real authentication.

## Run the frontend

1. Install dependencies with `npm install`.
2. Run `npm run dev`.
3. Build with `npm run build`.

Without `VITE_API_URL`, protected routes redirect to Login. Explicit sample previews are available at `/student/dashboard?preview=1` and `/admin/dashboard?preview=1`. Preview data is marked and stored only in session storage where applicable; it never feeds real ML predictions.

## Run the backend

1. Use Python 3.11+ and create a virtual environment.
2. Install `backend/requirements.txt`.
3. Set `DATABASE_URL`, a strong `JWT_SECRET_KEY`, and allowed `CORS_ORIGINS` in the backend environment. See `backend/.env.example`.
4. Start PostgreSQL, for example with `docker compose up -d db` after setting `POSTGRES_PASSWORD`.
5. Run `flask --app backend.wsgi db upgrade` after generating/reviewing the initial migration. The application can create tables for a fresh database, but production schema changes should use reviewed migrations.
6. Start `python -m backend.app`.
7. Set the frontend `VITE_API_URL=http://localhost:5000/api` and restart Vite.
8. Create the first admin using a trusted database/bootstrap process, not a public registration role selector.

The backend defaults to bearer tokens retained in frontend memory. For stronger browser-session security, use `JWT_AUTH_MODE=cookie`, HTTPS, and the HttpOnly JWT cookie plus CSRF protection. The frontend supports both modes. Do not store passwords or JWTs in localStorage.

## Train a real model

No dataset or trained model was supplied. Do not invent one.

1. Prepare a consented real CSV with `previousMarks`, `currentMarks`, `sgpa`, `cgpa`, `attendance`, `studyHours`, `backlogs`, `assessmentScore`, and verified binary `next_semester_pass` labels.
2. Include `student_id` to prevent student leakage across training/validation/test partitions.
3. Run `python -m backend.train_model.py /path/to/real.csv artifacts/studentiq_model.joblib`.
4. Set `MODEL_PATH` to that artifact and restart the backend.
5. Inspect the actual held-out metrics and dataset provenance in the prediction module.

The program refuses insufficient or invalid datasets. It does not manufacture synthetic students or fake metrics. Predictions concern the defined next-semester pass target; they are supportive estimates, not judgments of ability.

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
