import { useState, useEffect } from 'react'
import KpiCards from '../components/KpiCards'
import AttentionRequired from '../components/AttentionRequired'
import SupportPerformanceChart from '../components/SupportPerformanceChart'
import ResolutionBreakdown from '../components/ResolutionBreakdown'
import SLAPerformance from '../components/SLAPerformance'
import RecentEscalations from '../components/RecentEscalations'
import { Building2 } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useVendorSelection } from '../contexts/VendorSelectionContext'

const timeFilters = [
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
]

interface TrendPoint {
  day: string
  total: number
  aiResolved: number
  humanHandover: number
}

interface DashboardData {
  analytics: {
    totalAnalyzed: number
    sentiments: { positive: number; neutral: number; negative: number }
    intents: { query: number; complaint: number; need_action: number; feedback: number }
    resolution: {
      totalQueries: number
      analyzedResponses: number
      resolvedQueries: number
      humanHandoverCount: number
      resolutionRate: number
      avgConfidence: number
      avgResponseTime: number
    }
  }
  chatrooms: Array<{
    _id: string
    phone_number: string
    status: string
    thread_id?: string
    sla_deadline?: string
    tags: string[]
    slaInfo: { status: string; timeRemaining: string }
    latestIntent: string | null
    latestSentiment: string | null
    conversationSentiment: { overall: string; confidence: number }
    totalMessages: number
  }>
  vendor: {
    vendor_id: string
    company_name: string
    email: string
  }
  trend: TrendPoint[]
  days: number
}

export default function Overview({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { isAdmin } = useAuth()
  const { selectedVendorId, vendors, setSelectedVendorId } = useVendorSelection()
  const [activeFilter, setActiveFilter] = useState(timeFilters[1])
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async (days?: number) => {
    try {
      setLoading(true)
      const params = days ? { days } : {}
      const response = await api.get('/api/vendor/dashboard', { params })
      if (response.data.success) {
        setDashboardData(response.data.data)
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard:', err)
      setError(err.response?.data?.error || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Admin with no vendor selected: don't fetch, show the select-vendor state.
    if (isAdmin && !selectedVendorId) {
      setLoading(false)
      setDashboardData(null)
      setError(null)
      return
    }
    fetchDashboard(activeFilter.days)
  }, [isAdmin, selectedVendorId])

  const handleFilterChange = (f: (typeof timeFilters)[number]) => {
    setActiveFilter(f)
    fetchDashboard(f.days)
  }

  // Admin/superadmin before selecting a vendor
  if (isAdmin && !selectedVendorId) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 font-display">Overview</h1>
            <p className="text-sm text-slate-500 mt-1">
              Monitor WhatsApp support performance and identify conversations that need attention.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-center rounded-xl w-14 h-14 bg-blue-50 mx-auto mb-4">
            <Building2 className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 font-display mb-1">Select a vendor to get started</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            You are logged in as an administrator. Use the dropdown in the sidebar to choose a vendor and view their dashboard.
          </p>
          {vendors.length > 0 ? (
            <select
              value={selectedVendorId || ''}
              onChange={(e) => setSelectedVendorId(e.target.value || null)}
              className="w-full max-w-xs mx-auto appearance-none bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a vendor...</option>
              {vendors.map((v) => (
                <option key={v.vendor_id} value={v.vendor_id}>{v.company_name}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-slate-400">No active vendors available.</p>
          )}
        </div>
      </div>
    )
  }

  const analytics = dashboardData?.analytics
  const chatrooms = dashboardData?.chatrooms || []

  const totalConversations = chatrooms.length
  const resolutionRate = analytics?.resolution?.resolutionRate || 0
  const humanHandoverRate = analytics?.resolution?.analyzedResponses
    ? Math.round(((analytics.resolution.humanHandoverCount || 0) / analytics.resolution.analyzedResponses) * 100)
    : 0
  const unresolvedRate = 100 - resolutionRate - humanHandoverRate

  const isSlaAtRisk = (c: DashboardData['chatrooms'][number]): boolean => {
    if (c.slaInfo?.status !== 'pending' || !c.sla_deadline) return false
    const deadline = new Date(c.sla_deadline).getTime()
    if (Number.isNaN(deadline)) return false
    return (deadline - Date.now()) / 60000 <= 30
  }

  const slaAtRisk = chatrooms.filter(isSlaAtRisk).length
  const overdue = chatrooms.filter((c) => c.slaInfo?.status === 'overdue').length
  const closedCount = chatrooms.filter((c) => c.status === 'closed').length
  const withinSlaCount = chatrooms.filter((c) => c.slaInfo?.status === 'pending' && !isSlaAtRisk(c)).length
  const humanFollowUp = chatrooms.filter((c) =>
    c.status !== 'closed' && (c.latestIntent === 'complaint' || c.latestIntent === 'need_action')
  ).length
  const slaCompliance = totalConversations > 0
    ? Math.round(((closedCount + withinSlaCount + slaAtRisk) / totalConversations) * 100)
    : 100

  const recentEscalations = chatrooms
    .filter((c) => c.status === 'overdue' || c.status === 'pending')
    .slice(0, 5)
    .map((c) => ({
      id: `#${c.thread_id?.slice(-4) || c._id.slice(-4)}`,
      customer: c.phone_number,
      reason: c.latestIntent === 'complaint' ? 'Complaint' : c.latestIntent === 'need_action' ? 'Needs action' : 'Follow-up',
      from: 'AI → Human',
      priority: c.slaInfo?.status === 'overdue' ? 'High' as const : 'Medium' as const,
      status: c.status === 'closed' ? 'Resolved' as const : 'Waiting' as const,
      age: c.slaInfo?.timeRemaining || 'N/A',
    }))

  if (loading) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-slate-400">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-display">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor your WhatsApp support performance and identify conversations that need attention.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white border border-slate-200">
            {timeFilters.map((f) => (
              <button
                key={f.label}
                onClick={() => handleFilterChange(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeFilter.label === f.label
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white text-green-600">
            <span className="inline-block rounded-full w-[7px] h-[7px] bg-green-600" />
            WhatsApp Connected
          </div>
        </div>
      </div>

      <KpiCards
        data={{
          totalConversations,
          resolutionRate,
          humanHandoverRate,
          slaCompliance,
          avgResponseTime: analytics?.resolution?.avgResponseTime || 0,
        }}
      />
      <AttentionRequired data={{ slaAtRisk, overdue, humanFollowUp }} onNavigate={onNavigate} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <SupportPerformanceChart data={dashboardData?.trend} label={activeFilter.label} />
        <ResolutionBreakdown
          data={{ aiResolutionRate: resolutionRate, humanHandoverRate, unresolvedRate: Math.max(0, unresolvedRate) }}
          totalConversations={totalConversations}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <SLAPerformance
          data={{
            slaCompliance,
            withinSla: closedCount + withinSlaCount,
            atRisk: slaAtRisk,
            overdue,
          }}
        />
        <RecentEscalations data={recentEscalations} />
      </div>
    </div>
  )
}
