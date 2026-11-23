#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_NAME="studentiq_app"
DB_USER="studentiq_app"
DB_HOST="127.0.0.1"
DB_PORT="3306"

fail() { echo "ERROR: $*" >&2; exit 1; }
command -v sudo >/dev/null || fail "sudo is required."
command -v python3 >/dev/null || fail "Install Python 3.11 or newer first."
command -v node >/dev/null || fail "Install Node.js 20.19+ or 22.12+ first."
command -v npm >/dev/null || fail "npm is required."

python3 - <<'PY' || exit 1
import sys
if sys.version_info < (3, 11):
    raise SystemExit("StudentIQ requires Python 3.11 or newer.")
PY
node - <<'JS' || fail "Vite 7 needs Node.js 20.19+ or 22.12+."
const [major, minor] = process.versions.node.split(".").map(Number);
const supported = major > 22 || (major === 22 && minor >= 12) ||
  (major === 20 && minor >= 19);
if (!supported) process.exit(1);
JS

if ! command -v mysql >/dev/null || ! systemctl cat mysql.service >/dev/null 2>&1; then
  echo "Installing Ubuntu MySQL Server..."
  sudo apt-get update
  sudo apt-get install -y mysql-server
fi

sudo systemctl enable --now mysql
sudo systemctl is-active --quiet mysql || fail "MySQL service did not start."

sudo apt-get install -y python3-venv openssl curl

echo "Checking for an unversioned schema in $DB_NAME before setup changes..."
DB_EXISTS="$(sudo mysql --batch --skip-column-names -e \
  "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='$DB_NAME'")"
if [[ "$DB_EXISTS" == "1" ]]; then
  HAS_MIGRATION_HISTORY="$(sudo mysql --batch --skip-column-names -e \
    "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='alembic_version'")"
  APPLICATION_TABLES="$(sudo mysql --batch --skip-column-names -e \
    "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DB_NAME' AND (TABLE_NAME IN ('users','student_profiles','academic_records','study_sessions','skill_entries','study_goals','assessments','questions','assessment_attempts','predictions','reports','revoked_tokens') OR TABLE_NAME REGEXP '^(tech_|beh_|psy_)')")"
  if [[ "$HAS_MIGRATION_HISTORY" == "0" && "$APPLICATION_TABLES" != "0" ]]; then
    fail "$DB_NAME already contains StudentIQ tables without Alembic history. No database or application credentials were changed; review the schema and migration plan first."
  fi
fi

DB_PASSWORD="$(openssl rand -hex 24)"
JWT_SECRET="$(openssl rand -hex 48)"
echo "Creating database and least-privilege application account..."
sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'$DB_HOST' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'$DB_HOST' IDENTIFIED BY '$DB_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON \`$DB_NAME\`.* TO '$DB_USER'@'$DB_HOST';
FLUSH PRIVILEGES;
SQL

if [[ -f backend/.env ]]; then
  cp backend/.env "backend/.env.backup.$(date +%Y%m%d%H%M%S)"
fi
cat > backend/.env <<ENV
JWT_SECRET_KEY=$JWT_SECRET
DATABASE_URL=mysql+pymysql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?charset=utf8mb4
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
MODEL_PATH=backend/artifacts/studentiq_model.joblib
JWT_AUTH_MODE=bearer
ENV
chmod 600 backend/.env

mkdir -p .venv
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r backend/requirements.txt
npm install

echo "Checking whether this database needs safe migration adoption..."
.venv/bin/python - <<'PY'
from pathlib import Path
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect

load_dotenv(Path("backend/.env"))
engine = create_engine(os.environ["DATABASE_URL"])
with engine.connect() as connection:
    tables = set(inspect(connection).get_table_names())
application_tables = {
    "users", "student_profiles", "academic_records", "study_sessions",
    "skill_entries", "study_goals", "assessments", "questions",
    "assessment_attempts", "predictions", "reports", "revoked_tokens",
}
has_studentiq_tables = bool(tables & application_tables) or any(
    name.startswith(("tech_", "beh_", "psy_")) for name in tables
)
if "alembic_version" not in tables and has_studentiq_tables:
    raise SystemExit(
        "An existing StudentIQ schema has no migration history. Back it up, "
        "obtain approval for a reviewed migration plan, and use a separate "
        "compatible database; refusing to alter it."
    )
engine.dispose()
PY

echo "Applying reviewed StudentIQ database migrations..."
.venv/bin/flask --app backend.app db upgrade

.venv/bin/python - <<'PY'
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect
import os

load_dotenv(Path("backend/.env"))
engine = create_engine(os.environ["DATABASE_URL"])
required = {"users", "student_profiles", "academic_records"}
with engine.connect() as connection:
    missing = required - set(inspect(connection).get_table_names())
if missing:
    raise SystemExit(f"Base schema is incomplete after migration: {sorted(missing)}")
print("Base schema ready:", ", ".join(sorted(required)))
engine.dispose()
PY

MYSQL_CNF="$(mktemp)"
chmod 600 "$MYSQL_CNF"
trap 'rm -f "$MYSQL_CNF"' EXIT
cat > "$MYSQL_CNF" <<CNF
[client]
user=$DB_USER
password=$DB_PASSWORD
host=$DB_HOST
port=$DB_PORT
protocol=tcp
default-character-set=utf8mb4
CNF

echo "Importing technical, behavioural and psychometric assessment banks..."
for sql_file in \
  database/mysql/technical_assessment.sql \
  database/mysql/behavioural_assessment.sql \
  database/mysql/psychometric_assessment.sql; do
  [[ -f "$sql_file" ]] || fail "Missing SQL import: $sql_file"
  mysql --defaults-extra-file="$MYSQL_CNF" "$DB_NAME" < "$sql_file"
  echo "  Imported $sql_file"
done

echo "Checking imported question counts..."
mysql --defaults-extra-file="$MYSQL_CNF" --batch --skip-column-names "$DB_NAME" <<'SQL'
SELECT CONCAT('technical questions: ', COUNT(*)) FROM tech_questions;
SELECT CONCAT('behavioural questions: ', COUNT(*)) FROM beh_questions;
SELECT CONCAT('psychometric questions: ', COUNT(*)) FROM psy_questions;
SQL

cat > .env.local <<'ENV'
VITE_API_URL=http://127.0.0.1:5000/api
ENV

echo
echo "StudentIQ local setup is ready."
echo "MySQL: $DB_HOST:$DB_PORT / $DB_NAME"
echo "Workbench: connect to $DB_HOST on port $DB_PORT."
echo "Database files are managed by MySQL under its configured data directory."
echo "The supplied ML pickle is not activated until its training feature formulas and target labels are verified."

if [[ "${SKIP_ADMIN_SETUP:-0}" != "1" ]]; then
  read -r -p "Create the first StudentIQ administrator now? [Y/n] " answer
  if [[ ! "$answer" =~ ^[Nn]$ ]]; then
    .venv/bin/flask --app backend.app create-admin
  fi
fi

echo
echo "Start the application with: bash scripts/start_dev.sh"
