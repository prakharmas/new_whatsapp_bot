import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
} from 'lucide-react'
import api from '../services/api'

interface Transaction {
  _id: string
  description: string
  transaction_type: 'credit' | 'debit'
  amount_inr: number
  added_by: string
  created_at: string
}

interface WalletData {
  wallet: {
    balance_usd: number
    balance_inr: number
    last_updated: string
  }
  exchange_rate: number
  total_messages: number
  total_spent_inr: number
  avg_cost_inr: number
  daily_burn_inr: number
  days_remaining: number | null
  transactions: Transaction[]
  usage_summary: { service_type: string; count: number; total_cost: number }[]
}

const typeStyles: Record<string, string> = {
  debit: 'bg-red-50 text-red-600 border border-red-200',
  credit: 'bg-green-50 text-green-600 border border-green-200',
}

const typeLabels: Record<string, string> = {
  debit: 'Debit',
  credit: 'Credit',
}

function formatINR(amount: number) {
  return '\u20B9' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatINRDecimals(amount: number) {
  return '\u20B9' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' \u2014 ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function WalletPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<WalletData | null>(null)

  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/api/vendor/wallet')
      if (res.data.success) {
        setData(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load wallet:', err)
      setError('Failed to load wallet data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWallet()
  }, [fetchWallet])

  if (loading) {
    return (
      <div className="p-8 max-w-[960px] mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-sm text-slate-500">Loading wallet...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-[960px] mx-auto">
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { wallet, total_messages, total_spent_inr, avg_cost_inr, daily_burn_inr, days_remaining, transactions } = data

  return (
    <div className="p-8 max-w-[960px] mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-display">Wallet</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your balance, usage, and transaction history.
          </p>
        </div>
        <button
          onClick={fetchWallet}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border p-5 bg-slate-900" style={{ borderColor: '#1e293b' }}>
          <div className="text-xs text-slate-400 mb-2">Current Balance</div>
          <div className="text-3xl font-bold text-white mb-1 font-display">{formatINR(wallet.balance_inr)}</div>
          <div className="text-xs text-slate-500">${wallet.balance_usd.toFixed(2)} USD</div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            <span className="text-xs text-slate-500">Total Spent</span>
          </div>
          <div className="text-2xl font-bold text-red-600 font-display">{formatINR(total_spent_inr)}</div>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs text-slate-500">Messages Processed</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 font-display">{total_messages.toLocaleString()}</div>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-3.5 h-3.5 text-green-600" />
            <span className="text-xs text-slate-500">Avg Cost / Message</span>
          </div>
          <div className="text-2xl font-bold text-green-600 font-display">{formatINRDecimals(avg_cost_inr)}</div>
        </div>
      </div>

      {days_remaining !== null && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 mb-6">
          <div className="w-2 h-2 rounded-full bg-amber-600 flex-shrink-0" />
          <div className="text-sm text-slate-700">
            <span className="font-semibold text-amber-700">Balance notice:</span> At current usage rate of
            ~{formatINR(daily_burn_inr)}/day, your balance will last approximately{' '}
            <span className="font-semibold">{days_remaining} days</span>.
          </div>
          <button className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-amber-700 bg-amber-100 border border-amber-200 hover:bg-amber-200 transition-colors">
            Recharge now
          </button>
        </div>
      )}

      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Transaction History
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCw className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No transactions yet</p>
              <p className="text-xs text-slate-400 mt-1">Transactions will appear here once activity begins</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Added By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">{t.description}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeStyles[t.transaction_type] || ''}`}>
                        {t.transaction_type === 'debit' ? (
                          <ArrowDownLeft className="w-2.5 h-2.5" />
                        ) : (
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        )}
                        {typeLabels[t.transaction_type] || t.transaction_type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${t.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.transaction_type === 'credit' ? '+' : '-'}{formatINRDecimals(t.amount_inr)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{t.added_by}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
