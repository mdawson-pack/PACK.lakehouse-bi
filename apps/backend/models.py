from pydantic import BaseModel
from typing import Literal

# ── Shared ────────────────────────────────────────────────────────────────────
class KPI(BaseModel):
    label: str
    value: str
    delta: str
    trend: Literal['up', 'down', 'flat']

# ── CRM ──────────────────────────────────────────────────────────────────────
class PipelineStage(BaseModel):
    stage: str
    count: int
    pct: float
    color: str

class RepWinRate(BaseModel):
    name: str
    rate: int

class Opportunity(BaseModel):
    id: str
    name: str
    account: str
    stage: str
    status: str = ""
    value: int
    closeDate: str
    owner: str

class CRMData(BaseModel):
    kpis: list[KPI]
    pipeline: list[PipelineStage]
    repWinRates: list[RepWinRate]
    opportunities: list[Opportunity]

# ── Finance ───────────────────────────────────────────────────────────────────
class RevenueByMonth(BaseModel):
    month: str
    actual: int
    forecast: int

class FinanceData(BaseModel):
    kpis: list[KPI]
    revenueByMonth: list[RevenueByMonth]

# ── Ops ───────────────────────────────────────────────────────────────────────
class ProductionRun(BaseModel):
    id: str
    line: str
    product: str
    yield_: int = 0
    status: str
    startTime: str

    class Config:
        populate_by_name = True
        fields = {'yield_': 'yield'}

class OpsData(BaseModel):
    kpis: list[KPI]
    runs: list[ProductionRun]

# ── Agent ─────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: Literal['user', 'assistant']
    content: str

class AgentRequest(BaseModel):
    module: Literal['crm', 'finance', 'ops']
    message: str
    history: list[ChatMessage] = []
    context: dict[str, str] = {}

class AgentResponse(BaseModel):
    reply: str
