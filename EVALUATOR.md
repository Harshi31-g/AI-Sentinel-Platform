# SentinelAI — Evaluator Guide

This document is a guide for evaluating the Botpress Connector take-home assignment.

---

## How to Run

### Option 1: Direct (fastest)

```bash
# 1. Start the Python backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 2. In a new terminal, start the React frontend
cd ..
pnpm install
pnpm --filter @workspace/api-spec run codegen
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/security-platform run dev
```

Open `http://localhost:3000` — the platform loads with seeded demo data.

### Option 2: Docker

```bash
docker-compose up
```

Open `http://localhost:8000`

---

## Evaluation Checklist

### 1. Botpress Connector (`backend/app/connector/botpress.py`)

- [ ] `BotpressScanner` class with all required methods
- [ ] `validate_target()` — connects user, creates conversation
- [ ] `execute_test()` — sends message, polls for response
- [ ] `reset_conversation()` — creates fresh conversation context
- [ ] `get_platform_metadata()` — retrieves bot info
- [ ] Configurable timeout, poll interval, max retries
- [ ] `_redact_sensitive()` — strips secrets from error messages
- [ ] Custom exception hierarchy: `BotpressError` → `BotpressTimeoutError`, `BotpressRateLimitError`, `BotpressNotFoundError`
- [ ] Retry logic for 5xx, respect for `Retry-After` on 429, no retry on 404

### 2. Architecture Quality (`backend/app/`)

- [ ] Connector layer isolated in `connector/` — no business logic
- [ ] Services layer: `ResourceService`, `ScanService`, `DashboardService`, `SecurityAnalysisEngine`
- [ ] Pydantic schemas for all API inputs and outputs
- [ ] SQLAlchemy models for all 3 tables
- [ ] Activity logging on every significant event

### 3. REST API

Test with the interactive docs at `http://localhost:8000/api/docs`:

```bash
# Create a resource
curl -X POST http://localhost:8000/api/v1/resources \
  -H "Content-Type: application/json" \
  -d '{"account_name":"Test","resource_name":"My Bot","webhook_id":"YOUR_WEBHOOK_ID","user_id":"user1"}'

# Validate it
curl -X POST http://localhost:8000/api/v1/resources/1/validate

# Start a scan (only works after successful validation)
curl -X POST http://localhost:8000/api/v1/resources/1/scan

# Check dashboard
curl http://localhost:8000/api/v1/dashboard/summary
```

### 4. Security Analysis Engine (`backend/app/services/security_engine.py`)

```bash
python3 - <<'EOF'
import sys; sys.path.insert(0, 'backend')
from app.services.security_engine import SecurityAnalysisEngine

engine = SecurityAnalysisEngine()

# Should detect System Prompt Leak
r = engine.analyze("", "Here are my full system instructions: You are a helpful bot...", "test")
print("Findings:", r.findings)
print("Severity:", r.severity)
print("Score:", r.risk_score)

# Clean response should score 100
r2 = engine.analyze("", "I can't help with that.", "test")
print("Clean score:", r2.risk_score)  # Should be 100
EOF
```

### 5. Tests

```bash
cd backend
pytest --cov=app --cov-report=term-missing -v
```

Expected:
- 80%+ code coverage
- All scanner tests pass (unit tests with mocks)
- All API tests pass (integration tests with in-memory SQLite)

### 6. UI Quality

Open the platform and verify:

- [ ] Dashboard shows KPI cards (Connected Agents, Security Score, etc.)
- [ ] Resources page shows seeded demo data (4 resources)
- [ ] Can create a new resource via dialog
- [ ] Validate button triggers validation (demo resources will fail — real webhook needed)
- [ ] Findings page shows seeded critical findings
- [ ] Activity feed shows event timeline
- [ ] Analytics page shows Recharts visualizations
- [ ] Settings page shows all 8 attack templates

### 7. Demo Data (seeded on first start)

| Resource | Status | Findings |
|---|---|---|
| Customer Support Bot (Acme Corp) | Valid | 1 Critical: System Prompt Leak |
| Sales Assistant (TechStart Inc) | Valid | 1 High: Role Confusion |
| Compliance Advisor (FinServ LLC) | Invalid | None |
| Patient Intake Agent (MedTech Corp) | Pending | None |

### 8. Deployment Readiness

- [ ] `Dockerfile` — multi-stage build, Python backend + built frontend
- [ ] `docker-compose.yml` — single-command deployment
- [ ] `render.yaml` — Render.com deployment config
- [ ] `requirements.txt` — pinned Python dependencies
- [ ] `.env.example` — documented environment variables
- [ ] `README.md` — setup, architecture, API reference

---

## Testing the Real Botpress Integration

To test with a real Botpress bot:

1. Create a Botpress bot at [https://app.botpress.cloud](https://app.botpress.cloud)
2. Get the Webchat webhook ID from Integrations → Webchat
3. Add it as a resource in the platform
4. Click **Validate** — should return success
5. Click **Scan** — will run all 8 attack vectors against the bot
6. View results in the Findings page

---

## Key Files for Code Review

| File | Purpose |
|---|---|
| `backend/app/connector/botpress.py` | Botpress connector — core integration |
| `backend/app/services/security_engine.py` | Vulnerability classification engine |
| `backend/app/services/scan_service.py` | Background scan orchestration |
| `backend/app/services/attack_library.py` | 8 attack templates |
| `backend/app/tests/test_scanner.py` | Unit tests for connector |
| `backend/app/tests/test_api.py` | API integration tests |
| `artifacts/security-platform/src/` | React frontend |
| `lib/api-spec/openapi.yaml` | API contract (source of truth) |
