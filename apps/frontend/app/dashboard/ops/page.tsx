'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { KPICard } from '@/components/ui/KPICard'
import { AgentPanel } from '@/components/agent/AgentPanel'

const statusColors: Record<string, { bg: string; color: string }> = {
  'Running':  { bg: 'rgba(79,122,248,0.15)',  color: '#7fa4fa' },
  'Complete': { bg: 'rgba(56,201,160,0.15)',  color: '#38c9a0' },
  'On Hold':  { bg: 'rgba(245,166,35,0.15)',  color: '#f5a623' },
  'Failed':   { bg: 'rgba(224,92,92,0.15)',   color: '#e05c5c' },
}

export default function OpsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ops'],
    queryFn: api.ops.getData,
  })

  if (isLoading) return <div style={{ padding: 24, color: 'var(--muted)' }}>Loading…</div>
  if (error || !data) return <div style={{ padding: 24, color: 'var(--accent4)' }}>Failed to load Ops data.</div>

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {data.kpis.map((kpi) => <KPICard key={kpi.label} kpi={kpi} />)}
        </div>

        {/* Production runs table */}
        <div style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>Production runs</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Active and recent · all lines</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Run ID', 'Line', 'Product', 'Yield', 'Status', 'Start time'].map((h) => (
                  <th key={h} style={{
                    fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: 'var(--muted)',
                    background: 'var(--card2)', padding: '8px 12px', textAlign: 'left',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.runs.map((run) => {
                const sc = statusColors[run.status] ?? statusColors['On Hold']
                return (
                  <tr key={run.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>{run.id}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--text)' }}>{run.line}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--text)' }}>{run.product}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'IBM Plex Mono, monospace', color: run.yield >= 90 ? 'var(--accent2)' : run.yield >= 75 ? 'var(--accent3)' : 'var(--accent4)' }}>
                      {run.yield}%
                    </td>
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 3, textTransform: 'uppercase', letterSpacing: '0.05em', background: sc.bg, color: sc.color }}>
                        {run.status}
                      </span>
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--muted)', fontSize: 10 }}>{run.startTime}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
      <AgentPanel module="ops" />
    </div>
  )
}
