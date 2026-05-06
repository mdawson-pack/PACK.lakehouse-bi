from models import (
    CRMData, KPI, PipelineStage, RepWinRate, Opportunity,
    FinanceData, RevenueByMonth,
    OpsData, ProductionRun,
)

def get_crm_data() -> CRMData:
    return CRMData(
        kpis=[
            KPI(label="Pipeline Value", value="$8.4M", delta="14% vs last qtr", trend="up"),
            KPI(label="Won Revenue",    value="$2.1M", delta="9% vs last qtr",  trend="up"),
            KPI(label="Win Rate",       value="31%",   delta="3pts vs last qtr", trend="down"),
            KPI(label="Avg Deal Size",  value="$47K",  delta="6% vs last qtr",  trend="up"),
        ],
        pipeline=[
            PipelineStage(stage="Prospecting",  count=84, pct=100, color="#4f7af8"),
            PipelineStage(stage="Qualification",count=61, pct=72,  color="#5e87f5"),
            PipelineStage(stage="Proposal",     count=42, pct=50,  color="#38c9a0"),
            PipelineStage(stage="Negotiation",  count=27, pct=32,  color="#f5a623"),
            PipelineStage(stage="Closed Won",   count=17, pct=20,  color="#38c9a0"),
        ],
        repWinRates=[
            RepWinRate(name="A. Chen",   rate=82),
            RepWinRate(name="S. Patel",  rate=71),
            RepWinRate(name="R. Torres", rate=58),
            RepWinRate(name="M. Kim",    rate=44),
            RepWinRate(name="J. Okafor", rate=38),
        ],
        opportunities=[
            Opportunity(id="opp-1", name="Enterprise Expansion", account="Northfield Mfg",    stage="Negotiation",  value=340000, closeDate="Jun 12", owner="A. Chen"),
            Opportunity(id="opp-2", name="Platform Renewal",     account="Cascadia Logistics", stage="Proposal",     value=210000, closeDate="Jun 28", owner="S. Patel"),
            Opportunity(id="opp-3", name="New Logo — West",      account="Summit Health",      stage="Qualification",value=185000, closeDate="Jul 15", owner="R. Torres"),
            Opportunity(id="opp-4", name="Module Upsell",        account="Irongate Capital",   stage="Closed Won",   value=95000,  closeDate="May 30", owner="M. Kim"),
            Opportunity(id="opp-5", name="Pilot Expansion",      account="Redwood Retail",     stage="Proposal",     value=78000,  closeDate="Jul 3",  owner="J. Okafor"),
        ],
    )

def get_finance_data() -> FinanceData:
    return FinanceData(
        kpis=[
            KPI(label="Total Revenue",   value="$12.3M", delta="8% vs last qtr", trend="up"),
            KPI(label="Gross Margin",    value="61%",    delta="2pts vs last qtr",trend="up"),
            KPI(label="vs Budget",       value="+$340K", delta="2.8% favorable",  trend="up"),
            KPI(label="Forecast Q3",     value="$13.8M", delta="12% projected",   trend="up"),
        ],
        revenueByMonth=[
            RevenueByMonth(month="Jan", actual=1850000, forecast=1900000),
            RevenueByMonth(month="Feb", actual=2100000, forecast=2000000),
            RevenueByMonth(month="Mar", actual=2050000, forecast=2100000),
            RevenueByMonth(month="Apr", actual=2300000, forecast=2200000),
            RevenueByMonth(month="May", actual=2200000, forecast=2300000),
            RevenueByMonth(month="Jun", actual=1800000, forecast=2400000),
        ],
    )

def get_ops_data() -> OpsData:
    return OpsData(
        kpis=[
            KPI(label="Lines Active",  value="8 / 10", delta="2 on hold",       trend="flat"),
            KPI(label="Avg Yield",     value="87.4%",  delta="1.2pts vs target", trend="down"),
            KPI(label="Units Today",   value="14,280", delta="6% vs plan",       trend="up"),
            KPI(label="Downtime",      value="2.3 hr", delta="0.8hr vs avg",     trend="down"),
        ],
        runs=[
            ProductionRun(id="RUN-2841", line="Line 1", product="SKU-A100",  **{"yield": 94}, status="Running",  startTime="06:00 AM"),
            ProductionRun(id="RUN-2842", line="Line 2", product="SKU-B220",  **{"yield": 88}, status="Running",  startTime="06:00 AM"),
            ProductionRun(id="RUN-2840", line="Line 3", product="SKU-A100",  **{"yield": 91}, status="Complete", startTime="12:00 AM"),
            ProductionRun(id="RUN-2843", line="Line 4", product="SKU-C305",  **{"yield": 72}, status="On Hold",  startTime="08:30 AM"),
            ProductionRun(id="RUN-2839", line="Line 5", product="SKU-D410",  **{"yield": 61}, status="Failed",   startTime="04:00 AM"),
        ],
    )
