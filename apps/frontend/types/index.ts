// ── KPI ──────────────────────────────────────────────────────────────────────
export interface KPI {
  label: string
  value: string
  delta: string
  trend: 'up' | 'down' | 'flat'
}

// ── CRM ──────────────────────────────────────────────────────────────────────
export interface PipelineStage {
  stage: string
  count: number
  pct: number          // 0-100, for bar width
  color: string
}

export interface RepWinRate {
  name: string
  rate: number         // 0-100
}

export interface Opportunity {
  id: string
  name: string
  account: string
  stage: 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost'
  value: number
  closeDate: string
  owner: string
}

export interface CRMData {
  kpis: KPI[]
  pipeline: PipelineStage[]
  repWinRates: RepWinRate[]
  opportunities: Opportunity[]
}

// ── Finance ───────────────────────────────────────────────────────────────────
export interface RevenueByMonth {
  month: string
  actual: number
  forecast: number
}

export interface FinanceData {
  kpis: KPI[]
  revenueByMonth: RevenueByMonth[]
}

// ── Ops ───────────────────────────────────────────────────────────────────────
export interface ProductionRun {
  id: string
  line: string
  product: string
  yield: number
  status: 'Running' | 'Complete' | 'On Hold' | 'Failed'
  startTime: string
}

export interface OpsData {
  kpis: KPI[]
  runs: ProductionRun[]
}

// ── Agent ─────────────────────────────────────────────────────────────────────
export type ModuleId = 'crm' | 'finance' | 'ops'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentRequest {
  module: ModuleId
  message: string
  history: ChatMessage[]
  context: Record<string, string>
}

export interface AgentResponse {
  reply: string
}
