import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, X, RefreshCw, CircleAlert } from 'lucide-react'
import api from '../services/api'

interface Escalation {
  _id: string
  escalation_id: string
  subject: string
  category: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Open' | 'In Progress' | 'Resolved'
  created_at: string
  updated_at: string
  messages_count: number
}

interface Stats {
  open: number
  inProgress: number
  resolved: number
}

interface EscalationsPageProps {
  onView: (id: string) => void
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

function formatDate(iso: string) {
  const d = new Date(iso)
  const sameDay = new Date().toDateString() === d.toDateString()
  if (sameDay) {
    return 'Today ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
const labelClass = 'block text-xs font-medium text-slate-500 mb-1.5'

export default function EscalationsPage({ onView }: EscalationsPageProps) {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [stats, setStats] = useState<Stats>({ open: 0, inProgress: 0, resolved: 0 })
  const [activeTab, setActiveTab] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Raise modal
  const [showRaise, setShowRaise] = useState(false)
  const [form, setForm] = useState({ subject: '', description: '', category: 'General', priority: 'Medium' })
  const [submitting, setSubmitting] = useState(false)

  const fetchEscalations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/api/vendor/escalations')
      if (res.data.success) {
        setEscalations(res.data.data.escalations)
        setStats(res.data.data.stats)
      }
    } catch (err: any) {
      console.error('Failed to load escalations:', err)
      setError(err.response?.data?.error || 'Failed to load escalations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEscalations()
  }, [fetchEscalations])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000)
      return () => clearTimeout(t)
    }
  }, [success])

  const total = stats.open + stats.inProgress + stats.resolved
  const tabs = [
    { label: 'All', count: total },
    { label: 'Open', count: stats.open },
    { label: 'In Progress', count: stats.inProgress },
    { label: 'Resolved', count: stats.resolved },
  ]

  const statCards = [
    { label: 'Open', value: stats.open, bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' },
    { label: 'In Progress', value: stats.inProgress, bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' },
    { label: 'Resolved', value: stats.resolved, bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
    { label: 'Total', value: total, bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed' },
  ]

  const filtered =
    activeTab === 'All'
      ? escalations
      : escalations.filter((e) => e.status === activeTab)

  const openRaise = () => {
    setForm({ subject: '', description: '', category: 'General', priority: 'Medium' })
    setError(null)
    setShowRaise(true)
  }

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const submitRaise = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await api.post('/api/vendor/escalations', form)
      if (res.data.success) {
        setSuccess(res.data.message)
        setShowRaise(false)
        await fetchEscalations()
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to raise escalation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-display">Escalations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Raise and track issues that require support from our team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEscalations}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={openRaise}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Raise Escalation
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border p-4"
            style={{ background: s.bg, borderColor: s.border }}
          >
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className="text-2xl font-bold font-display" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-0 mb-4 border-b border-slate-200">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.label
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`}
              style={{ borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent' }}
            >
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CircleAlert className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No escalations found</p>
            <p className="text-xs text-slate-400 mt-1">Raise an escalation to get support</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Ticket ID</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Subject</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Priority</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Created</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-400"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{e.escalation_id}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium max-w-[260px]">
                    <span className="truncate block">{e.subject}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{e.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${priorityStyles[e.priority]}`}>
                      {e.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(e.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusStyles[e.status]}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onView(e._id)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Raise Escalation modal */}
      {showRaise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900 font-display">Raise Escalation</h3>
              <button onClick={() => setShowRaise(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitRaise} className="px-6 py-5 space-y-4">
              <div>
                <label className={labelClass}>Subject *</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  placeholder="Brief summary of the issue"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe the issue in detail"
                  rows={4}
                  className={`${inputClass} resize-none`}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    placeholder="e.g. Technical, Billing"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => handleChange('priority', e.target.value)}
                    className={inputClass}
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
                  onClick={() => setShowRaise(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? 'Raising...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
