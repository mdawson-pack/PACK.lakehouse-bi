import type { KPI } from '@/types'

function formatKpiValue(value: string) {
  const match = value.trim().match(/^([+-]?\$?)([\d,]+(?:\.\d+)?)([KMB])$/i)
  if (!match) return value

  const [, prefix, rawAmount, rawUnit] = match
  const amount = Number(rawAmount.replace(/,/g, ''))
  const unit = rawUnit.toUpperCase()

  if (unit === 'M' && amount >= 1000) {
    return `${prefix}${(amount / 1000).toFixed(1)}B`
  }

  return value
}

export function KPICard({ kpi }: { kpi: KPI }) {
  const isUp = kpi.trend === 'up'
  const isDown = kpi.trend === 'down'
  const displayValue = formatKpiValue(kpi.value)

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
        {kpi.label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--text)', lineHeight: 1 }}>
        {displayValue}
      </div>
      <div style={{
        fontSize: 10, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4,
        color: isUp ? 'var(--accent2)' : isDown ? 'var(--accent4)' : 'var(--muted)',
      }}>
        {isUp ? '▲' : isDown ? '▼' : '–'} {kpi.delta}
      </div>
    </div>
  )
}
