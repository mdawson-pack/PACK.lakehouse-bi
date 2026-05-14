from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import anthropic

from config import settings, missing_lakehouse_settings
from models import CRMData, FinanceData, OpsData, AgentRequest, AgentResponse
from mock_data import get_crm_data, get_finance_data, get_ops_data
from lakehouse import get_crm_data_from_lakehouse
from agent_prompts import SYSTEM_PROMPTS
from db import safe_run_sql

# ── Tool definition ───────────────────────────────────────────────────────────

RUN_SQL_TOOL = {
    "name": "run_sql",
    "description": (
        "Execute a read-only SELECT query against the Fabric Lakehouse. "
        "Table: [dbo].[Revenue Opportunity]. "
        "Columns: id, name, account, stage, status, value, closeDate, owner. "
        "Always use TOP N. Never use INSERT, UPDATE, DELETE, DROP, or any DDL."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "A read-only SELECT statement to run against the Lakehouse.",
            }
        },
        "required": ["query"],
    },
}

_MAX_TOOL_ITERATIONS = 5

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
        missing = missing_lakehouse_settings()
        if missing:
            raise HTTPException(503, f"Lakehouse configuration missing: {', '.join(missing)}")
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

    CRM + lakehouse mode: uses Anthropic tool use so Claude writes targeted SQL
    queries rather than receiving a full row dump. Aggregates (KPIs, pipeline,
    rep win rates) are still pre-fetched as a lightweight context snapshot.

    All other modules / mock mode: original data-dump behaviour unchanged.
    """
    if not settings.anthropic_api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY not set in backend .env")

    use_tool_loop = (req.module == "crm" and settings.data_mode == "lakehouse")

    # ── Build module data context ─────────────────────────────────────────────
    try:
        if req.module == "crm":
            if settings.data_mode == "lakehouse":
                crm = get_crm_data_from_lakehouse()
                # Aggregates only — drop opportunities to keep token cost low.
                # Claude will query for deal-level detail via run_sql as needed.
                module_data = {
                    "kpis": [k.model_dump() for k in crm.kpis],
                    "pipeline": [p.model_dump() for p in crm.pipeline],
                    "repWinRates": [r.model_dump() for r in crm.repWinRates],
                }
            else:
                module_data = get_crm_data().model_dump()
        elif req.module == "finance":
            module_data = get_finance_data().model_dump()
        else:
            module_data = get_ops_data().model_dump()
    except Exception:
        module_data = {}

    # ── Assemble system prompt ────────────────────────────────────────────────
    system = SYSTEM_PROMPTS[req.module]
    system += f"""

---
CURRENT DASHBOARD CONTEXT (live data snapshot):
Filters active: {req.context}

Aggregate snapshot (use run_sql for deal-level detail):
{module_data}

Use the above numbers when answering. Do not hallucinate figures not present here.
"""

    messages = [
        {"role": m.role, "content": m.content}
        for m in req.history
    ]
    messages.append({"role": "user", "content": req.message})

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # ── Tool-use loop (CRM + lakehouse only) ─────────────────────────────────
    if use_tool_loop:
        queries_run: list[str] = []
        reply = "I wasn't able to produce an answer — please try rephrasing."

        for _ in range(_MAX_TOOL_ITERATIONS):
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=system,
                tools=[RUN_SQL_TOOL],
                tool_choice={"type": "auto"},
                messages=messages,
            )

            if response.stop_reason == "end_turn":
                text_blocks = [b for b in response.content if b.type == "text"]
                if text_blocks:
                    reply = text_blocks[0].text
                break

            if response.stop_reason == "tool_use":
                # Append Claude's full response (may contain text + tool_use blocks)
                messages.append({"role": "assistant", "content": response.content})

                tool_results = []
                for block in response.content:
                    if block.type != "tool_use":
                        continue
                    query = block.input.get("query", "")
                    queries_run.append(query)
                    try:
                        rows = safe_run_sql(query)
                        result_content = str(rows[:100])  # cap at 100 rows in the result
                    except Exception as exc:
                        result_content = f"Error executing query: {exc}"

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_content,
                    })

                messages.append({"role": "user", "content": tool_results})
                continue

            # Unexpected stop reason — bail out
            break

        return AgentResponse(reply=reply, queries_run=queries_run)

    # ── Simple single-shot path (mock mode or non-CRM modules) ───────────────
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
