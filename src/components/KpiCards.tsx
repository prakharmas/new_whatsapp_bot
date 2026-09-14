import {
  MessageSquare,
  Lock,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string
  trend?: string
  trendUp?: boolean
  iconBg: string
  icon: React.ReactNode
}

function KpiCard({ label, value, trend, trendUp = true, iconBg, icon }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1 font-display">{value}</div>
      {trend && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          {trendUp ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : (
            <TrendingDown className="w-3 h-3 text-amber-500" />
          )}
          {trend}
        </div>
      )}
    </div>
  )
}

interface KpiData {
  totalConversations: number
  resolutionRate: number
  humanHandoverRate: number
  slaCompliance: number
  avgResponseTime: number
}

export default function KpiCards({ data }: { data?: KpiData }) {
  const kpis = data
    ? [
        {
          label: 'Total Conversations',
          value: data.totalConversations.toLocaleString(),
          trend: 'Active conversations',
          trendUp: true,
          iconBg: '#eff6ff',
          icon: <MessageSquare className="w-3.5 h-3.5" stroke="#2563eb" />,
        },
        {
          label: 'AI Resolution Rate',
          value: `${data.resolutionRate}%`,
          trend: 'Resolved without human intervention',
          trendUp: true,
          iconBg: '#f0fdf4',
          icon: <Lock className="w-3.5 h-3.5" stroke="#16a34a" />,
        },
        {
          label: 'Human Handover Rate',
          value: `${data.humanHandoverRate}%`,
          trend: 'Transferred to an agent',
          trendUp: false,
          iconBg: '#fffbeb',
          icon: <Users className="w-3.5 h-3.5" style={{ color: '#d97706' }} />,
        },
        {
          label: 'SLA Compliance',
          value: `${data.slaCompliance}%`,
          trend: 'Target ≥ 90%',
          trendUp: data.slaCompliance >= 90,
          iconBg: '#f0fdf4',
          icon: <CheckCircle className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />,
        },
        {
          label: 'Avg Response Time',
          value: `${data.avgResponseTime} min`,
          trend: 'Average first response',
          trendUp: data.avgResponseTime < 30,
          iconBg: '#f5f3ff',
          icon: <Clock className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} />,
        },
      ]
    : [
        {
          label: 'Total Conversations',
          value: '0',
          trend: 'Loading...',
          trendUp: true,
          iconBg: '#eff6ff',
          icon: <MessageSquare className="w-3.5 h-3.5" stroke="#2563eb" />,
        },
        {
          label: 'AI Resolution Rate',
          value: '0%',
          trend: 'Loading...',
          trendUp: true,
          iconBg: '#f0fdf4',
          icon: <Lock className="w-3.5 h-3.5" stroke="#16a34a" />,
        },
        {
          label: 'Human Handover Rate',
          value: '0%',
          trend: 'Loading...',
          trendUp: false,
          iconBg: '#fffbeb',
          icon: <Users className="w-3.5 h-3.5" style={{ color: '#d97706' }} />,
        },
        {
          label: 'SLA Compliance',
          value: '0%',
          trend: 'Loading...',
          trendUp: true,
          iconBg: '#f0fdf4',
          icon: <CheckCircle className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />,
        },
        {
          label: 'Avg Response Time',
          value: '0 min',
          trend: 'Loading...',
          trendUp: true,
          iconBg: '#f5f3ff',
          icon: <Clock className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} />,
        },
      ]

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  )
}
