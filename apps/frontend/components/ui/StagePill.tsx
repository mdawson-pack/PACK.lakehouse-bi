type Stage = 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost' | string

const stageColors: Record<string, { bg: string; color: string }> = {
  'Prospecting':  { bg: 'rgba(79,122,248,0.15)',  color: '#7fa4fa' },
  'Qualification':{ bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  'Proposal':     { bg: 'rgba(56,201,160,0.15)',  color: '#38c9a0' },
  'Negotiation':  { bg: 'rgba(245,166,35,0.15)',  color: '#f5a623' },
  'Closed Won':   { bg: 'rgba(56,201,160,0.2)',   color: '#38c9a0' },
  'Closed Lost':  { bg: 'rgba(224,92,92,0.15)',   color: '#e05c5c' },
  'Unknown':      { bg: 'rgba(123,130,160,0.1)',  color: '#7b82a0' },
}

export function StagePill({ stage }: { stage: Stage }) {
  const colors = stageColors[stage] ?? { bg: 'rgba(123,130,160,0.15)', color: '#7b82a0' }
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 9,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 3,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      background: colors.bg,
      color: colors.color,
    }}>
      {stage}
    </span>
  )
}
