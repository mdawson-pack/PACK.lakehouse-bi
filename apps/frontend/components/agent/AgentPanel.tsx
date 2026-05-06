'use client'

import { useState, useRef, useEffect } from 'react'
import { useAgentStore, useFilterStore } from '@/stores'
import { api } from '@/lib/api'
import type { ModuleId } from '@/types'

interface AgentPanelProps {
  module: ModuleId
}

const moduleConfig: Record<ModuleId, {
  title: string
  subtitle: string
  contextLabel: string
  placeholder: string
  suggestions: string[]
}> = {
  crm: {
    title: 'CRM Agent',
    subtitle: 'Specialized on Opportunities data',
    contextLabel: 'Active context',
    placeholder: 'Ask about your pipeline…',
    suggestions: ['Forecast this quarter ↗', 'At-risk by region ↗', 'Compare to Q1 ↗'],
  },
  finance: {
    title: 'Finance Agent',
    subtitle: 'Specialized on Revenue & GL data',
    contextLabel: 'Active context',
    placeholder: 'Ask about revenue or forecasts…',
    suggestions: ['Variance vs budget ↗', 'Cash flow trend ↗', 'Top cost drivers ↗'],
  },
  ops: {
    title: 'Ops Agent',
    subtitle: 'Specialized on Production data',
    contextLabel: 'Active context',
    placeholder: 'Ask about production runs…',
    suggestions: ['Lines below target ↗', 'Yield trend ↗', 'On-hold reasons ↗'],
  },
}

export function AgentPanel({ module }: AgentPanelProps) {
  const config = moduleConfig[module]
  const { histories, addMessage } = useAgentStore()
  const { quarter, region } = useFilterStore()
  const messages = histories[module]

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')

    addMessage(module, { role: 'user', content: msg })
    setLoading(true)

    try {
      const res = await api.agent.send({
        module,
        message: msg,
        history: messages,
        context: { quarter, region },
      })
      addMessage(module, { role: 'assistant', content: res.reply })
    } catch {
      addMessage(module, { role: 'assistant', content: 'Sorry, I ran into an error reaching the backend. Please check that the API server is running.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: 260,
      background: 'var(--panel)',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100%',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent2)',
            boxShadow: '0 0 0 2px rgba(56,201,160,0.2)',
            flexShrink: 0,
          }} />
          {config.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>{config.subtitle}</div>
      </div>

      {/* Context chips */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 7 }}>
          {config.contextLabel}
        </div>
        {[quarter, region, module.toUpperCase()].map((chip) => (
          <span key={chip} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10,
            background: 'var(--card)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4, padding: '3px 8px',
            color: 'var(--text)',
            marginRight: 4, marginBottom: 4,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            {chip}
          </span>
        ))}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
            Ask me anything about your {module === 'crm' ? 'pipeline' : module === 'finance' ? 'revenue' : 'production'} data. I have access to live Lakehouse data.
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>
              {msg.role === 'user' ? 'You' : 'Agent'}
            </div>
            <div style={{
              fontSize: 11,
              lineHeight: 1.55,
              color: 'var(--text)',
              background: msg.role === 'user' ? 'rgba(79,122,248,0.1)' : 'var(--card)',
              border: msg.role === 'user' ? '1px solid rgba(79,122,248,0.2)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7,
              padding: '8px 10px',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Agent</div>
            <div style={{
              fontSize: 11, color: 'var(--muted)',
              background: 'var(--card)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7, padding: '8px 10px',
            }}>
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 14px 8px' }}>
        {config.suggestions.map((s) => (
          <button key={s} onClick={() => send(s.replace(' ↗', ''))} style={{
            fontSize: 9,
            background: 'var(--card)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4, padding: '3px 8px',
            color: 'var(--muted)', cursor: 'pointer',
            fontFamily: 'IBM Plex Sans, sans-serif',
          }}>
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 7 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={config.placeholder}
          style={{
            flex: 1,
            background: 'var(--card)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, padding: '7px 10px',
            fontSize: 11, color: 'var(--text)',
            fontFamily: 'IBM Plex Sans, sans-serif',
            outline: 'none',
          }}
        />
        <button onClick={() => send()} disabled={loading} style={{
          background: 'var(--accent)',
          border: 'none', borderRadius: 6,
          padding: '0 10px', cursor: 'pointer',
          color: '#fff', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: loading ? 0.6 : 1,
        }}>
          ↑
        </button>
      </div>
    </div>
  )
}
