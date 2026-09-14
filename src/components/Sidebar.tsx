import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  Upload,
  CircleAlert,
  Wallet,
  // CircleQuestionMark,
  LogOut,
  Users,
  Calculator,
} from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'

const topNav = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: MessageSquare, label: 'Conversations' },
  { icon: Bot, label: 'AI Agent' },
  { icon: Upload, label: 'Uploads' },
  { icon: CircleAlert, label: 'Escalations' },
  { icon: Wallet, label: 'Wallet' },
]

// const bottomNav = [
//   { icon: CircleQuestionMark, label: 'Help & Support' },
// ]

interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { vendor, isAdmin, role, name, email, logout } = useAuth()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const displayName = isAdmin ? (name || role || 'Admin') : vendor?.company_name || 'Guest'

  return (
    <aside className="flex flex-col flex-shrink-0 h-full w-[240px] bg-slate-900">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
        <div className="flex items-center justify-center rounded-lg w-8 h-8">
        {/* <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-green-600"> */}
          <FaWhatsapp className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <div className="font-semibold text-white text-sm leading-tight">NxtQ</div>
          <div className="text-xs text-slate-400">Business CRM</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {topNav.map((item) => {
          const isActive = activePage === item.label
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.label)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 group relative ${
                isActive
                  ? 'bg-blue-600/10 text-blue-300'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />
              )}
              <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}

        {isAdmin && (
          <>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1">
              Administration
            </div>
            <button
              onClick={() => onNavigate('Clients')}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 group relative ${
                activePage === 'Clients'
                  ? 'bg-blue-600/10 text-blue-300'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {activePage === 'Clients' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />
              )}
              <Users className="w-4 h-4" strokeWidth={activePage === 'Clients' ? 2.5 : 2} />
              <span className="text-sm font-medium">Clients</span>
            </button>
            <button
              onClick={() => onNavigate('Costing Calculation')}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 group relative ${
                activePage === 'Costing Calculation'
                  ? 'bg-blue-600/10 text-blue-300'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {activePage === 'Costing Calculation' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />
              )}
              <Calculator className="w-4 h-4" strokeWidth={activePage === 'Costing Calculation' ? 2.5 : 2} />
              <span className="text-sm font-medium">Costing Calculation</span>
            </button>
            <button
              onClick={() => onNavigate('Finance')}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 group relative ${
                activePage === 'Finance'
                  ? 'bg-blue-600/10 text-blue-300'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {activePage === 'Finance' && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-600 rounded-r-full" />
              )}
              <Wallet className="w-4 h-4" strokeWidth={activePage === 'Finance' ? 2.5 : 2} />
              <span className="text-sm font-medium">Finance</span>
            </button>
          </>
        )}
      </nav>

      <div className="px-3 pb-4 border-t border-white/5 pt-3 flex flex-col gap-0.5">
        {/* {bottomNav.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.label}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 text-slate-500 hover:text-slate-400 hover:bg-white/5"
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })} */}

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150 text-slate-500 hover:text-red-400 hover:bg-white/5"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Logout</span>
        </button>

        <div className="mt-3 mx-0 px-3 py-3 rounded-lg bg-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-full w-[30px] h-[30px] bg-blue-600 text-white text-xs font-bold flex-shrink-0">
              {displayName ? getInitials(displayName) : 'NA'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">
                {isAdmin ? `${displayName} (${role})` : displayName}
              </div>
              <div className="text-xs text-slate-500">{email || vendor?.email || ''}</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
