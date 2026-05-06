from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import anthropic

from config import settings
from models import CRMData, FinanceData, OpsData, AgentRequest, AgentResponse
from mock_data import get_crm_data, get_finance_data, get_ops_data
from lakehouse import get_crm_data_from_lakehouse
from agent_prompts import SYSTEM_PROMPTS

app = FastAPI(title="Lakehouse BI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Data routes ───────────────────────────────────────────────────────────────

@app.get("/api/crm", response_model=CRMData)
async def get_crm():
    if settings.data_mode == "lakehouse":
        try:
            return get_crm_data_from_lakehouse()
        except Exception as e:
            raise HTTPException(503, f"Lakehouse query failed: {e}")
    return get_crm_data()

@app.get("/api/finance", response_model=FinanceData)
async def get_finance():
    if settings.data_mode == "mock":
        return get_finance_data()
    raise HTTPException(503, "Lakehouse connection not yet configured.")

@app.get("/api/ops", response_model=OpsData)
async def get_ops():
    if settings.data_mode == "mock":
        return get_ops_data()
    raise HTTPException(503, "Lakehouse connection not yet configured.")

# ── Agent route ───────────────────────────────────────────────────────────────

@app.post("/api/agent", response_model=AgentResponse)
async def agent(req: AgentRequest):
    """
    Module-specialized Claude agent.
    Injects current module data as context so the agent is grounded in real numbers.
    """
    if not settings.anthropic_api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY not set in backend .env")

    try:
        if req.module == "crm":
            module_data = (get_crm_data_from_lakehouse() if settings.data_mode == "lakehouse" else get_crm_data()).model_dump()
        elif req.module == "finance":
            module_data = get_finance_data().model_dump()
        else:
            module_data = get_ops_data().model_dump()
    except Exception:
        module_data = {}

    system = SYSTEM_PROMPTS[req.module]
    system += f"""

---
CURRENT DASHBOARD CONTEXT (live data snapshot):
Filters active: {req.context}

Current module data:
{module_data}

Use the above numbers when answering. Do not hallucinate figures not present here.
"""

    messages = [
        {"role": m.role, "content": m.content}
        for m in req.history
    ]
    messages.append({"role": "user", "content": req.message})

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        messages=messages,
    )

    reply = response.content[0].text
    return AgentResponse(reply=reply)

# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "data_mode": settings.data_mode,
        "anthropic_configured": bool(settings.anthropic_api_key),
    }
