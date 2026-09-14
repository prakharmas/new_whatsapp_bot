import { useState } from 'react'
import { Building2, ChevronDown } from 'lucide-react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { VendorSelectionProvider, useVendorSelection } from './contexts/VendorSelectionContext'
import Sidebar from './components/Sidebar'
import Overview from './pages/Overview'
import Conversations from './pages/Conversations'
import ConversationDetail from './pages/ConversationDetail'
import AIAgent from './pages/AIAgent'
import Uploads from './pages/Uploads'
import Escalations from './pages/Escalations'
import EscalationDetail from './pages/EscalationDetail'
import Wallet from './pages/Wallet'
import Clients from './pages/Clients'
import CostingCalculation from './pages/CostingCalculation'
import Finance from './pages/Finance'
import Login from './pages/Login'

function AppContent() {
  const { vendor, isAdmin, isLoading } = useAuth()
  const { selectedVendorId, vendors, setSelectedVendorId } = useVendorSelection()
  const [activePage, setActivePage] = useState('Overview')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [selectedEscalation, setSelectedEscalation] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f1f5f9]">
        <div className="text-sm text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!vendor && !isAdmin) {
    return <Login />
  }

  const handleNavigate = (page: string) => {
    setActivePage(page)
    setSelectedConversation(null)
    setSelectedEscalation(null)
  }

  const renderPage = () => {
    if (activePage === 'Conversations' && selectedConversation) {
      return <ConversationDetail id={selectedConversation} onBack={() => setSelectedConversation(null)} />
    }
    if (activePage === 'Conversations') {
      return <Conversations onView={(id) => setSelectedConversation(id)} />
    }
    if (activePage === 'Escalations' && selectedEscalation) {
      return <EscalationDetail id={selectedEscalation} onBack={() => setSelectedEscalation(null)} />
    }
    if (activePage === 'Escalations') {
      return <Escalations onView={(id) => setSelectedEscalation(id)} />
    }
    switch (activePage) {
      case 'Overview':
        return <Overview onNavigate={handleNavigate} />
      case 'AI Agent':
        return <AIAgent />
      case 'Uploads':
        return <Uploads />
      case 'Wallet':
        return <Wallet />
      case 'Clients':
        return isAdmin ? <Clients /> : <Overview />
      case 'Costing Calculation':
        return isAdmin ? <CostingCalculation /> : <Overview />
      case 'Finance':
        return isAdmin ? <Finance /> : <Overview />
      default:
        return <Overview />
    }
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#f1f5f9]">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {isAdmin &&
          activePage !== 'Clients' &&
          activePage !== 'Costing Calculation' &&
          activePage !== 'Finance' && (
          <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Viewing
            </label>
            <div className="relative w-64">
              <select
                value={selectedVendorId || ''}
                onChange={(e) => setSelectedVendorId(e.target.value || null)}
                className="w-full appearance-none bg-slate-900 text-white text-sm font-medium rounded-lg border border-slate-700 px-3 py-1.5 pr-8 focus:outline-none focus:border-blue-500 transition-colors"
              >
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>{v.company_name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}
        <main key={isAdmin ? selectedVendorId || 'none' : 'vendor'} className="flex-1 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <VendorSelectionProvider>
        <AppContent />
      </VendorSelectionProvider>
    </AuthProvider>
  )
}
