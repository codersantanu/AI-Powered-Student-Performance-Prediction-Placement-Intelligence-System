# StudentIQ

A responsive student academic analytics application built with React, TypeScript, Vite, Tailwind CSS, React Router DOM, Recharts, Lucide, and Axios.

The landing page is preserved. The application now includes ten student dashboard modules, five administrator modules, frontend-only account screens, and an additive Flask backend in `backend/`.

## Frontend

- Install dependencies: `npm install`
- Start development: `npm run dev`
- Check types: `npx tsc --noEmit`
- Build production: `npm run build`
- Preview production: `npm run preview`

Without `VITE_API_URL`, protected routes redirect to Login. Explicit sample previews are available at `/student/dashboard?preview=1` and `/admin/dashboard?preview=1`. Preview records are clearly labeled and do not represent real accounts or ML predictions.

## Backend

The Flask API is provided in `backend/`; it supports SQLite for local development and PostgreSQL for production, with JWT authentication.

See `IMPLEMENTATION.md` for:

- Created and modified files
- API endpoints and integration status
- PostgreSQL setup and environment variables
- Secure administrator provisioning
- Real-dataset model training
- Deployment requirements and end-to-end testing instructions

No trained model or real dataset was supplied. Predictions remain unavailable until a model trained on a real consented dataset is connected. No synthetic model metrics or fabricated student records are presented as real.

### Run the full stack locally (Windows PowerShell)

For local development, the API can use SQLite; PostgreSQL remains the production database. Install the backend requirements once:

```powershell
py -3.14 -m pip install -r backend\requirements.txt
```

In one terminal, start the API with a local database and a newly generated JWT secret:

```powershell
$env:DATABASE_URL = "sqlite:///studentiq.db"
$env:JWT_SECRET_KEY = py -3.14 -c "import secrets; print(secrets.token_hex(32))"
$env:CORS_ORIGINS = "http://127.0.0.1:5173"
py -3.14 -m flask --app backend.wsgi run --host 127.0.0.1 --port 5000
```

In a second terminal, point Vite at the API and start the frontend:

```powershell
$env:VITE_API_URL = "http://127.0.0.1:5000/api"
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. The SQLite database is created automatically. Register a student account to use the student workspace; no administrator account is created automatically.

## Browser tests

Install the browser with `npx playwright install --with-deps chromium`.

- `npx playwright test` — starts Vite automatically and runs all browser suites.
- `npx tsc --noEmit` — checks frontend types.
- `PYTHONPATH=/path/to/backend/deps python -m pytest backend/tests -q` — runs isolated Flask tests.

For mocked authentication-flow tests, start Vite with `VITE_API_URL=http://localhost:5000/api` on port 5174, then run `TEST_URL=http://localhost:5174 npx playwright test tests/auth-flow.mjs`.

The tests cover responsive layouts, navigation, dashboard tabs, profile editing, study-session and portfolio CRUD, assessments, goals, PDF downloads, mobile drawer behavior, theme switching, registration feedback, mocked login redirects, and logout. Mocked tests do not prove live backend connectivity.
