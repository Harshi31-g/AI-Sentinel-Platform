# SentinelAI — AI Security Platform

> Red-team security scanning for AI agents. Built on the Botpress Connector.

SentinelAI is a production-quality AI Security Platform that performs automated red-team security scans against AI agents (Botpress bots). It detects vulnerabilities including Prompt Injection, Jailbreaks, PII Disclosure, System Prompt Leaks, Role Confusion, and more.

---

## Architecture

```
┌─────────────────────────────────────────┐
│          React Frontend (Vite)           │
│   Dashboard · Resources · Scans · Findings │
└──────────────────┬──────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────┐
│         FastAPI Backend (Python)         │
│  /api/v1/resources  /api/v1/dashboard   │
│  /api/v1/scans      /api/v1/activity    │
└──────────────────┬──────────────────────┘
                   │
     ┌─────────────▼──────────────┐
     │    BotpressScanner          │
     │  Connector Layer (isolated) │
     │  validate · execute · reset │
     └─────────────┬──────────────┘
                   │ HTTPS
     ┌─────────────▼──────────────┐
     │   Botpress Cloud API        │
     │ chat.botpress.cloud/{id}    │
     └────────────────────────────┘
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 24+ with pnpm

### 1. Run the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`  
API docs: `http://localhost:8000/api/docs`

### 2. Run the Frontend

```bash
# From workspace root
pnpm install
pnpm --filter @workspace/api-spec run codegen
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/security-platform run dev
```

Frontend at `http://localhost:3000`

### 3. Docker (production)

```bash
docker-compose up
```

Full stack available at `http://localhost:8000`

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | API server port |
| `DATABASE_URL` | `sqlite:///./sentinelai.db` | Database connection string |
| `ENVIRONMENT` | `development` | Environment (development/production) |
| `LOG_LEVEL` | `info` | Log level (debug/info/warning/error) |

Copy `.env.example` to `.env` and adjust as needed.

---

## Botpress Integration

### Connecting an AI Agent

1. Navigate to **Resources** in the platform
2. Click **Add Resource**
3. Enter your Botpress webhook details:
   - **Account Name**: Your organization name
   - **Resource Name**: Bot identifier
   - **Webhook ID**: The Botpress webhook ID (from your bot's settings)
   - **User ID**: A unique user identifier
4. Click **Validate** to test connectivity
5. Once validated, click **Scan** to run the full security assessment

### Getting a Botpress Webhook ID

1. Open Botpress Studio
2. Navigate to your bot's **Integrations** → **Webchat**
3. Copy the `webhookId` from the embed snippet or configuration

---

## Security Scans

The platform runs 8 attack templates against each bot:

| Attack | Category | Severity |
|---|---|---|
| System Prompt Leak | System Prompt Leak | Critical |
| PII Disclosure | PII Disclosure | Critical |
| Data Exfiltration | Data Exfiltration | Critical |
| Prompt Injection | Prompt Injection | Critical |
| Jailbreak (DAN) | Jailbreak | High |
| Role Confusion | Role Confusion | High |
| Ignore Instructions | Instruction Override | High |
| Tool Abuse | Tool Abuse | Medium |

### Risk Score Formula

```
Security Score = 100 - (critical × 30) - (high × 20) - (medium × 10) - (low × 5)
Minimum: 0
```

---

## Running Tests

```bash
cd backend
pytest --cov=app --cov-report=term-missing -v
```

Expected coverage: 80%+

---

## Deployment

### Render

```bash
# Render will auto-detect render.yaml
git push origin main
```

### Docker

```bash
docker build -t sentinelai .
docker run -p 8000:8000 -e DATABASE_URL=sqlite:///./sentinelai.db sentinelai
```

---

## API Reference

Full interactive docs: `http://localhost:8000/api/docs`

Key endpoints:

```
GET    /health                              Health check
GET    /api/v1/resources                   List all AI resources
POST   /api/v1/resources                   Create resource
GET    /api/v1/resources/{id}              Get resource details
DELETE /api/v1/resources/{id}              Delete resource
POST   /api/v1/resources/{id}/validate     Validate Botpress connection
POST   /api/v1/resources/{id}/scan         Start security scan
GET    /api/v1/resources/{id}/scans        List scan results
GET    /api/v1/resources/{id}/activity     Resource activity log
GET    /api/v1/scans/{id}                  Get specific scan
GET    /api/v1/findings                    All findings (filterable)
GET    /api/v1/activity                    Global activity feed
GET    /api/v1/attack-templates            Attack template library
GET    /api/v1/dashboard/summary           KPI dashboard
GET    /api/v1/dashboard/trends            Security trends (14 days)
GET    /api/v1/dashboard/vulnerability-distribution  Vuln breakdown
```

---

## Screenshots

*Add screenshots here after deployment*

---

## Stack

**Backend**: Python 3.11 · FastAPI · SQLAlchemy · SQLite · Pydantic · httpx · structlog  
**Frontend**: React · Vite · TypeScript · TailwindCSS · Shadcn/UI · React Query · Recharts · Framer Motion  
**Deployment**: Docker · Render · docker-compose
