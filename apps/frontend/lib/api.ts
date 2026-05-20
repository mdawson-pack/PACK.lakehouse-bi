import type { CRMData, FinanceData, OpsData, AgentRequest, AgentResponse } from '@/types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`)
  return res.json()
}

export const api = {
  crm:       { getData: ()  => get<CRMData>('/api/crm') },
  finance:   { getData: ()  => get<FinanceData>('/api/finance') },
  ops:       { getData: ()  => get<OpsData>('/api/ops') },
  companies: { list: ()    => get<string[]>('/api/companies') },
  agent:     { send: (req: AgentRequest, signal?: AbortSignal) => post<AgentResponse>('/api/agent', req, signal) },
}
