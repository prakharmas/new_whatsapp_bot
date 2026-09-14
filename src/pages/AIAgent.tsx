import { useState, useEffect, useCallback } from 'react'
import {
  Bot,
  PenLine,
  TrendingUp,
  Users,
  TriangleAlert,
  Clock,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import api from '../services/api'

const textareaClass = "w-full text-sm text-slate-700 leading-relaxed outline-none resize-none border rounded-lg px-3 py-2 focus:border-blue-400 transition-colors border-slate-200"

export default function AIAgentPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  const [snapshot, setSnapshot] = useState({ name: '', instructions: '' })

  const [stats, setStats] = useState({
    resolution_rate: '0%',
    human_handover: '0%',
    unresolved: '0%',
    avg_response_time: '0 sec',
  })

  const fetchAgent = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [agentRes, statsRes] = await Promise.all([
        api.get('/api/vendor/agent'),
        api.get('/api/vendor/agent/stats'),
      ])

      if (agentRes.data.success && agentRes.data.data) {
        const agent = agentRes.data.data
        setName(agent.name || '')
        setInstructions(agent.context || '')
        setSnapshot({ name: agent.name || '', instructions: agent.context || '' })
      }

      if (statsRes.data.success && statsRes.data.data) {
        const s = statsRes.data.data
        setStats({
          resolution_rate: s.resolution_rate,
          human_handover: s.human_handover,
          unresolved: s.unresolved,
          avg_response_time: s.avg_response_time,
        })
      }
    } catch (err) {
      console.error('Failed to load agent data:', err)
      setError('Failed to load agent data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAgent()
  }, [fetchAgent])

  const cancelEdit = () => {
    setName(snapshot.name)
    setInstructions(snapshot.instructions)
    setEditing(false)
  }

  const saveChanges = async () => {
    try {
      setSaving(true)
      setError(null)
      const res = await api.put('/api/vendor/agent', { name, context: instructions })

      if (res.data.success) {
        setSnapshot({ name, instructions })
        setEditing(false)
      }
    } catch (err) {
      console.error('Failed to save agent:', err)
      setError('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const statsCards = [
    { label: 'AI Resolution Rate', value: stats.resolution_rate, color: '#16a34a', bg: '#f0fdf4', icon: TrendingUp },
    { label: 'Human Handover', value: stats.human_handover, color: '#d97706', bg: '#fffbeb', icon: Users },
    { label: 'Unresolved', value: stats.unresolved, color: '#dc2626', bg: '#fef2f2', icon: TriangleAlert },
    { label: 'Avg AI Response Time', value: stats.avg_response_time, color: '#2563eb', bg: '#eff6ff', icon: Clock },
  ]

  if (loading) {
    return (
      <div className="p-8 max-w-[960px] mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm text-slate-500">Loading agent configuration...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[960px] mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-display">AI Agent</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure and monitor your WhatsApp AI support agent.
          </p>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 disabled:opacity-50"
            >
              <PenLine className="w-3.5 h-3.5" />
              Cancel editing
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
          >
            <PenLine className="w-3.5 h-3.5" />
            Edit Agent
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 flex items-center justify-between" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center rounded-xl w-12 h-12 bg-blue-50">
            <Bot className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-display text-lg font-semibold text-slate-900 border-b border-blue-300 outline-none bg-transparent"
              />
            ) : (
              <div className="text-lg font-semibold text-slate-900 font-display">{name}</div>
            )}
            <div className="text-xs text-slate-400 mt-0.5">WhatsApp AI Support Agent</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50">
          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs font-semibold text-green-600">Active</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {statsCards.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg" style={{ background: s.bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                </div>
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
              <div className="text-2xl font-bold font-display" style={{ color: s.color }}>
                {s.value}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="text-sm font-semibold text-slate-800 mb-4 font-display">Agent Instructions</div>
        {editing ? (
          <textarea
            rows={8}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className={textareaClass}
            placeholder="Write instructions for how the AI agent should behave..."
          />
        ) : (
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{instructions || 'No instructions set yet.'}</p>
        )}
      </div>

      {editing && (
        <div className="mt-5 flex justify-end">
          <button
            onClick={saveChanges}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}
