from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal
import hashlib
from db import get_connection
from models import CRMData, KPI, PipelineStage, RepWinRate, Opportunity

# Tries each variant in order; first match wins (case-insensitive)
_COL_VARIANTS: dict[str, list[str]] = {
    "id":        ["id", "opportunityid", "opportunity_id", "opp_id"],
    "company":   ["company name", "company", "customercompany", "accountcompany", "account_company"],
    "name":      ["opportunity name", "opportunityname", "name", "opportunity_name", "opp_name", "title"],
    "account":   ["customer name", "account", "accountname", "account_name", "client", "clientname"],
    "stage":     ["stage", "stagename", "stage_name", "salestage", "pipeline_stage"],
    "status":    ["status"],
    "value":        ["estimated revenue", "price submitted", "value", "amount", "dealvalue", "deal_value", "opportunityvalue", "revenue"],
    "actual_value": ["actual value", "actualvalue", "actual_value"],
    "estCloseDate": ["estimated close date", "expectedclosedate", "expected_close_date"],
    "closeDate":    ["actual close date", "closedate", "close_date"],
    "owner":     ["owner", "ownername", "owner_name", "assignedto", "salesrep", "rep"],
}

_STAGE_COLORS: dict[str, str] = {
    "Prospecting":   "#4f7af8",
    "Qualification": "#a78bfa",
    "Proposal":      "#38c9a0",
    "Negotiation":   "#f5a623",
    "Closed Won":    "#38c9a0",
    "Closed Lost":   "#ef4444",
    "Unknown":       "#6b7280",
}


def _resolve_columns(actual_cols: list[str]) -> dict[str, str]:
    """Map canonical field names → actual column names from the table."""
    lower_to_actual = {c.lower(): c for c in actual_cols}
    resolved: dict[str, str] = {}
    for field, variants in _COL_VARIANTS.items():
        for v in variants:
            if v in lower_to_actual:
                resolved[field] = lower_to_actual[v]
                break
    return resolved


def _get(row, col_map: dict[str, str], field: str, default=None):
    col = col_map.get(field)
    return getattr(row, col, default) if col else default


def _as_int_currency(value) -> int:
    if value is None:
        return 0
    if isinstance(value, Decimal):
        return int(value)
    if isinstance(value, (int, float)):
        return int(value)
    try:
        return int(float(str(value)))
    except Exception:
        return 0


def _as_date_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _fmt_currency(value: int) -> str:
    if abs(value) >= 1_000_000_000:
        return f"${value / 1_000_000_000:.1f}B"
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:.1f}M"
    if abs(value) >= 1_000:
        return f"${value / 1_000:.1f}K"
    return f"${value}"


def _normalize_stage(raw_stage: str) -> str:
    stage = (raw_stage or "").strip()
    lower = stage.lower()
    if not stage:
        return "Unknown"
    if lower.startswith("qualif"):
        return "Qualify"
    if lower.startswith("propos"):
        return "Propose"
    if lower.startswith("clos") or "won" in lower or "lost" in lower or "dead" in lower:
        return "Close"
    if lower.startswith("prospect"):
        return "Qualify"
    if lower.startswith("negotiat"):
        return "Close"
    return stage


def _stable_opportunity_id(name: str, account: str, close_date: str, owner: str) -> str:
    payload = "|".join([name, account, close_date, owner]).encode("utf-8")
    return hashlib.sha1(payload).hexdigest()[:16]


def get_column_names_from_lakehouse() -> list[str]:
    """Return the raw column names from Revenue Opportunity for diagnostics."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT TOP 1 * FROM [dbo].[Revenue Opportunity]")
        return [d[0] for d in cursor.description]
    finally:
        conn.close()


def get_distinct_companies_from_lakehouse() -> list[str]:
    """Return sorted distinct non-empty company names from Revenue Opportunity."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT TOP 1 * FROM [dbo].[Revenue Opportunity]")
        actual_cols = [d[0] for d in cursor.description]
        col_map = _resolve_columns(actual_cols)
        company_col = col_map.get("company") or col_map.get("account")
        if not company_col:
            return []
        cursor.execute(
            f"SELECT DISTINCT [{company_col}] FROM [dbo].[Revenue Opportunity] "
            f"WHERE [{company_col}] IS NOT NULL AND [{company_col}] != '' "
            f"ORDER BY [{company_col}]"
        )
        return [str(row[0]) for row in cursor.fetchall() if row[0]]
    finally:
        conn.close()


def get_crm_data_from_lakehouse() -> CRMData:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM [dbo].[Revenue Opportunity]")
        actual_cols = [d[0] for d in cursor.description]
        col_map = _resolve_columns(actual_cols)
        actual_value_col = col_map.get("actual_value")
        actual_value_idx = actual_cols.index(actual_value_col) if actual_value_col else None
        rows = cursor.fetchall()
    finally:
        conn.close()

    seen: dict[str, Opportunity] = {}
    won_ids: set[str] = set()
    lost_ids: set[str] = set()
    closed_ids: set[str] = set()
    won_actual_values: dict[str, int] = {}
    for row in rows:
        name = str(_get(row, col_map, "name", "") or "")
        account = str(_get(row, col_map, "account", "") or "")
        company = str(_get(row, col_map, "company", "") or "")
        stage = _normalize_stage(str(_get(row, col_map, "stage", "") or ""))
        status = str(_get(row, col_map, "status", "") or "").strip()
        status_lower = status.lower()
        est_close_date = _as_date_text(_get(row, col_map, "estCloseDate", ""))
        close_date = _as_date_text(_get(row, col_map, "closeDate", ""))
        owner = str(_get(row, col_map, "owner", "") or "")
        value = _as_int_currency(_get(row, col_map, "value", 0))
        actual_value = _as_int_currency(row[actual_value_idx]) if actual_value_idx is not None else 0
        source_id = _get(row, col_map, "id", None)
        identifier = str(source_id) if source_id else _stable_opportunity_id(name, account, close_date, owner)

        # is_won: only when status is exactly 'Won' (case-insensitive)
        is_won = status_lower == "won"
        is_lost = "lost" in status_lower or "dead" in status_lower
        is_closed = is_won or is_lost or "closed" in status_lower
        if not status:
            stage_lower = stage.lower()
            is_lost = "lost" in stage_lower or "dead" in stage_lower
            is_closed = is_lost or "closed" in stage_lower or "won" in stage_lower
            # is_won intentionally not overridden — only status='Won' counts as won

        if identifier not in seen:
            seen[identifier] = Opportunity(
                id=identifier,
                name=name,
                account=account,
                company=company,
                stage=stage,
                status=status,
                value=value,
                actualValue=actual_value if actual_value_idx is not None else None,
                estCloseDate=est_close_date or None,
                closeDate=close_date,
                owner=owner,
            )
            if is_won:
                won_ids.add(identifier)
                if actual_value_idx is not None:
                    won_actual_values[identifier] = actual_value
            if is_lost:
                lost_ids.add(identifier)
            if is_closed:
                closed_ids.add(identifier)

    opportunities = list(seen.values())

    # Pipeline breakdown — active (non-closed) stages only
    active = [o for o in opportunities if o.id not in closed_ids]
    stage_counts: dict[str, int] = defaultdict(int)
    for o in active:
        stage_counts[o.stage] += 1
    max_count = max(stage_counts.values(), default=1)
    pipeline = [
        PipelineStage(
            stage=stage,
            count=count,
            pct=round(count / max_count * 100),
            color=_STAGE_COLORS.get(stage, "#6b7280"),
        )
        for stage, count in sorted(stage_counts.items(), key=lambda x: -x[1])
    ]

    # Rep win rates (top 5 by win %)
    won = [o for o in opportunities if o.id in won_ids]
    owner_total: dict[str, int] = defaultdict(int)
    owner_won: dict[str, int] = defaultdict(int)
    for o in opportunities:
        owner_total[o.owner] += 1
    for o in won:
        owner_won[o.owner] += 1
    rep_win_rates = sorted(
        [
            RepWinRate(name=owner, rate=round(owner_won[owner] / total * 100))
            for owner, total in owner_total.items()
        ],
        key=lambda r: -r.rate,
    )[:5]

    # KPIs derived from the full dataset
    pipeline_value = sum(o.value for o in active)
    won_value = (
        sum(won_actual_values.get(oid, 0) for oid in won_ids)
        if actual_value_idx is not None
        else sum(o.value for o in won)
    )
    closed_count = len(closed_ids)
    win_rate = round(len(won) / closed_count * 100) if closed_count else 0
    avg_deal = round(pipeline_value / len(active)) if active else 0

    kpis = [
        KPI(label="Pipeline Value", value=_fmt_currency(pipeline_value), delta="", trend="flat"),
        KPI(label="Won Revenue",    value=_fmt_currency(won_value),      delta="", trend="flat"),
        KPI(label="Win Rate",       value=f"{win_rate}%",                delta="", trend="flat"),
        KPI(label="Avg Deal Size",  value=_fmt_currency(avg_deal),       delta="", trend="flat"),
    ]

    return CRMData(kpis=kpis, pipeline=pipeline, repWinRates=rep_win_rates, opportunities=opportunities)
