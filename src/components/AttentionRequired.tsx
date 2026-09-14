import { TriangleAlert, ChevronRight } from 'lucide-react'

interface AttentionCardProps {
  label: string
  count: number
  description: string
  buttonText: string
  borderColor: string
  bgColor: string
  labelColor: string
  onButtonClick?: () => void
}

function AttentionCard({
  label,
  count,
  description,
  buttonText,
  borderColor,
  bgColor,
  labelColor,
  onButtonClick,
}: AttentionCardProps) {
  return (
    <div
      className="rounded-xl p-4 border"
      style={{ background: bgColor, borderColor }}
    >
      <div className="flex items-center gap-2 mb-2">
        <TriangleAlert className="w-3.5 h-3.5" style={{ color: labelColor }} />
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: labelColor }}
        >
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold mb-1 font-display" style={{ color: labelColor }}>
        {count}
        <span className="text-base font-normal text-slate-500 ml-1">conversations</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">{description}</p>
      <button
        onClick={onButtonClick}
        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
        style={{ color: labelColor, background: bgColor, borderColor }}
      >
        {buttonText}
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  )
}

interface AttentionData {
  slaAtRisk: number
  overdue: number
  humanFollowUp: number
}

export default function AttentionRequired({
  data,
  onNavigate,
}: {
  data?: AttentionData
  onNavigate?: (page: string) => void
}) {
  const attentionData = data || { slaAtRisk: 0, overdue: 0, humanFollowUp: 0 }

  const goToConversations = () => onNavigate?.('Conversations')

  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Attention Required
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <AttentionCard
          label="SLA At Risk"
          count={attentionData.slaAtRisk}
          description="Response deadline within 30 min"
          buttonText="View conversations"
          onButtonClick={goToConversations}
          borderColor="#fde68a"
          bgColor="#fffbeb"
          labelColor="#d97706"
        />
        <AttentionCard
          label="Overdue"
          count={attentionData.overdue}
          description="Past SLA deadline"
          buttonText="Resolve now"
          onButtonClick={goToConversations}
          borderColor="#fecaca"
          bgColor="#fef2f2"
          labelColor="#dc2626"
        />
        <AttentionCard
          label="Human Follow-Up"
          count={attentionData.humanFollowUp}
          description="Waiting for human agent response"
          buttonText="View queue"
          onButtonClick={goToConversations}
          borderColor="#bfdbfe"
          bgColor="#eff6ff"
          labelColor="#2563eb"
        />
      </div>
    </div>
  )
}
