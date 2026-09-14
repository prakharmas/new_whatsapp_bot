import { CheckCircle } from 'lucide-react'

interface SlaData {
  slaCompliance: number
  withinSla: number
  atRisk: number
  overdue: number
}

export default function SLAPerformance({ data }: { data?: SlaData }) {
  const slaData = data || { slaCompliance: 0, withinSla: 0, atRisk: 0, overdue: 0 }
  const isCompliant = slaData.slaCompliance >= 90

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="text-sm font-semibold text-slate-800 mb-4 font-display">SLA Performance</div>

      <div className="flex items-end gap-2 mb-4">
        <span className="text-3xl font-bold text-slate-900 font-display">{slaData.slaCompliance}%</span>
        <span className={`text-xs font-medium mb-1 flex items-center gap-1 ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
          <CheckCircle className="w-3 h-3" /> {isCompliant ? 'Compliant' : 'Non-Compliant'}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>Actual: {slaData.slaCompliance}%</span>
          <span>Target: 90%</span>
        </div>
        <div className="relative h-2 rounded-full bg-slate-100">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${isCompliant ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(slaData.slaCompliance, 100)}%` }}
          />
          <div
            className="absolute rounded-full bg-slate-400"
            style={{ left: '90%', width: 2, top: -2, bottom: -2 }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        <div className="rounded-lg py-2 bg-slate-50">
          <div className="text-base font-bold text-green-600 font-display">{slaData.withinSla}</div>
          <div className="text-xs text-slate-400 mt-0.5 leading-tight">Within SLA</div>
        </div>
        <div className="rounded-lg py-2 bg-slate-50">
          <div className="text-base font-bold text-amber-600 font-display">{slaData.atRisk}</div>
          <div className="text-xs text-slate-400 mt-0.5 leading-tight">At Risk</div>
        </div>
        <div className="rounded-lg py-2 bg-slate-50">
          <div className="text-base font-bold text-red-600 font-display">{slaData.overdue}</div>
          <div className="text-xs text-slate-400 mt-0.5 leading-tight">Overdue</div>
        </div>
      </div>

      {/* <button className="w-full text-xs font-medium py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100">
        View SLA conversations
      </button> */}
    </div>
  )
}
