'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { KPICard } from '@/components/ui/KPICard'
import { AgentPanel } from '@/components/agent/AgentPanel'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function FinancePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['finance'],
    queryFn: api.finance.getData,
  })

  if (isLoading) return <div style={{ padding: 24, color: 'var(--muted)' }}>Loading…</div>
  if (error || !data) return <div style={{ padding: 24, color: 'var(--accent4)' }}>Failed to load Finance data.</div>

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {data.kpis.map((kpi) => <KPICard key={kpi.label} kpi={kpi} />)}
        </div>

        {/* Revenue chart */}
        <div style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Revenue vs forecast</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 16 }}>Monthly · FY 2025</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.revenueByMonth} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fill: '#7b82a0', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7b82a0', fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ background: 'var(--card2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, fontSize: 11 }}
                labelStyle={{ color: 'var(--text)' }}
                formatter={(v: number) => [`$${(v/1000).toFixed(0)}K`]}
              />
              <Legend wrapperStyle={{ fontSize: 10, color: 'var(--muted)' }} />
              <Bar dataKey="actual"   name="Actual"   fill="#4f7af8" radius={[3,3,0,0]} />
              <Bar dataKey="forecast" name="Forecast" fill="#38c9a0" radius={[3,3,0,0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
      <AgentPanel module="finance" />
    </div>
  )
}
