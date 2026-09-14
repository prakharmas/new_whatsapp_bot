import { useState, useEffect } from 'react'
import {
  Save,
  RefreshCw,
  DollarSign,
  Bot,
  Clock,
  Calculator,
  Loader2,
} from 'lucide-react'
import api from '../services/api'

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
const labelClass = 'block text-xs font-medium text-slate-500 mb-1.5'
const cardClass =
  'bg-white rounded-2xl border border-slate-200 p-6'
const cardTitleClass = 'text-sm font-semibold text-slate-800 font-display flex items-center gap-2'

interface CostingData {
  gpt4_mini_input_price: number
  gpt4_mini_output_price: number
  whisper_price_per_minute: number
  new_user_4h_markup: number
  existing_user_20h_markup: number
  existing_user_24h_markup: number
  exchangeRate: number
}

const defaults: CostingData = {
  gpt4_mini_input_price: 0.00015,
  gpt4_mini_output_price: 0.0006,
  whisper_price_per_minute: 0.006,
  new_user_4h_markup: 50,
  existing_user_20h_markup: 30,
  existing_user_24h_markup: 20,
  exchangeRate: 83,
}

export default function CostingCalculation() {
  const [data, setData] = useState<CostingData>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Calculator state
  const [calcWindow, setCalcWindow] = useState('new_user_4h')
  const [calcInputTokens, setCalcInputTokens] = useState(100)
  const [calcOutputTokens, setCalcOutputTokens] = useState(50)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/api/admin/costing')
      if (res.data.success) {
        const { globalPricing, defaultMarkup, exchangeRate } = res.data.data
        setData({
          gpt4_mini_input_price: globalPricing?.gpt4_mini_input_price ?? defaults.gpt4_mini_input_price,
          gpt4_mini_output_price: globalPricing?.gpt4_mini_output_price ?? defaults.gpt4_mini_output_price,
          whisper_price_per_minute: globalPricing?.whisper_price_per_minute ?? defaults.whisper_price_per_minute,
          new_user_4h_markup: defaultMarkup?.new_user_4h_markup ?? defaults.new_user_4h_markup,
          existing_user_20h_markup: defaultMarkup?.existing_user_20h_markup ?? defaults.existing_user_20h_markup,
          existing_user_24h_markup: defaultMarkup?.existing_user_24h_markup ?? defaults.existing_user_24h_markup,
          exchangeRate: exchangeRate?.rate ?? defaults.exchangeRate,
        })
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load costing configuration.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000)
      return () => clearTimeout(t)
    }
  }, [success])

  const setField = (field: keyof CostingData, value: number) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const submitExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving('exchange')
    setError(null)
    setSuccess(null)
    try {
      const res = await api.post('/api/admin/costing/exchange-rate', { rate: data.exchangeRate })
      if (res.data.success) setSuccess(res.data.message)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update exchange rate.')
    } finally {
      setSaving(null)
    }
  }

  const submitGlobal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving('global')
    setError(null)
    setSuccess(null)
    try {
      const res = await api.post('/api/admin/costing/global', {
        gpt4_mini_input_price: data.gpt4_mini_input_price,
        gpt4_mini_output_price: data.gpt4_mini_output_price,
        whisper_price_per_minute: data.whisper_price_per_minute,
      })
      if (res.data.success) setSuccess(res.data.message)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update global pricing.')
    } finally {
      setSaving(null)
    }
  }

  const submitMarkup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving('markup')
    setError(null)
    setSuccess(null)
    try {
      const res = await api.post('/api/admin/costing/default-markup', {
        new_user_4h_markup: data.new_user_4h_markup,
        existing_user_20h_markup: data.existing_user_20h_markup,
        existing_user_24h_markup: data.existing_user_24h_markup,
      })
      if (res.data.success) setSuccess(res.data.message)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update default markup.')
    } finally {
      setSaving(null)
    }
  }

  // Calculator computations
  const markupFor = (w: string) =>
    w === 'new_user_4h'
      ? data.new_user_4h_markup
      : w === 'existing_user_20h'
      ? data.existing_user_20h_markup
      : data.existing_user_24h_markup

  const baseCost =
    (calcInputTokens / 1000) * data.gpt4_mini_input_price +
    (calcOutputTokens / 1000) * data.gpt4_mini_output_price
  const markupAmount = baseCost * (markupFor(calcWindow) / 100)
  const finalCost = baseCost + markupAmount
  const finalCostInr = finalCost * data.exchangeRate

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-display">Costing Calculation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure conversation rates, exchange rates, and AI service pricing.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exchange Rate */}
          <form onSubmit={submitExchangeRate} className={cardClass} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cardTitleClass}>
                <DollarSign className="w-4 h-4 text-blue-600" />
                Exchange Rate
              </h3>
              <span className="text-xs text-slate-400">1 USD = ? INR</span>
            </div>
            <div className="mb-4">
              <label className={labelClass}>USD to INR</label>
              <input
                type="number"
                value={data.exchangeRate}
                min={1}
                step="0.01"
                onChange={(e) => setField('exchangeRate', parseFloat(e.target.value) || 0)}
                className={inputClass}
                required
              />
              <p className="text-xs text-slate-400 mt-1">Current market rate for USD to INR conversion</p>
            </div>
            <button
              type="submit"
              disabled={saving === 'exchange'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving === 'exchange' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Update Exchange Rate
            </button>
          </form>

          {/* Global AI Service Pricing */}
          <form onSubmit={submitGlobal} className={cardClass} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="mb-4">
              <h3 className={cardTitleClass}>
                <Bot className="w-4 h-4 text-blue-600" />
                AI Service Pricing (Global)
              </h3>
              <p className="text-xs text-slate-400 mt-1">Base costs for all clients (USD per 1000 tokens)</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>GPT-4 Mini Input</label>
                <input
                  type="number"
                  value={data.gpt4_mini_input_price}
                  min={0}
                  step="0.000001"
                  onChange={(e) => setField('gpt4_mini_input_price', parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Per 1000 input tokens</p>
              </div>
              <div>
                <label className={labelClass}>GPT-4 Mini Output</label>
                <input
                  type="number"
                  value={data.gpt4_mini_output_price}
                  min={0}
                  step="0.000001"
                  onChange={(e) => setField('gpt4_mini_output_price', parseFloat(e.target.value) || 0)}
                  className={inputClass}
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Per 1000 output tokens</p>
              </div>
            </div>
            <div className="mb-4">
              <label className={labelClass}>Whisper STT</label>
              <input
                type="number"
                value={data.whisper_price_per_minute}
                min={0}
                step="0.000001"
                onChange={(e) => setField('whisper_price_per_minute', parseFloat(e.target.value) || 0)}
                className={inputClass}
                required
              />
              <p className="text-xs text-slate-400 mt-1">Per minute of audio</p>
            </div>
            <button
              type="submit"
              disabled={saving === 'global'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving === 'global' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Update Global Pricing
            </button>
          </form>

          {/* Default Markup */}
          <form onSubmit={submitMarkup} className={`${cardClass} lg:col-span-2`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="mb-4">
              <h3 className={cardTitleClass}>
                <Clock className="w-4 h-4 text-blue-600" />
                Conversation Window Markup
              </h3>
              <p className="text-xs text-slate-400 mt-1">Default markup percentages for new clients</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  { key: 'new_user_4h_markup' as const, title: 'New User (First 4 Hours)', desc: 'Premium rate for new customer interactions' },
                  { key: 'existing_user_20h_markup' as const, title: 'Existing User (4-24 Hours)', desc: 'Standard rate for ongoing conversations' },
                  { key: 'existing_user_24h_markup' as const, title: 'Long-term User (24+ Hours)', desc: 'Discounted rate for established customers' },
                ]
              ).map(({ key, title, desc }) => (
                <div key={key} className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-medium text-slate-800">{title}</div>
                  <p className="text-xs text-slate-400 mt-0.5 mb-3">{desc}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={data[key]}
                      min={0}
                      max={500}
                      step={1}
                      onChange={(e) => setField(key, parseFloat(e.target.value) || 0)}
                      className={inputClass}
                      required
                    />
                    <span className="text-sm font-medium text-slate-500">%</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="submit"
              disabled={saving === 'markup'}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 mt-5"
            >
              {saving === 'markup' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Update Default Markup
            </button>
          </form>

          {/* Pricing Calculator */}
          <div className={`${cardClass} lg:col-span-2`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="mb-4">
              <h3 className={cardTitleClass}>
                <Calculator className="w-4 h-4 text-blue-600" />
                Pricing Calculator
              </h3>
              <p className="text-xs text-slate-400 mt-1">Estimate costs for different scenarios</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Conversation Window</label>
                  <select
                    value={calcWindow}
                    onChange={(e) => setCalcWindow(e.target.value)}
                    className={inputClass}
                  >
                    <option value="new_user_4h">New User (4h)</option>
                    <option value="existing_user_20h">Existing User (20h)</option>
                    <option value="existing_user_24h">Long-term User (24h+)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Input Tokens</label>
                    <input
                      type="number"
                      value={calcInputTokens}
                      min={0}
                      onChange={(e) => setCalcInputTokens(parseInt(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Output Tokens</label>
                    <input
                      type="number"
                      value={calcOutputTokens}
                      min={0}
                      onChange={(e) => setCalcOutputTokens(parseInt(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Base Cost:', value: `$${baseCost.toFixed(6)}` },
                  { label: 'Markup:', value: `$${markupAmount.toFixed(6)}` },
                  { label: 'Final Cost:', value: `$${finalCost.toFixed(6)}` },
                  { label: 'Cost (INR):', value: `₹${finalCostInr.toFixed(4)}` },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center px-4 py-3 rounded-lg bg-slate-50"
                  >
                    <span className="font-medium text-slate-700 text-sm">{row.label}</span>
                    <span className="font-semibold text-blue-600 text-sm font-mono">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
