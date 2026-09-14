import { useState, useEffect } from 'react'
import { ArrowLeft, Bot, User, Clock, X, Loader2 } from 'lucide-react'
import api from '../services/api'

interface ChatMessage {
  sender: 'customer' | 'ai' | 'human'
  time: string
  text: string
}

interface MessageData {
  _id: string
  message_type: string
  content: string
  createdAt: string
  sentiment?: string
  intent?: string
  resolution_analysis?: { resolved: boolean; confidence: number; resolution_type: string; analyzed_at: string }
}

interface InsightsData {
  totalMessages: number
  userMessages: number
  aiAnalyzedMessages: number
  intents: { query: number; complaint: number; need_action: number; feedback: number }
  sentiments: { positive: number; neutral: number; negative: number }
  conversationSentiment: { overall: string; confidence: number }
  slaInfo: { status: string; timeRemaining: string }
}

interface ChatroomData {
  _id: string
  phone_number: string
  status: string
  thread_id?: string
  sla_deadline?: string
  createdAt: string
  updatedAt: string
}

const senderMeta: Record<ChatMessage['sender'], { label: string; color: string; bubbleBg: string; textColor: string; radius: string; align: 'start' | 'end'; iconBg?: string; iconColor?: string; icon?: typeof Bot | typeof User }> = {
  customer: {
    label: 'Customer',
    color: '#64748b',
    bubbleBg: '#25d366',
    textColor: '#fff',
    radius: '18px 18px 4px',
    align: 'end',
  },
  ai: {
    label: 'AI Agent',
    color: '#2563eb',
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    icon: Bot,
    bubbleBg: '#ffffff',
    textColor: '#1e293b',
    radius: '18px 18px 18px 4px',
    align: 'start',
  },
  human: {
    label: 'Human Agent',
    color: '#7c3aed',
    iconBg: '#faf5ff',
    iconColor: '#7c3aed',
    icon: User,
    bubbleBg: '#f5f3ff',
    textColor: '#1e293b',
    radius: '18px 18px 18px 4px',
    align: 'start',
  },
}

const formatTime = (dateStr?: string): string => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + formatTime(dateStr)
}

const senderFor = (type: string): ChatMessage['sender'] => {
  if (type === 'user') return 'customer'
  if (type === 'human') return 'human'
  return 'ai'
}

const slaVariantFor = (status?: string): string => {
  if (status === 'overdue') return 'bg-red-50 text-red-600 border border-red-200'
  if (status === 'pending') return 'bg-amber-50 text-amber-600 border border-amber-200'
  if (status === 'closed') return 'bg-green-50 text-green-600 border border-green-200'
  return 'bg-green-50 text-green-600 border border-green-200'
}

const slaLabelFor = (status?: string, timeRemaining?: string): string => {
  if (status === 'overdue') return 'Overdue'
  if (status === 'pending') return `At Risk — ${timeRemaining || 'N/A'} remaining`
  if (status === 'closed') return 'Resolved'
  return 'Within SLA'
}

const statusLabelFor = (status?: string): { label: string; variant: string } => {
  switch (status) {
    case 'closed':
      return { label: 'Resolved', variant: 'bg-green-50 text-green-600 border border-green-200' }
    case 'pending':
      return { label: 'Pending', variant: 'bg-amber-50 text-amber-600 border border-amber-200' }
    case 'overdue':
      return { label: 'Overdue', variant: 'bg-red-50 text-red-600 border border-red-200' }
    default:
      return { label: 'New', variant: 'bg-blue-50 text-blue-600 border border-blue-200' }
  }
}

const confidenceLabel = (sentiment?: { overall: string }): string => {
  if (!sentiment) return 'N/A'
  const map: Record<string, string> = {
    positive: 'Positive',
    neutral: 'Neutral',
    negative: 'Negative',
    unknown: 'Unknown',
  }
  return map[sentiment.overall] || sentiment.overall || 'N/A'
}

interface ConversationDetailProps {
  id: string
  onBack: () => void
}

export default function ConversationDetail({ id, onBack }: ConversationDetailProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatroom, setChatroom] = useState<ChatroomData | null>(null)
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEscalation, setShowEscalation] = useState(false)
  const [escalationForm, setEscalationForm] = useState({ subject: '', description: '', category: 'General', priority: 'Medium' })
  const [escalationSubmitting, setEscalationSubmitting] = useState(false)
  const [escalationSuccess, setEscalationSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get(`/api/vendor/chatroom/${id}`)
      .then((response) => {
        if (!active) return
        if (response.data.success) {
          const data = response.data.data
          setChatroom(data.chatroom)
          setInsights(data.insights)
          const rows: ChatMessage[] = (data.messages || []).map((m: MessageData) => ({
            sender: senderFor(m.message_type),
            time: formatTime(m.createdAt),
            text: m.content,
          }))
          setMessages(rows)
        }
      })
      .catch((err: any) => {
        if (!active) return
        console.error('Failed to fetch conversation:', err)
        setError(err.response?.data?.error || 'Failed to load conversation')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const openEscalation = () => {
    setError(null)
    setEscalationSuccess(null)
    const digits = chatroom?.phone_number?.replace(/\D/g, '').slice(-4) || 'Unknown'
    const convLabel = chatroom?.thread_id
      ? '#' + chatroom.thread_id.slice(-6)
      : '#' + (chatroom?._id || '').slice(-6)
    setEscalationForm({
      subject: `Escalation for conversation ${convLabel || 'Unknown'}`,
      description: `Escalation raised from conversation ${convLabel || 'Unknown'} (customer ${digits}).`,
      category: 'General',
      priority: 'Medium',
    })
    setShowEscalation(true)
  }

  const handleEscalationChange = (field: keyof typeof escalationForm, value: string) => {
    setEscalationForm((prev) => ({ ...prev, [field]: value }))
  }

  const submitEscalation = async (e: React.FormEvent) => {
    e.preventDefault()
    setEscalationSubmitting(true)
    setError(null)
    setEscalationSuccess(null)
    try {
      const res = await api.post('/api/vendor/escalations', escalationForm)
      if (res.data.success) {
        setEscalationSuccess(res.data.message || 'Escalation raised successfully')
        setShowEscalation(false)
      } else {
        setError(res.data.error || 'Failed to raise escalation.')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to raise escalation.')
    } finally {
      setEscalationSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-100">
        <div className="text-sm text-slate-400">Loading conversation...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-100">
        <div className="text-sm text-red-500 mb-4">{error}</div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Conversations
        </button>
      </div>
    )
  }

  const slaStatus = insights?.slaInfo?.status
  const slaTime = insights?.slaInfo?.timeRemaining
  const threadId = `#${chatroom?.thread_id?.slice(-6) || chatroom?._id.slice(-6) || 'Unknown'}`
  const phone = chatroom?.phone_number || '—'

  const insightRows = [
    { k: 'Resolution', v: chatroom?.status === 'closed' ? 'Resolved' : insights?.slaInfo?.status === 'overdue' ? 'Overdue' : 'Pending', color: chatroom?.status === 'closed' ? '#16a34a' : '#d97706' },
    { k: 'Handled By', v: messages.some((m) => m.sender === 'human') ? 'AI → Human' : 'AI Agent', color: '#1e293b' },
    { k: 'Messages', v: String(insights?.totalMessages ?? messages.length), color: '#1e293b' },
    { k: 'Customer Sentiment', v: confidenceLabel(insights?.conversationSentiment), color: '#1e293b' },
    { k: 'SLA', v: slaLabelFor(slaStatus, slaTime), color: slaStatus === 'overdue' || slaStatus === 'pending' ? '#d97706' : '#16a34a' },
  ]

  return (
    <div className="flex flex-col h-full bg-slate-100">
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-3 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Conversations
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Conversation</div>
              <div className="font-mono font-semibold text-slate-800">{threadId}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Customer</div>
              <div className="text-sm font-medium text-slate-800">{phone}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Started</div>
              <div className="text-sm text-slate-600">{formatDate(chatroom?.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">Status</div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusLabelFor(chatroom?.status).variant}`}>
                {statusLabelFor(chatroom?.status).label}
              </span>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-0.5">SLA</div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${slaVariantFor(slaStatus)}`}>
                {slaLabelFor(slaStatus, slaTime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {escalationSuccess && (
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-green-50 border-b border-green-200 text-sm text-green-700">
          <span>{escalationSuccess}</span>
          <button onClick={() => setEscalationSuccess(null)} className="text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">
                No messages in this conversation.
              </div>
            ) : (
              messages.map((m, i) => {
                const meta = senderMeta[m.sender]
                const isLeft = meta.align === 'start'
                return (
                  <div key={i} className={`flex flex-col gap-1 ${isLeft ? 'items-start' : 'items-end'}`}>
                    <div className={`flex items-center gap-1.5 mb-0.5 ${isLeft ? '' : 'flex-row-reverse'}`}>
                      {m.sender !== 'customer' && meta.icon && (
                        <div
                          className="flex items-center justify-center rounded"
                          style={{ width: 16, height: 16, background: meta.iconBg }}
                        >
                          <meta.icon className="w-2.5 h-2.5" style={{ color: meta.iconColor }} />
                        </div>
                      )}
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-slate-400">{m.time}</span>
                    </div>
                    <div
                      className="max-w-sm px-4 py-2.5 text-sm leading-relaxed"
                      style={{
                        background: meta.bubbleBg,
                        color: meta.textColor,
                        borderRadius: meta.radius,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        ...(m.sender !== 'customer' ? { border: '1px solid #e2e8f0' } : {}),
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-4">
            <div className="flex items-center gap-3">
              {/* <button className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                Assign Agent
              </button> */}
              {/* <button className="px-4 py-2 rounded-lg text-sm font-medium border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                Mark Resolved
              </button> */}
              <button
                onClick={openEscalation}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                Raise Escalation
              </button>
            </div>
          </div>
        </div>

        <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto">
          <div className="p-5 space-y-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Conversation Insights
              </div>
              <div className="space-y-3">
                {insightRows.map((row) => (
                  <div key={row.k} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-slate-400 flex-shrink-0">{row.k}</span>
                    <span className="text-right font-medium text-xs leading-relaxed" style={{ color: row.color }}>
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Analysis Breakdown
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Intents</div>
                  <div className="text-xs text-slate-600">
                    {insights?.intents?.query ?? 0} query · {insights?.intents?.complaint ?? 0} complaint ·{' '}
                    {insights?.intents?.need_action ?? 0} action · {insights?.intents?.feedback ?? 0} feedback
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Sentiments</div>
                  <div className="text-xs text-slate-600">
                    {insights?.sentiments?.positive ?? 0} positive · {insights?.sentiments?.neutral ?? 0} neutral ·{' '}
                    {insights?.sentiments?.negative ?? 0} negative
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">AI Confidence</div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                    <Clock className="w-3 h-3" /> {insights?.conversationSentiment?.confidence ?? 0}%
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              {/* <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Internal Note
              </div>
              <textarea
                placeholder="Add an internal note..."
                rows={3}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 resize-none outline-none focus:border-blue-400 transition-colors"
              />
              <button className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                Save Note
              </button> */}
            </div>
          </div>
        </div>
      </div>

      {showEscalation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900 font-display">Raise Escalation</h3>
              <button onClick={() => setShowEscalation(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitEscalation} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Subject *</label>
                <input
                  type="text"
                  value={escalationForm.subject}
                  onChange={(e) => handleEscalationChange('subject', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Description *</label>
                <textarea
                  value={escalationForm.description}
                  onChange={(e) => handleEscalationChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Category</label>
                  <input
                    type="text"
                    value={escalationForm.category}
                    onChange={(e) => handleEscalationChange('category', e.target.value)}
                    placeholder="e.g. Technical, Billing"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Priority</label>
                  <select
                    value={escalationForm.priority}
                    onChange={(e) => handleEscalationChange('priority', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEscalation(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={escalationSubmitting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {escalationSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {escalationSubmitting ? 'Raising...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
