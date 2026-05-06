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

# 4. Run both servers
# Terminal 1:
cd apps/frontend && npm run dev

# Terminal 2:
cd apps/backend && uvicorn main:app --reload --port 8000
```

Frontend runs at: http://localhost:3000
Backend runs at:  http://localhost:8000
API docs at:      http://localhost:8000/docs
