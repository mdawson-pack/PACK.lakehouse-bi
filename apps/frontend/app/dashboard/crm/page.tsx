'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { KPICard } from '@/components/ui/KPICard'
import { StagePill } from '@/components/ui/StagePill'
import { AgentPanel } from '@/components/agent/AgentPanel'

export default function CRMPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['crm'],
    queryFn: api.crm.getData,
  })

  const [selectedOwner, setSelectedOwner] = useState<string>('All')

  const owners = useMemo(() => {
    if (!data) return []
    return ['All', ...Array.from(new Set(data.opportunities.map((o) => o.owner))).sort()]
  }, [data])

  const filteredOpportunities = useMemo(() => {
    if (!data) return []
    if (selectedOwner === 'All') return data.opportunities
    return data.opportunities.filter((o) => o.owner === selectedOwner)
  }, [data, selectedOwner])

  if (isLoading) return <LoadingState />
  if (error || !data) return <ErrorState />

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Charts area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {data.kpis.map((kpi) => <KPICard key={kpi.label} kpi={kpi} />)}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10 }}>

          {/* Pipeline funnel */}
          <div style={cardStyle}>
            <div style={chartTitleStyle}>Pipeline by stage</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 12 }}>Count · active opportunities only</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.pipeline.map((row) => (
                <div key={row.stage} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', width: 80, flexShrink: 0, textAlign: 'right' }}>
                    {row.stage}
                  </div>
                  <div style={{ flex: 1, height: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${row.pct}%`,
                      background: row.color,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--muted)', width: 24, textAlign: 'right' }}>
                    {row.count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Win rate by rep */}
          <div style={cardStyle}>
            <div style={chartTitleStyle}>Win rate by rep</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 12 }}>Top 5 · this quarter</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.repWinRates.map((rep) => (
                <div key={rep.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', width: 60, flexShrink: 0, textAlign: 'right' }}>
                    {rep.name}
                  </div>
                  <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${rep.rate}%`,
                      background: rep.rate >= 60 ? 'var(--accent2)' : rep.rate >= 40 ? 'var(--accent)' : 'var(--accent3)',
                      opacity: 0.8,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--muted)', width: 30, textAlign: 'right' }}>
                    {rep.rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Opportunities table */}
        <div style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>

          {/* Table toolbar: label + Owner slicer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px 8px',
            background: 'var(--card2)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)' }}>
              Opportunities
              {selectedOwner !== 'All' && (
                <span style={{ marginLeft: 6, color: 'var(--accent)', fontWeight: 700 }}>· {filteredOpportunities.length} shown</span>
              )}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 9, color: 'var(--muted)', marginRight: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Owner</span>
              {owners.map((owner) => {
                const active = selectedOwner === owner
                return (
                  <button
                    key={owner}
                    onClick={() => setSelectedOwner(owner)}
                    style={{
                      fontSize: 10,
                      padding: '3px 9px',
                      borderRadius: 20,
                      border: active ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.12)',
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? '#fff' : 'var(--muted)',
                      cursor: 'pointer',
                      fontWeight: active ? 600 : 400,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {owner}
                  </button>
                )
              })}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr>
                {['Opportunity', 'Account', 'Stage', 'Value', 'Close date', 'Owner'].map((h) => (
                  <th key={h} style={{
                    fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: 'var(--muted)',
                    background: 'var(--card2)', padding: '8px 12px', textAlign: 'left',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.length > 0 ? (
                filteredOpportunities.map((opp) => (
                  <tr key={opp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={tdStyle}>{opp.name}</td>
                    <td style={tdStyle}>{opp.account}</td>
                    <td style={tdStyle}><StagePill stage={opp.stage} /></td>
                    <td style={{ ...tdStyle, fontFamily: 'IBM Plex Mono, monospace' }}>
                      ${(opp.value / 1000).toFixed(0)}K
                    </td>
                    <td style={tdStyle}>{opp.closeDate}</td>
                    <td style={tdStyle}>{opp.owner}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: '20px 12px' }}>
                    No opportunities for {selectedOwner}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent panel */}
      <AgentPanel module="crm" />
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[0,1,2,3].map(i => <Skeleton key={i} height={80} />)}
        </div>
        <Skeleton height={220} />
        <Skeleton height={200} />
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <div style={{ padding: 24, color: 'var(--accent4)' }}>
      Failed to load CRM data. Make sure the backend is running on port 8000.
    </div>
  )
}

function Skeleton({ height }: { height: number }) {
  return (
    <div style={{
      height,
      background: 'var(--card)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  padding: 14,
}

const chartTitleStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 3,
}

const tdStyle: React.CSSProperties = {
  padding: '7px 12px',
  color: 'var(--text)',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
}
