import { useState, useEffect } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import api from '../services/api'

interface Conversation {
  id: string
  chatroomId: string
  name: string
  initials: string
  lastMessage: string
  handledBy: string
  sla: string
  slaVariant: 'green' | 'amber' | 'red'
  status: string
  statusVariant: 'green' | 'purple' | 'blue' | 'amber' | 'gray'
  resolution: string
  resolutionVariant: 'green' | 'gray'
  lastActivity: string
  updatedAt: string
  priority: string
  category: 'all' | 'attention' | 'ai' | 'human' | 'resolved'
}

interface ChatroomData {
  _id: string
  phone_number: string
  status: string
  thread_id?: string
  tags: string[]
  latestIntent: string | null
  latestSentiment: string | null
  conversationSentiment: { overall: string; confidence: number }
  slaInfo: { status: string; timeRemaining: string }
  totalMessages: number
  aiAnalyzedMessages: number
  createdAt: string
  updatedAt: string
}

const filters = ['Status', 'SLA', 'Priority', 'Date']

const tabs = [
  { label: 'All', key: 'all' },
  { label: 'Needs Attention', key: 'attention' },
  { label: 'AI Active', key: 'ai' },
  { label: 'Human Handover', key: 'human' },
  { label: 'Resolved', key: 'resolved' },
]

const slaStyles: Record<string, string> = {
  green: 'bg-green-50 text-green-600 border border-green-200',
  amber: 'bg-amber-50 text-amber-600 border border-amber-200',
  red: 'bg-red-50 text-red-600 border border-red-200',
}

const statusStyles: Record<string, string> = {
  green: 'bg-green-50 text-green-600 border border-green-200',
  purple: 'bg-purple-50 text-purple-600 border border-purple-200',
  blue: 'bg-blue-50 text-blue-600 border border-blue-200',
  amber: 'bg-amber-50 text-amber-600 border border-amber-200',
  gray: 'bg-slate-50 text-slate-500 border border-slate-200',
}

const resolutionStyles: Record<string, string> = {
  green: 'bg-green-50 text-green-600 border border-green-200',
  gray: 'bg-slate-50 text-slate-500 border border-slate-200',
}

const slaVariantFor = (status: string | undefined): Conversation['slaVariant'] => {
  if (status === 'overdue') return 'red'
  if (status === 'pending') return 'amber'
  return 'green'
}

const slaLabelFor = (status: string | undefined): string => {
  if (status === 'overdue') return 'Overdue'
  if (status === 'pending') return 'At Risk'
  if (status === 'closed') return 'Closed'
  return 'Within SLA'
}

const statusFor = (c: ChatroomData): { status: string; variant: Conversation['statusVariant'] } => {
  if (c.status === 'closed') return { status: 'Resolved', variant: 'green' }
  if (c.latestIntent === 'complaint' || c.latestIntent === 'need_action') {
    if (c.slaInfo?.status === 'overdue') return { status: 'Pending Closure', variant: 'amber' }
    return { status: 'Human Assigned', variant: 'purple' }
  }
  if (c.slaInfo?.status === 'pending' || c.slaInfo?.status === 'new') return { status: 'AI Active', variant: 'blue' }
  return { status: 'AI Resolved', variant: 'green' }
}

const resolutionFor = (c: ChatroomData): { resolution: string; resolutionVariant: Conversation['resolutionVariant'] } => {
  const status = c.slaInfo?.status
  if (c.status === 'closed') return { resolution: 'Resolved', resolutionVariant: 'green' }
  if (status === 'overdue') return { resolution: 'Waiting', resolutionVariant: 'gray' }
  return { resolution: 'Open', resolutionVariant: 'gray' }
}

const priorityFor = (c: ChatroomData): string => {
  if (c.slaInfo?.status === 'overdue' || c.latestIntent === 'complaint' || c.latestIntent === 'need_action') return 'High'
  if (c.slaInfo?.status === 'pending' || c.latestIntent === 'feedback') return 'Medium'
  return 'Low'
}

const timeAgo = (dateStr?: string): string => {
  if (!dateStr) return 'N/A'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const lastMessageFor = (c: ChatroomData): string => {
  if (c.latestIntent === 'complaint') return 'Customer reported an issue that needs attention.'
  if (c.latestIntent === 'need_action') return 'Customer requested an action from support.'
  if (c.latestIntent === 'feedback') return 'Customer provided feedback on resolution.'
  return 'Customer reached out with a query.'
}

const nameFor = (c: ChatroomData): { name: string; initials: string } => {
  const digits = c.phone_number.replace(/\D/g, '').slice(-4)
  const name = `Customer • ${digits || '—'}`
  const initials = digits ? digits.slice(0, 2) : 'C?'
  return { name, initials }
}

const categoryFor = (c: ChatroomData): Conversation['category'] => {
  if (c.status === 'closed') return 'resolved'
  const sla = c.slaInfo?.status
  if (sla === 'overdue') return 'attention'
  const isHandover = c.latestIntent === 'complaint' || c.latestIntent === 'need_action'
  if (isHandover) return 'human'
  return 'ai'
}

const toConversation = (c: ChatroomData): Conversation => {
  const id = `#${c.thread_id?.slice(-6) || c._id.slice(-6)}`
  const { name, initials } = nameFor(c)
  const status = statusFor(c)
  const sla = slaVariantFor(c.slaInfo?.status)
  const handledBy =
    c.status === 'closed' ? 'AI Agent' : c.latestIntent === 'complaint' || c.latestIntent === 'need_action' ? 'AI → Human' : 'AI Agent'
  return {
    id,
    chatroomId: c._id,
    name,
    initials,
    lastMessage: lastMessageFor(c),
    handledBy,
    sla: slaLabelFor(c.slaInfo?.status),
    slaVariant: sla,
    status: status.status,
    statusVariant: status.variant,
    ...resolutionFor(c),
    lastActivity: timeAgo(c.updatedAt),
    updatedAt: c.updatedAt,
    priority: priorityFor(c),
    category: categoryFor(c),
  }
}

interface ConversationsPageProps {
  onView: (id: string) => void
}

function FilterDropdown({
  label,
  options,
  value,
  open,
  onToggle,
  onSelect,
  onClear,
}: {
  label: string
  options: string[]
  value?: string
  open: boolean
  onToggle: () => void
  onSelect: (value: string) => void
  onClear: () => void
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg bg-white transition-colors ${
          value ? 'text-blue-600 border-blue-300 bg-blue-50' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
        }`}
      >
        {label}
        {value ? (
          <span className="max-w-[110px] truncate rounded bg-white border border-blue-200 px-1.5 py-0.5 font-normal">
            {value}
          </span>
        ) : null}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggle} />
          <div className="absolute left-0 top-full mt-1 min-w-[170px] rounded-lg border border-slate-200 bg-white shadow-lg z-20 py-1">
            <button
              onClick={onClear}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${!value ? 'font-semibold text-blue-600' : 'text-slate-500'}`}
            >
              All
            </button>
            {options.map((o) => (
              <button
                key={o}
                onClick={() => onSelect(o)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${value === o ? 'font-semibold text-blue-600' : 'text-slate-600'}`}
              >
                {o}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ConversationsPage({ onView }: ConversationsPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [openFilter, setOpenFilter] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get('/api/vendor/conversations')
      .then((response) => {
        if (!active) return
        if (response.data.success) {
          const rows = (response.data.data.chatrooms || []).map(toConversation)
          setConversations(rows)
        }
      })
      .catch((err: any) => {
        if (!active) return
        console.error('Failed to fetch conversations:', err)
        setError(err.response?.data?.error || 'Failed to load conversations')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const tabCounts = tabs.map((tab) => ({
    ...tab,
    count: conversations.filter((c) => tab.key === 'all' || c.category === tab.key).length,
  }))

  const statusOptions = Array.from(new Set(conversations.map((c) => c.status)))
  const slaOptions = Array.from(new Set(conversations.map((c) => c.sla)))
  const priorityOptions = Array.from(new Set(conversations.map((c) => c.priority)))
  const dateOptions = ['Today', 'Last 7 days', 'Last 30 days']
  const filterOptions: Record<string, string[]> = {
    Status: statusOptions,
    SLA: slaOptions,
    Priority: priorityOptions,
    Date: dateOptions,
  }

  const matchesFilters = (c: Conversation): boolean => {
    for (const [key, value] of Object.entries(activeFilters)) {
      if (!value) continue
      if (key === 'Status' && c.status !== value) return false
      if (key === 'SLA' && c.sla !== value) return false
      if (key === 'Priority' && c.priority !== value) return false
      if (key === 'Date') {
        const last = new Date(c.updatedAt).getTime()
        const now = Date.now()
        if (value === 'Today' && last < new Date().setHours(0, 0, 0, 0)) return false
        if (value === 'Last 7 days' && last < now - 7 * 24 * 60 * 60 * 1000) return false
        if (value === 'Last 30 days' && last < now - 30 * 24 * 60 * 60 * 1000) return false
      }
    }
    return true
  }

  const handleFilterSelect = (key: string, value: string) => {
    setActiveFilters((prev) => ({ ...prev, [key]: value }))
    setOpenFilter(null)
  }

  const handleFilterClear = (key: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setOpenFilter(null)
  }

  const filtered = conversations.filter((c) => {
    const tabMatch = activeTab === 'all' || c.category === activeTab
    if (!tabMatch) return false
    if (!matchesFilters(c)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
  })

  if (loading) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 font-display">Conversations</h1>
            <p className="text-sm text-slate-500 mt-1">
              Review customer interactions, AI performance and human handovers.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-slate-400">Loading conversations...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 font-display">Conversations</h1>
            <p className="text-sm text-slate-500 mt-1">
              Review customer interactions, AI performance and human handovers.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 font-display">Conversations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review customer interactions, AI performance and human handovers.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400 transition-colors"
          />
        </div>
        {filters.map((f) => (
          <FilterDropdown
            key={f}
            label={f}
            options={filterOptions[f] || []}
            value={activeFilters[f]}
            open={openFilter === f}
            onToggle={() => setOpenFilter(openFilter === f ? null : f)}
            onSelect={(value) => handleFilterSelect(f, value)}
            onClear={() => handleFilterClear(f)}
          />
        ))}
        
      </div>

      <div className="flex items-center gap-0 mb-4 border-b border-slate-200">
        {tabCounts.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative ${
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
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-400">Customer</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-400">Last Message</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-400">Handled By</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-400">SLA</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-400">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-400">Resolution</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-400">Last Activity</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-400"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No conversations found.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onView(c.chatroomId)}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex-shrink-0 flex items-center justify-center rounded-full w-[30px] h-[30px] text-xs font-semibold text-white bg-blue-600">
                        {c.initials}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{c.name}</div>
                        <div className="font-mono text-slate-400 text-xs">{c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px]">
                    <span className="truncate block">{c.lastMessage}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.handledBy}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${slaStyles[c.slaVariant]}`}>
                      {c.sla}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusStyles[c.statusVariant]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${resolutionStyles[c.resolutionVariant]}`}>
                      {c.resolution}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.lastActivity}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onView(c.chatroomId)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
