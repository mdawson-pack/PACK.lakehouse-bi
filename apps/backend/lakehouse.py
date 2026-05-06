from collections import defaultdict
from db import get_connection
from models import CRMData, KPI, PipelineStage, RepWinRate, Opportunity

# Tries each variant in order; first match wins (case-insensitive)
_COL_VARIANTS: dict[str, list[str]] = {
    "id":        ["id", "opportunityid", "opportunity_id", "opp_id"],
    "name":      ["name", "opportunityname", "opportunity_name", "opp_name", "title"],
    "account":   ["account", "accountname", "account_name", "client", "clientname", "company"],
    "stage":     ["stage", "stagename", "stage_name", "salestage", "pipeline_stage"],
    "value":     ["value", "amount", "dealvalue", "deal_value", "opportunityvalue", "revenue"],
    "closeDate": ["closedate", "close_date", "expectedclosedate", "expected_close_date"],
    "owner":     ["owner", "ownername", "owner_name", "assignedto", "salesrep", "rep"],
}

_STAGE_COLORS: dict[str, str] = {
    "Prospecting":   "#4f7af8",
    "Qualification": "#5e87f5",
    "Proposal":      "#38c9a0",
    "Negotiation":   "#f5a623",
    "Closed Won":    "#38c9a0",
    "Closed Lost":   "#ef4444",
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


def get_crm_data_from_lakehouse() -> CRMData:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM [200_crm_opportunities]")
        actual_cols = [d[0] for d in cursor.description]
        col_map = _resolve_columns(actual_cols)
        rows = cursor.fetchall()
    finally:
        conn.close()

    opportunities = [
        Opportunity(
            id=str(_get(row, col_map, "id", "") or ""),
            name=str(_get(row, col_map, "name", "") or ""),
            account=str(_get(row, col_map, "account", "") or ""),
            stage=str(_get(row, col_map, "stage", "") or ""),
            value=int(_get(row, col_map, "value", 0) or 0),
            closeDate=str(_get(row, col_map, "closeDate", "") or ""),
            owner=str(_get(row, col_map, "owner", "") or ""),
        )
        for row in rows
    ]

    # Pipeline breakdown — active (non-closed) stages only
    active = [o for o in opportunities if "closed" not in o.stage.lower()]
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
    won = [o for o in opportunities if "won" in o.stage.lower()]
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
    pipeline_value = sum(o.value for o in opportunities if "closed lost" not in o.stage.lower())
    won_value = sum(o.value for o in won)
    closed_count = sum(1 for o in opportunities if "closed" in o.stage.lower())
    win_rate = round(len(won) / closed_count * 100) if closed_count else 0
    avg_deal = round(pipeline_value / len(active)) if active else 0

    kpis = [
        KPI(label="Pipeline Value", value=f"${pipeline_value / 1_000_000:.1f}M", delta="", trend="flat"),
        KPI(label="Won Revenue",    value=f"${won_value / 1_000_000:.1f}M",      delta="", trend="flat"),
        KPI(label="Win Rate",       value=f"{win_rate}%",                         delta="", trend="flat"),
        KPI(label="Avg Deal Size",  value=f"${avg_deal / 1_000:.0f}K",            delta="", trend="flat"),
    ]

    return CRMData(kpis=kpis, pipeline=pipeline, repWinRates=rep_win_rates, opportunities=opportunities)
