import { useState, useEffect, useCallback } from 'react'
import {
  Wallet,
  PlusCircle,
  Receipt,
  Search,
  Plus,
  RefreshCw,
  Loader2,
  X,
  IndianRupee,
} from 'lucide-react'
import api from '../services/api'

type Tab = 'wallet' | 'topups' | 'billing'

interface WalletRow {
  vendor_id: string
  company_name: string
  balance_usd_micro: number
}

interface Topup {
  _id: string
  createdAt: string
  vendor_id: string
  vendor_name: string
  amount_inr: number
  amount_usd_micro: number
  exchange_rate: number
  added_by: string
  description: string
}

interface Billing {
  _id: string
  charged_at: string
  vendor_id: string
  vendor_name: string
  phone_number: string
  services_used: { service_type: string }[]
  base_cost_usd_micro: number
  final_cost_usd_micro: number
}

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
const labelClass = 'block text-xs font-medium text-slate-500 mb-1.5'

const tabs: { key: Tab; label: string }[] = [
  { key: 'wallet', label: 'Wallet Management' },
  { key: 'topups', label: 'Top-up History' },
  { key: 'billing', label: 'Billing History' },
]

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// function windowDisplay(w: string) {
//   if (w === 'new_user_4h') return 'New User (0-4h)'
//   if (w === 'existing_user_20h') return 'Existing (4-24h)'
//   if (w === 'existing_user_24h+') return 'Existing (24h+)'
//   return 'Unknown'
// }

function statusFor(balanceUSD: number) {
  if (balanceUSD === 0) return { label: 'Empty', cls: 'bg-red-50 text-red-600 border-red-200' }
  if (balanceUSD < 1) return { label: 'Low', cls: 'bg-amber-50 text-amber-600 border-amber-200' }
  return { label: 'Good', cls: 'bg-green-50 text-green-600 border-green-200' }
}

export default function Finance() {
  const [tab, setTab] = useState<Tab>('wallet')

  // Wallet
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const [exchangeRate, setExchangeRate] = useState<number>(83)
  const [walletSearch, setWalletSearch] = useState('')
  const [walletFilter, setWalletFilter] = useState('all')

  // Topups
  const [topups, setTopups] = useState<Topup[]>([])

  // Billing
  const [billings, setBillings] = useState<Billing[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Topup modal
  const [showModal, setShowModal] = useState(false)
  const [topupVendor, setTopupVendor] = useState<WalletRow | null>(null)
  const [amountInr, setAmountInr] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadWallet = useCallback(async () => {
    const res = await api.get('/api/admin/wallet')
    if (res.data.success) {
      setWallets(res.data.data)
      setExchangeRate(res.data.exchangeRate)
    }
  }, [])

  const loadTopups = useCallback(async () => {
    const res = await api.get('/api/admin/topup-history')
    if (res.data.success) setTopups(res.data.data)
  }, [])

  const loadBillings = useCallback(async () => {
    const res = await api.get('/api/admin/billing-history')
    if (res.data.success) setBillings(res.data.data)
  }, [])

  const reloadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadWallet(), loadTopups(), loadBillings()])
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load finance data.')
    } finally {
      setLoading(false)
    }
  }, [loadWallet, loadTopups, loadBillings])

  useEffect(() => {
    reloadAll()
  }, [reloadAll])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000)
      return () => clearTimeout(t)
    }
  }, [success])

  const openTopup = (w: WalletRow) => {
    setTopupVendor(w)
    setAmountInr('')
    setDescription('')
    setError(null)
    setShowModal(true)
  }

  const submitTopup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topupVendor) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await api.post('/api/admin/wallet/topup', {
        vendor_id: topupVendor.vendor_id,
        amount_inr: parseFloat(amountInr),
        description: description.trim() || 'Admin top-up',
      })
      if (res.data.success) {
        setSuccess(res.data.message)
        setShowModal(false)
        await reloadAll()
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process top-up.')
    } finally {
      setSubmitting(false)
    }
  }

  const usdAmount = (parseFloat(amountInr) || 0) / exchangeRate

  const filteredWallets = wallets.filter((w) => {
    const term = walletSearch.toLowerCase()
    const matchesSearch =
      !term ||
      w.company_name.toLowerCase().includes(term) ||
      w.vendor_id.toLowerCase().includes(term)
    let matchesFilter = true
    const b = (w.balance_usd_micro || 0) / 1000000
    if (walletFilter === 'low' && b >= 1) matchesFilter = false
    else if (walletFilter === 'zero' && b > 0) matchesFilter = false
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-display">Finance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage client wallets, top-ups, and usage billing.
          </p>
        </div>
        <button
          onClick={reloadAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl border border-slate-200 p-1 w-fit" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* WALLET TAB */}
          {tab === 'wallet' && (
            <>
              <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={walletSearch}
                    onChange={(e) => setWalletSearch(e.target.value)}
                    placeholder="Search clients..."
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <select
                  value={walletFilter}
                  onChange={(e) => setWalletFilter(e.target.value)}
                  className={`${inputClass} w-auto`}
                >
                  <option value="all">All Balances</option>
                  <option value="low">Low Balance (&lt; $1)</option>
                  <option value="zero">Zero Balance</option>
                </select>
                <span className="text-xs text-slate-500">
                  Exchange Rate: 1 USD = ₹{exchangeRate}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Client</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Balance (USD)</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Balance (INR)</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWallets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">No clients found</td>
                      </tr>
                    ) : (
                      filteredWallets.map((w) => {
                        const balUSD = (w.balance_usd_micro || 0) / 1000000
                        const status = statusFor(balUSD)
                        return (
                          <tr key={w.vendor_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-green-50 flex-shrink-0">
                                  <Wallet className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800">{w.company_name}</div>
                                  <div className="text-xs text-slate-400 font-mono">{w.vendor_id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 font-medium text-slate-700 font-mono">${balUSD.toFixed(6)}</td>
                            <td className="px-5 py-3 text-slate-600 font-mono">₹{(balUSD * exchangeRate).toFixed(2)}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${status.cls}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() => openTopup(w)}
                                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                                Top Up
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* TOPUPS TAB */}
          {tab === 'topups' && (
            <>
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 font-display flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-blue-600" /> Recent Top-ups
                </h3>
                <span className="text-xs text-slate-400">Latest wallet credits across all clients</span>
              </div>
              <div className="overflow-x-auto">
                {topups.length === 0 ? (
                  <div className="text-center py-16">
                    <PlusCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No Top-ups Found</p>
                    <p className="text-xs text-slate-400 mt-1">No wallet top-ups have been recorded yet.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Date</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Client</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Amount (INR)</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Amount (USD)</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Exchange Rate</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Added By</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topups.map((t) => (
                        <tr key={t._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-slate-500">{formatDate(t.createdAt)}</td>
                          <td className="px-5 py-3">
                            <div className="font-medium text-slate-800">{t.vendor_name}</div>
                            <div className="text-xs text-slate-400 font-mono">{t.vendor_id}</div>
                          </td>
                          <td className="px-5 py-3 font-semibold text-slate-700">₹{t.amount_inr.toLocaleString()}</td>
                          <td className="px-5 py-3 font-medium text-slate-600 font-mono">${(t.amount_usd_micro / 1000000).toFixed(4)}</td>
                          <td className="px-5 py-3 text-slate-500">₹{t.exchange_rate}</td>
                          <td className="px-5 py-3 text-slate-500">{t.added_by}</td>
                          <td className="px-5 py-3 text-slate-500">{t.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* BILLING TAB */}
          {tab === 'billing' && (
            <>
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800 font-display flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-600" /> Recent Billing
                </h3>
                <span className="text-xs text-slate-400">Latest usage charges across all clients</span>
              </div>
              <div className="overflow-x-auto">
                {billings.length === 0 ? (
                  <div className="text-center py-16">
                    <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">No Billing Records Found</p>
                    <p className="text-xs text-slate-400 mt-1">No usage charges have been recorded yet.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Date</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Client</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Phone</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Services</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Base Cost (USD)</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400">Final Cost (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billings.map((b) => (
                        <tr key={b._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-slate-500">{formatDate(b.charged_at)}</td>
                          <td className="px-5 py-3">
                            <div className="font-medium text-slate-800">{b.vendor_name}</div>
                            <div className="text-xs text-slate-400 font-mono">{b.vendor_id}</div>
                          </td>
                          <td className="px-5 py-3 text-slate-500 font-mono">{b.phone_number}</td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-1">
                              {(b.services_used || []).map((s, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-xs font-medium"
                                >
                                  {s.service_type}
                                </span>
                              ))}
                              {(b.services_used || []).length === 0 && (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-600">
                            ${((b.base_cost_usd_micro || 0) / 1000000).toFixed(6)}
                          </td>
                          <td className="px-5 py-3 font-mono font-semibold text-red-600">
                            ${((b.final_cost_usd_micro || 0) / 1000000).toFixed(6)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Top-up Modal */}
      {showModal && topupVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900 font-display flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-blue-600" /> Top Up Wallet
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitTopup} className="px-6 py-5 space-y-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-500">Client:</span>
                  <span className="text-sm font-medium text-slate-800">
                    {topupVendor.company_name}
                    <span className="text-xs text-slate-400 font-mono ml-2">({topupVendor.vendor_id})</span>
                  </span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Amount (INR)</label>
                <input
                  type="number"
                  value={amountInr}
                  onChange={(e) => setAmountInr(e.target.value)}
                  placeholder="Enter amount in INR"
                  min={1}
                  step="0.01"
                  className={inputClass}
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Equivalent: ${usdAmount.toFixed(6)} USD</p>
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Monthly top-up, Initial balance"
                  className={inputClass}
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? 'Adding...' : 'Add Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
