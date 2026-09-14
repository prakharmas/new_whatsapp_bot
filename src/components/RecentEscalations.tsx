// import { ArrowUpRight } from 'lucide-react'

interface Escalation {
  id: string
  customer: string
  reason: string
  from: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Waiting' | 'Resolved'
  age: string
}

const priorityStyles: Record<string, string> = {
  High: 'bg-red-50 text-red-600 border border-red-200',
  Medium: 'bg-amber-50 text-amber-600 border border-amber-200',
  Low: 'bg-slate-50 text-slate-500 border border-slate-200',
}

const statusStyles: Record<string, string> = {
  Waiting: 'bg-amber-50 text-amber-600 border border-amber-200',
  Resolved: 'bg-green-50 text-green-600 border border-green-200',
}

export default function RecentEscalations({ data }: { data?: Escalation[] }) {
  const escalations = data || []

  return (
    <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-slate-800 font-display">Recent Escalations</div>
        {/* <button className="flex items-center gap-1 text-xs font-medium text-blue-600">
          View all <ArrowUpRight className="w-3 h-3" />
        </button> */}
      </div>
      {escalations.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-400">No escalations found</div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left pb-2 font-medium text-slate-400">Conversation</th>
              <th className="text-left pb-2 font-medium text-slate-400">Customer</th>
              <th className="text-left pb-2 font-medium text-slate-400">Reason</th>
              <th className="text-left pb-2 font-medium text-slate-400">From</th>
              <th className="text-left pb-2 font-medium text-slate-400">Priority</th>
              <th className="text-left pb-2 font-medium text-slate-400">Status</th>
              <th className="text-left pb-2 font-medium text-slate-400">Age</th>
              {/* <th className="text-left pb-2 font-medium text-slate-400"></th> */}
            </tr>
          </thead>
          <tbody>
            {escalations.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                <td className="py-2.5 font-mono font-medium text-blue-600">{e.id}</td>
                <td className="py-2.5 text-slate-600">{e.customer}</td>
                <td className="py-2.5 text-slate-600">{e.reason}</td>
                <td className="py-2.5 text-slate-500">{e.from}</td>
                <td className="py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityStyles[e.priority]}`}>
                    {e.priority}
                  </span>
                </td>
                <td className="py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[e.status]}`}>
                    {e.status}
                  </span>
                </td>
                <td className="py-2.5 text-slate-400">{e.age}</td>
                {/* <td className="py-2.5">
                  <button className="px-2.5 py-1 rounded-md text-xs font-medium border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100">
                    View
                  </button>
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
