interface ResolutionData {
  aiResolutionRate: number
  humanHandoverRate: number
  unresolvedRate: number
}

export default function ResolutionBreakdown({ data, totalConversations = 0 }: { data?: ResolutionData; totalConversations?: number }) {
  const resolutionData = data || { aiResolutionRate: 0, humanHandoverRate: 0, unresolvedRate: 0 }

  const bars = [
    { label: 'AI Resolution Rate', value: `${resolutionData.aiResolutionRate}%`, width: `${resolutionData.aiResolutionRate}%`, color: '#2563eb' },
    { label: 'Human Handover Rate', value: `${resolutionData.humanHandoverRate}%`, width: `${resolutionData.humanHandoverRate}%`, color: '#f59e0b' },
    { label: 'Unresolved', value: `${resolutionData.unresolvedRate}%`, width: `${resolutionData.unresolvedRate}%`, color: '#ef4444' },
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="text-sm font-semibold text-slate-800 font-display">Resolution Breakdown</div>
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500">{bar.label}</span>
            <span className="text-sm font-bold font-display" style={{ color: bar.color }}>
              {bar.value}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full" style={{ width: bar.width, background: bar.color }} />
          </div>
        </div>
      ))}
      <div className="mt-auto pt-3 border-t border-slate-100 text-xs text-slate-400 leading-relaxed">
        {resolutionData.aiResolutionRate > 0 && totalConversations > 0
          ? `AI is handling ${Math.round(resolutionData.aiResolutionRate / 100 * totalConversations)} of ${totalConversations} conversations without human involvement.`
          : 'No resolution data available yet.'}
      </div>
    </div>
  )
}
