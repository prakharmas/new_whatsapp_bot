import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  User,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import api from '../services/api'

interface EscalationMessage {
  sender: 'vendor' | 'support'
  sender_name: string
  text: string
  createdAt: string
}

interface Escalation {
  _id: string
  escalation_id: string
  vendor_id: string
  subject: string
  description: string
  category: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In Progress' | 'Resolved'
  assigned_to: string
  messages: EscalationMessage[]
  createdAt: string
  updatedAt: string
}

const priorityStyles: Record<string, string> = {
  High: 'bg-red-50 text-red-600 border border-red-200',
  Medium: 'bg-amber-50 text-amber-600 border border-amber-200',
  Low: 'bg-slate-50 text-slate-500 border border-slate-200',
}

const statusStyles: Record<string, string> = {
  'In Progress': 'bg-blue-50 text-blue-600 border border-blue-200',
  Open: 'bg-slate-50 text-slate-500 border border-slate-200',
  Resolved: 'bg-green-50 text-green-600 border border-green-200',
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const sameDay = new Date().toDateString() === d.toDateString()
  if (sameDay) {
    return 'Today ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export default function EscalationDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [escalation, setEscalation] = useState<Escalation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [text, setText] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get(`/api/vendor/escalations/${id}`)
        if (res.data.success) {
          setEscalation(res.data.data)
        }
      } catch (err: any) {
        console.error('Failed to load escalation:', err)
        setError(err.response?.data?.error || 'Failed to load escalation.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const sendMessage = async () => {
    if (!text.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await api.post(`/api/vendor/escalations/${id}/messages`, { text: text.trim() })
      if (res.data.success) {
        const updated = await api.get(`/api/vendor/escalations/${id}`)
        if (updated.data.success) setEscalation(updated.data.data)
        setText('')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  const updateStatus = async (status: 'Open' | 'In Progress' | 'Resolved') => {
    setUpdatingStatus(status)
    setError(null)
    try {
      const res = await api.patch(`/api/vendor/escalations/${id}/status`, { status })
      if (res.data.success && escalation) {
        setEscalation({ ...escalation, status: res.data.data.status })
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update status.')
    } finally {
      setUpdatingStatus(null)
    }
  }

  if (loading) {
    return (
      <div className="p-8 max-w-[1100px] mx-auto flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!escalation) {
    return (
      <div className="p-8 max-w-[1100px] mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-5 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Escalations
        </button>
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <p className="text-sm text-slate-500">{error || 'Escalation not found'}</p>
        </div>
      </div>
    )
  }

  const messages = escalation.messages || []
  const timeline: { title: string; time: string; by: string; color: string }[] = [
    { title: 'Escalation raised', time: formatDateTime(escalation.createdAt), by: `— ${escalation.vendor_id}`, color: '#64748b' },
    ...messages.map((m) => ({
      title: m.sender === 'support' ? 'Support response' : 'Vendor message',
      time: formatDateTime(m.createdAt),
      by: `— ${m.sender_name || (m.sender === 'support' ? 'NxtQ Team' : 'Vendor')}`,
      color: m.sender === 'support' ? '#2563eb' : '#7c3aed',
    })),
  ]

  const statusRows = [
    { k: 'Status', v: escalation.status, color: '#1e293b' },
    { k: 'Priority', v: escalation.priority, color: escalation.priority === 'High' ? '#dc2626' : '#1e293b' },
    { k: 'Assigned To', v: escalation.assigned_to || 'Unassigned', color: '#1e293b' },
    { k: 'Last Updated', v: formatDateTime(escalation.updatedAt), color: '#1e293b' },
  ]

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-5 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Escalations
      </button>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono font-bold text-base text-blue-600">{escalation.escalation_id}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[escalation.status]}`}>
                    {escalation.status}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyles[escalation.priority]}`}>
                    {escalation.priority}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 font-display">{escalation.subject}</h2>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-100 mb-4">
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Category</div>
                <div className="text-sm font-medium text-slate-800">{escalation.category}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Created</div>
                <div className="text-sm font-medium text-slate-800">{formatDateTime(escalation.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Assigned To</div>
                <div className="text-sm font-medium text-slate-800">{escalation.assigned_to || 'Unassigned'}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</div>
              <p className="text-sm text-slate-600 leading-relaxed">{escalation.description}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="text-sm font-semibold text-slate-800 mb-4 font-display">Timeline</div>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400">No activity yet.</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full mt-1" style={{ background: t.color }} />
                      {i < timeline.length - 1 && (
                        <div className="w-px flex-1 mt-1 bg-slate-200" style={{ minHeight: 24 }} />
                      )}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="text-sm text-slate-700 font-medium">{t.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{t.time}</span>
                        <span className="text-xs" style={{ color: t.color }}>{t.by}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="text-sm font-semibold text-slate-800 mb-4 font-display">Messages</div>
            {messages.length === 0 ? (
              <p className="text-sm text-slate-400 mb-4">No messages yet.</p>
            ) : (
              <div className="space-y-4 mb-4">
                {messages.map((m, i) => {
                  const isSupport = m.sender === 'support'
                  return (
                    <div key={i} className={`flex flex-col gap-1 ${isSupport ? 'items-start' : 'items-end'}`}>
                      <div className={`flex items-center gap-1.5 mb-0.5 ${isSupport ? '' : 'flex-row-reverse'}`}>
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">{m.sender_name || (isSupport ? 'NxtQ Team' : 'Vendor')}</span>
                        <span className="text-xs text-slate-400">{formatDateTime(m.createdAt)}</span>
                      </div>
                      <div
                        className="max-w-sm px-4 py-2.5 rounded-xl text-sm leading-relaxed"
                        style={{
                          background: isSupport ? '#eff6ff' : '#f8fafc',
                          color: '#1e293b',
                          border: `1px solid ${isSupport ? '#bfdbfe' : '#e2e8f0'}`,
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
              <textarea
                placeholder="Add a message..."
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none resize-none focus:border-blue-400 transition-colors mb-3"
              />
              <button
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Send
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="text-sm font-semibold text-slate-800 mb-4 font-display">Status</div>
            <div className="space-y-3">
              {statusRows.map((row) => (
                <div key={row.k}>
                  <div className="text-xs text-slate-400 mb-0.5">{row.k}</div>
                  <div className="text-sm font-medium" style={{ color: row.color }}>{row.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
              {escalation.status !== 'Resolved' ? (
                <button
                  onClick={() => updateStatus('Resolved')}
                  disabled={updatingStatus === 'Resolved'}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-sm font-medium border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  {updatingStatus === 'Resolved' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Mark Resolved
                </button>
              ) : (
                <button
                  onClick={() => updateStatus('Open')}
                  disabled={updatingStatus === 'Open'}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-sm font-medium border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  {updatingStatus === 'Open' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Reopen
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="text-sm font-semibold text-slate-800 mb-3 font-display">SLA</div>
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">Response within 2h for {escalation.priority} priority</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">Raised {formatDateTime(escalation.createdAt)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
