'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
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

const MIN_WIDTH = 200
const MAX_WIDTH = 520
const COMPANIES_FALLBACK = ['Northfield Mfg', 'Cascadia Logistics', 'Summit Health', 'Irongate Capital', 'Redwood Retail']

function renderMessageContent(text: string) {
  // Detect bare URLs and render them as download links
  const splitRegex = /(https?:\/\/\S+)/g
  const isUrl = (s: string) => /^https?:\/\//.test(s)
  // Strip trailing markdown/punctuation that regex may have captured (e.g. )** . ,)
  const cleanUrl = (s: string) => s.replace(/[)\]*.,;!?*]+$/, '')
  const parts = text.split(splitRegex)
  return parts.map((part, i) =>
    isUrl(part) ? (
      <a
        key={i}
        href={cleanUrl(part)}
        download
        style={{
          color: 'var(--accent)',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(79,122,248,0.1)',
          border: '1px solid rgba(79,122,248,0.25)',
          borderRadius: 5,
          padding: '2px 8px',
          fontSize: 10,
          fontWeight: 600,
          marginTop: 4,
        }}
      >
        ⬇ Download CSV
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function AgentPanel({ module }: AgentPanelProps) {
  const config = moduleConfig[module]
  const { histories, addMessage } = useAgentStore()
  const { companies, setCompanies } = useFilterStore()
  const messages = histories[module]

  const { data: companiesList = COMPANIES_FALLBACK } = useQuery({
    queryKey: ['companies'],
    queryFn: api.companies.list,
    staleTime: 5 * 60 * 1000,
    placeholderData: COMPANIES_FALLBACK,
  })

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [width, setWidth] = useState(260)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [companiesOpen, setCompaniesOpen] = useState(false)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const companiesRef = useRef<HTMLDivElement>(null)

  function onHandleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startWidth: width }
    setDragging(true)

    function onMouseMove(ev: MouseEvent) {
      if (!dragRef.current) return
      const delta = dragRef.current.startX - ev.clientX
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragRef.current.startWidth + delta)))
    }

    function onMouseUp() {
      dragRef.current = null
      setDragging(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!companiesOpen) return
    function handleOutside(e: MouseEvent) {
      if (companiesRef.current && !companiesRef.current.contains(e.target as Node)) {
        setCompaniesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [companiesOpen])

  function stop() {
    abortRef.current?.abort()
  }

  async function send(text?: string) {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')

    addMessage(module, { role: 'user', content: msg })
    setLoading(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await api.agent.send({
        module,
        message: msg,
        history: messages,
        context: { companies: companies.length ? companies.join(', ') : 'All Companies' },
      }, controller.signal)
      addMessage(module, {
        role: 'assistant',
        content: res.reply,
        queriesRun: res.queries_run?.length ? res.queries_run : undefined,
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      addMessage(module, { role: 'assistant', content: 'Sorry, I ran into an error reaching the backend. Please check that the API server is running.' })
    } finally {
      abortRef.current = null
      setLoading(false)
    }
  }

  return (
    <div style={{
      width,
      background: 'var(--panel)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100%',
      position: 'relative',
      userSelect: dragging ? 'none' : undefined,
    }}>
      {/* Resize handle */}
      <div
        onMouseDown={onHandleMouseDown}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: 'ew-resize',
          zIndex: 10,
          background: dragging ? 'rgba(79,122,248,0.35)' : 'transparent',
          transition: dragging ? 'none' : 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(79,122,248,0.25)' }}
        onMouseLeave={e => { if (!dragging) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      />
      {/* Header */}
      <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)' }}>
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
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted)', marginBottom: 7 }}>
          {config.contextLabel}
        </div>

        {/* Companies multiselect chip */}
        <div ref={companiesRef} style={{ display: 'inline-block', position: 'relative', marginRight: 4, marginBottom: 4 }}>
          <span
            onClick={() => setCompaniesOpen((o) => !o)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10,
              background: companiesOpen ? 'var(--card)' : 'var(--card)',
              border: `1px solid ${companies.length ? 'rgba(79,122,248,0.4)' : 'var(--border)'}`,
              borderRadius: 4, padding: '3px 8px',
              color: 'var(--text)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            {companies.length === 0
              ? 'All Companies'
              : companies.length === 1
              ? companies[0]
              : `${companies.length} Companies`}
            <span style={{ fontSize: 7, color: 'var(--muted)', marginLeft: 2 }}>▾</span>
          </span>

          {companiesOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              zIndex: 200,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '6px 0',
              minWidth: 180,
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '4px 12px', cursor: 'pointer',
                fontSize: 10, color: 'var(--muted)',
                borderBottom: '1px solid var(--border)',
                paddingBottom: 8, marginBottom: 2,
              }}>
                <input
                  type="checkbox"
                  checked={companies.length === 0}
                  onChange={() => setCompanies([])}
                  style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                All Companies
              </label>
              {companiesList.map((c) => (
                <label key={c} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '4px 12px', cursor: 'pointer',
                  fontSize: 10, color: 'var(--text)',
                }}>
                  <input
                    type="checkbox"
                    checked={companies.includes(c)}
                    onChange={() => {
                      if (companies.includes(c)) setCompanies(companies.filter((x) => x !== c))
                      else setCompanies([...companies, c])
                    }}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  {c}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Module chip */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 4, padding: '3px 8px',
          color: 'var(--text)',
          marginRight: 4, marginBottom: 4,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
          {module.toUpperCase()}
        </span>
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
              border: msg.role === 'user' ? '1px solid rgba(79,122,248,0.2)' : '1px solid var(--border)',
              borderRadius: 7,
              padding: '8px 10px',
              whiteSpace: 'pre-wrap',
            }}>
              {renderMessageContent(msg.content)}
            </div>
            {msg.queriesRun && msg.queriesRun.length > 0 && (
              <details style={{ marginTop: 2 }}>
                <summary style={{
                  fontSize: 9,
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: 10, height: 10,
                    borderRadius: 2,
                    background: 'rgba(79,122,248,0.15)',
                    border: '1px solid rgba(79,122,248,0.3)',
                    textAlign: 'center', lineHeight: '9px',
                    fontSize: 8, color: 'var(--accent)',
                    flexShrink: 0,
                  }}>▸</span>
                  {msg.queriesRun.length === 1 ? '1 SQL query' : `${msg.queriesRun.length} SQL queries`}
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {msg.queriesRun.map((sql, qi) => {
                    const key = `${i}-${qi}`
                    const copied = copiedKey === key
                    function handleCopy() {
                      navigator.clipboard.writeText(sql).then(() => {
                        setCopiedKey(key)
                        setTimeout(() => setCopiedKey(null), 1500)
                      })
                    }
                    return (
                      <div key={qi} style={{ position: 'relative' }}>
                        <pre style={{
                          margin: 0,
                          fontSize: 9,
                          lineHeight: 1.5,
                          color: 'var(--accent)',
                          background: 'rgba(79,122,248,0.06)',
                          border: '1px solid rgba(79,122,248,0.15)',
                          borderRadius: 5,
                          padding: '6px 8px',
                          paddingRight: 42,
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          fontFamily: '"IBM Plex Mono", "Fira Code", monospace',
                        }}>
                          {sql}
                        </pre>
                        <button
                          onClick={handleCopy}
                          title={copied ? 'Copied!' : 'Copy SQL'}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            background: copied ? 'rgba(56,201,160,0.15)' : 'rgba(79,122,248,0.12)',
                            border: copied ? '1px solid rgba(56,201,160,0.4)' : '1px solid rgba(79,122,248,0.25)',
                            borderRadius: 3,
                            padding: '3px',
                            cursor: 'pointer',
                            color: copied ? 'var(--accent2)' : 'var(--accent)',
                            lineHeight: 0,
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {copied ? (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="4" y="1" width="7" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.1"/>
                              <path d="M8 9v1.3A.7.7 0 0 1 7.3 11H1.7A.7.7 0 0 1 1 10.3V3.7A.7.7 0 0 1 1.7 3H3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Agent</div>
            <div style={{
              fontSize: 11, color: 'var(--muted)',
              background: 'var(--card)',
              border: '1px solid var(--border)',
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
            border: '1px solid var(--border)',
            borderRadius: 4, padding: '3px 8px',
            color: 'var(--muted)', cursor: 'pointer',
            fontFamily: 'IBM Plex Sans, sans-serif',
          }}>
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 7 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={config.placeholder}
          style={{
            flex: 1,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 6, padding: '7px 10px',
            fontSize: 11, color: 'var(--text)',
            fontFamily: 'IBM Plex Sans, sans-serif',
            outline: 'none',
          }}
        />
        {loading ? (
          <button onClick={stop} title="Stop" style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 6,
            padding: '0 10px', cursor: 'pointer',
            color: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="8" height="8" rx="1.5"/>
            </svg>
          </button>
        ) : (
          <button onClick={() => send()} style={{
            background: 'var(--accent)',
            border: 'none', borderRadius: 6,
            padding: '0 10px', cursor: 'pointer',
            color: '#fff', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            ↑
          </button>
        )}
      </div>
    </div>
  )
}
