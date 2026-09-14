import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'

interface ChartDataPoint {
  day: string
  total: number
  aiResolved: number
  humanHandover: number
}

const defaultData: ChartDataPoint[] = [
  { day: 'Mon', total: 0, aiResolved: 0, humanHandover: 0 },
  { day: 'Tue', total: 0, aiResolved: 0, humanHandover: 0 },
  { day: 'Wed', total: 0, aiResolved: 0, humanHandover: 0 },
  { day: 'Thu', total: 0, aiResolved: 0, humanHandover: 0 },
  { day: 'Fri', total: 0, aiResolved: 0, humanHandover: 0 },
  { day: 'Sat', total: 0, aiResolved: 0, humanHandover: 0 },
  { day: 'Sun', total: 0, aiResolved: 0, humanHandover: 0 },
]

const CustomLegend = () => (
  <ul className="flex justify-center gap-4 text-[11px] pt-2">
    <li className="inline-flex items-center">
      <svg width="14" height="14" viewBox="0 0 32 32" className="mr-1">
        <path strokeWidth="4" fill="none" stroke="#2563eb" d="M0,16h10.67A5.33,5.33,0,1,1,21.33,16H32M21.33,16A5.33,5.33,0,1,1,10.67,16" />
      </svg>
      <span className="text-slate-500">AI Resolved</span>
    </li>
    <li className="inline-flex items-center">
      <svg width="14" height="14" viewBox="0 0 32 32" className="mr-1">
        <path strokeWidth="4" fill="none" stroke="#f59e0b" d="M0,16h10.67A5.33,5.33,0,1,1,21.33,16H32M21.33,16A5.33,5.33,0,1,1,10.67,16" />
      </svg>
      <span className="text-slate-500">Human Handover</span>
    </li>
    <li className="inline-flex items-center">
      <svg width="14" height="14" viewBox="0 0 32 32" className="mr-1">
        <rect fill="#bfdbfe" x="0" y="4" width="32" height="24" />
      </svg>
      <span className="text-slate-500">Total</span>
    </li>
  </ul>
)

export default function SupportPerformanceChart({ data, label }: { data?: ChartDataPoint[]; label?: string }) {
  const chartData = data && data.length > 0 ? data : defaultData

  return (
    <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="mb-4">
        <div className="text-sm font-semibold text-slate-800 font-display">Support Performance</div>
        <div className="text-xs text-slate-400 mt-0.5">{label ? `${label} trend` : '7 days trend'}</div>
      </div>
      <ResponsiveContainer width="100%" height={190}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickFormatter={(v) => String(v)}
          />
          <Tooltip />
          <Legend content={<CustomLegend />} />
          <Bar
            dataKey="total"
            name="Total"
            fill="#bfdbfe"
            radius={[3, 3, 0, 0]}
            barSize={56}
          />
          <Line
            type="monotone"
            dataKey="aiResolved"
            name="AI Resolved"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="humanHandover"
            name="Human Handover"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
