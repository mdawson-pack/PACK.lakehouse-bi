from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import anthropic
import csv
import io
import uuid
import time

from config import settings, missing_lakehouse_settings
from models import CRMData, FinanceData, OpsData, AgentRequest, AgentResponse
from mock_data import get_crm_data, get_finance_data, get_ops_data
from lakehouse import get_crm_data_from_lakehouse, get_distinct_companies_from_lakehouse, get_column_names_from_lakehouse
from agent_prompts import SYSTEM_PROMPTS
from db import safe_run_sql

# ── Tool definitions ─────────────────────────────────────────────────────────

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

EXPORT_CSV_TOOL = {
    "name": "export_csv",
    "description": (
        "Execute a read-only SELECT query and generate a one-time downloadable CSV file. "
        "Use this when the user asks to download, export, or save data as a file. "
        "Returns a download URL to include in your reply. "
        "Always use TOP N to limit rows. Never use INSERT, UPDATE, DELETE, DROP, or any DDL."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "A read-only SELECT statement whose results will be exported as CSV.",
            },
            "filename": {
                "type": "string",
                "description": "Suggested filename for the download (without .csv extension).",
            },
        },
        "required": ["query"],
    },
}

# ── In-memory CSV export store (single-use, keyed by UUID) ───────────────────
_csv_store: dict[str, tuple[str, str, float]] = {}  # id → (csv_text, filename, created_at)
_CSV_TTL = 300  # seconds (5 minutes)

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

@app.get("/api/debug/columns")
async def debug_columns():
    """Return raw column names from Revenue Opportunity table for diagnostics."""
    if settings.data_mode != "lakehouse":
        return {"mode": "mock", "columns": []}
    return {"columns": get_column_names_from_lakehouse()}

@app.get("/api/debug/won-revenue")
async def debug_won_revenue():
    """Direct SQL aggregates to confirm column values for won deals."""
    if settings.data_mode != "lakehouse":
        return {"mode": "mock"}
    from db import get_connection
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
              COUNT(*) as won_count,
              SUM([Estimated Revenue]) as sum_est_rev,
              SUM([Actual Value]) as sum_actual_val
            FROM [dbo].[Revenue Opportunity]
            WHERE [Status] = 'Won'
        """)
        row = cursor.fetchone()
        cursor.execute("SELECT DISTINCT [Status] FROM [dbo].[Revenue Opportunity]")
        statuses = [r[0] for r in cursor.fetchall()]
        return {
            "won_count": row[0],
            "sum_estimated_revenue": float(row[1]) if row[1] else 0,
            "sum_actual_value": float(row[2]) if row[2] else 0,
            "all_statuses": statuses,
        }
    finally:
        conn.close()

@app.get("/api/companies", response_model=list[str])
async def get_companies():
    if settings.data_mode == "lakehouse":
        missing = missing_lakehouse_settings()
        if missing:
            raise HTTPException(503, f"Lakehouse configuration missing: {', '.join(missing)}")
        try:
            return get_distinct_companies_from_lakehouse()
        except Exception as e:
            raise HTTPException(503, f"Lakehouse query failed: {e}")
    # mock mode — return account names from mock opportunities
    return [o.account for o in get_crm_data().opportunities]


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
    companies_ctx = req.context.get("companies", "All Companies")
    company_filter_sql = ""
    if companies_ctx and companies_ctx != "All Companies":
        names = [c.strip() for c in companies_ctx.split(",") if c.strip()]
        in_list = ", ".join(f"'{n}'" for n in names)
        company_filter_sql = f"WHERE [Company Name] IN ({in_list})"

    system += f"""

---
CURRENT DASHBOARD CONTEXT (live data snapshot):
Filters active: {req.context}
"""

    if company_filter_sql:
        system += f"""
ACTIVE COMPANY FILTER: The user is viewing data scoped to: {companies_ctx}
You MUST add the following clause to EVERY SQL query you write:
  {company_filter_sql}
The aggregate snapshot below covers ALL companies — ignore it for company-specific answers and use run_sql instead.
"""

    system += f"""Aggregate snapshot (use run_sql for deal-level detail):
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
                tools=[RUN_SQL_TOOL, EXPORT_CSV_TOOL],
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

                    if block.name == "export_csv":
                        try:
                            rows = safe_run_sql(query)
                            if rows:
                                buf = io.StringIO()
                                writer = csv.writer(buf)
                                # Header from first row keys if dict, else positional
                                if isinstance(rows[0], dict):
                                    writer.writerow(rows[0].keys())
                                    writer.writerows(r.values() for r in rows)
                                else:
                                    writer.writerows(rows)
                                csv_text = buf.getvalue()
                            else:
                                csv_text = "(no results)"
                            export_id = str(uuid.uuid4())
                            filename = block.input.get("filename", "export")
                            _csv_store[export_id] = (csv_text, filename, time.time())
                            base_url = settings.base_url.rstrip("/") if hasattr(settings, "base_url") and settings.base_url else "http://localhost:8001"
                            download_url = f"{base_url}/api/download/csv/{export_id}"
                            result_content = f"CSV ready. Download URL: {download_url}"
                        except Exception as exc:
                            result_content = f"Error generating CSV: {exc}"
                    else:
                        try:
                            rows = safe_run_sql(query)
                            result_content = str(rows[:100])
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

@app.get("/api/download/csv/{export_id}")
async def download_csv(export_id: str):
    """TTL-based CSV download (5 min window, survives browser prefetching)."""
    import re
    # Strip any trailing non-UUID characters (markdown artifacts from Claude output)
    clean_id = re.sub(r'[^0-9a-f\-]', '', export_id.lower())
    # Prune expired entries
    now = time.time()
    expired = [k for k, v in _csv_store.items() if now - v[2] > _CSV_TTL]
    for k in expired:
        del _csv_store[k]

    entry = _csv_store.get(clean_id)
    if not entry or now - entry[2] > _CSV_TTL:
        raise HTTPException(404, "Export not found or expired (links are valid for 5 minutes)")
    csv_text, filename, _ = entry
    safe_name = "".join(c for c in filename if c.isalnum() or c in "-_") or "export"
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}.csv"'},
    )

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "data_mode": settings.data_mode,
        "anthropic_configured": bool(settings.anthropic_api_key),
    }
