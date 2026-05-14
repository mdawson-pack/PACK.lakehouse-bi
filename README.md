# Lakehouse BI

Production reporting app with embedded AI agents, connected to Microsoft Fabric Lakehouse.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| State | React Query, Zustand |
| Tables | TanStack Table |
| Backend | FastAPI, Python 3.12 |
| AI Agent | Anthropic Claude API (claude-sonnet-4-6) |
| Data | Microsoft Fabric Lakehouse SQL endpoint |
| Cache | Azure Redis (optional for prod) |

## Project Structure

```
lakehouse-bi/
├── apps/
│   ├── frontend/          # Next.js 14 app
│   │   ├── app/           # App Router pages
│   │   ├── components/    # Shared UI components
│   │   ├── lib/           # API clients, utilities
│   │   └── stores/        # Zustand stores
│   └── backend/           # FastAPI app
│       ├── routers/        # API route modules
│       ├── agents/         # Agent definitions per module
│       ├── db/             # Lakehouse query engine
│       └── models/         # Pydantic response models
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- Anthropic API key
- ODBC Driver 18 for SQL Server (required for lakehouse mode)

### Setup

```bash
# 1. Clone and install frontend deps
npm install
cd apps/frontend && npm install

# 2. Install backend deps
cd apps/backend
pip install -r requirements.txt

# 3. Configure environment variables
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/backend/.env.example apps/backend/.env

# Edit both .env files with your keys

# Backend lakehouse mode (CRM)
# DATA_MODE=lakehouse
# FABRIC_SQL_ENDPOINT=<your-server>.datawarehouse.fabric.microsoft.com
# FABRIC_DATABASE=<your_database_name>
# FABRIC_CLIENT_ID=<service_principal_client_id>
# FABRIC_CLIENT_SECRET=<service_principal_client_secret>
# FABRIC_TENANT_ID=<tenant_id>

# 4. Run both servers
# Terminal 1:
cd apps/frontend && npm run dev

# Terminal 2:
cd apps/backend && uvicorn main:app --reload --port 8000
```

Frontend runs at: http://localhost:3000
Backend runs at:  http://localhost:8000
API docs at:      http://localhost:8000/docs

## CRM Lakehouse Source

When `DATA_MODE=lakehouse`, the CRM endpoint queries:

- Table: `[dbo].[Revenue Opportunity]`
- Endpoint: `GET /api/crm`

The backend maps the source fields to the CRM contract used by the frontend:

- `Opportunity Name` -> `name`
- `Customer Name` (fallback `Company Name`) -> `account`
- `Stage` (fallback `Status`) -> `stage`
- `Estimated Revenue` (fallback `Actual Value`, `Price Submitted`) -> `value`
- `Estimated Close Date` (fallback `Actual Close Date`) -> `closeDate`
- `Owner` -> `owner`

If no explicit ID column exists, a stable deterministic ID is generated per opportunity.

## Quick Verification

After starting backend in lakehouse mode:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/crm
```

If required lakehouse settings are missing, `/api/crm` returns a 503 with the missing setting names.
