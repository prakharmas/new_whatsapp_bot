import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Plus,
  Pencil,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react'
import api from '../services/api'

interface Client {
  vendor_id: string
  company_name: string
  email: string
  phone: string
  is_active: boolean
  createdAt: string
  chatroomCount: number
  messageCount: number
  walletBalanceUSD: number
}

interface ClientForm {
  company_name: string
  email: string
  phone: string
  password: string
  whatsapp_phone_id: string
  whatsapp_access_token: string
  webhook_verify_token: string
  whatsapp_app_secret: string
  is_active: boolean
}

const emptyForm: ClientForm = {
  company_name: '',
  email: '',
  phone: '',
  password: '',
  whatsapp_phone_id: '',
  whatsapp_access_token: '',
  webhook_verify_token: '',
  whatsapp_app_secret: '',
  is_active: true,
}

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/api/admin/clients')
      if (res.data.success) {
        setClients(res.data.data)
      }
    } catch (err: any) {
      console.error('Failed to load clients:', err)
      setError(err.response?.data?.error || 'Failed to load clients.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000)
      return () => clearTimeout(t)
    }
  }, [success])

  const openCreate = () => {
    setForm(emptyForm)
    setView('create')
    setEditingId(null)
    setError(null)
  }

  const openEdit = async (client: Client) => {
    try {
      setError(null)
      const res = await api.get(`/api/admin/clients/${client.vendor_id}`)
      if (res.data.success) {
        const v = res.data.data
        setForm({
          company_name: v.company_name || '',
          email: v.email || '',
          phone: v.phone || '',
          password: '',
          whatsapp_phone_id: v.whatsapp_phone_id || '',
          whatsapp_access_token: v.whatsapp_access_token || '',
          webhook_verify_token: v.webhook_verify_token || '',
          whatsapp_app_secret: v.whatsapp_app_secret || '',
          is_active: v.is_active,
        })
        setEditingId(client.vendor_id)
        setView('edit')
        setSuccess(null)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load client details.')
    }
  }

  const handleChange = (field: keyof ClientForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      if (view === 'create') {
        const res = await api.post('/api/admin/clients', form)
        if (res.data.success) {
          setSuccess(res.data.message)
          setView('list')
          await fetchClients()
        }
      } else {
        const { password, ...payload } = form
        const body = password ? { ...payload, password } : payload
        const res = await api.put(`/api/admin/clients/${editingId}`, body)
        if (res.data.success) {
          setSuccess(res.data.message)
          setView('list')
          await fetchClients()
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save client.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (client: Client) => {
    try {
      setError(null)
      const res = await api.post(`/api/admin/clients/${client.vendor_id}/toggle`)
      if (res.data.success) {
        setClients((prev) =>
          prev.map((c) =>
            c.vendor_id === client.vendor_id ? { ...c, is_active: res.data.data.is_active } : c
          )
        )
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update client status.')
    }
  }

  const fieldLabel = 'block text-xs font-medium text-slate-500 mb-1.5'

  if (view === 'create' || view === 'edit') {
    const isEdit = view === 'edit'
    return (
      <div className="p-8 max-w-[720px] mx-auto">
        <button
          onClick={() => setView('list')}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-5 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Clients
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 font-display">
              {isEdit ? 'Edit Client' : 'Add Client'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isEdit ? 'Update the details for this client.' : 'Create a new client account.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="text-sm font-semibold text-slate-800 mb-4 font-display">Account Details</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className={fieldLabel}>Company Name *</label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={fieldLabel}>Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={fieldLabel}>Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={inputClass}
                placeholder="+91..."
              />
            </div>
            <div>
              <label className={fieldLabel}>Password {isEdit ? '(leave blank to keep)' : '*'}</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className={inputClass}
                required={!isEdit}
              />
            </div>
          </div>

          <div className="text-sm font-semibold text-slate-800 mb-4 font-display">WhatsApp Configuration</div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className={fieldLabel}>WhatsApp Phone ID</label>
              <input
                type="text"
                value={form.whatsapp_phone_id}
                onChange={(e) => handleChange('whatsapp_phone_id', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabel}>WhatsApp Access Token</label>
              <input
                type="text"
                value={form.whatsapp_access_token}
                onChange={(e) => handleChange('whatsapp_access_token', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabel}>Webhook Verify Token</label>
              <input
                type="text"
                value={form.webhook_verify_token}
                onChange={(e) => handleChange('webhook_verify_token', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={fieldLabel}>WhatsApp App Secret</label>
              <input
                type="text"
                value={form.whatsapp_app_secret}
                onChange={(e) => handleChange('whatsapp_app_secret', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              Active client
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setView('list')}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-display">Clients</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage the client accounts on your platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchClients}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Client
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No clients yet</p>
            <p className="text-xs text-slate-400 mt-1">Add your first client to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Conversations</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Messages</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.vendor_id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center rounded-lg w-8 h-8 bg-blue-50 flex-shrink-0">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 truncate">{c.company_name}</div>
                        <div className="text-xs text-slate-400 font-mono">{c.vendor_id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Mail className="w-3 h-3" />
                      {c.email}
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                        <Phone className="w-3 h-3" />
                        {c.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.chatroomCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-600">{c.messageCount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(c)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        c.is_active
                          ? 'bg-green-50 text-green-600 border-green-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {c.is_active ? (
                        <CheckCircle className="w-2.5 h-2.5" />
                      ) : (
                        <XCircle className="w-2.5 h-2.5" />
                      )}
                      {c.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{formatDate(c.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(c)}
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
