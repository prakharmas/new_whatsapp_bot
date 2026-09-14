import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Upload,
  FileText,
  CheckCircle,
  X,
  CircleAlert,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react'
import api from '../services/api'

interface UploadBatch {
  _id: string
  original_name: string
  file_type: string
  total_rows: number
  success_rows: number
  error_rows: number
  status: string
  columns: string[]
  created_at: string
}

interface BatchRecord {
  _id: string
  row_number: number
  fields: Record<string, string | number>
  status: string
  validation_errors: string[]
}

const statusStyles: Record<string, string> = {
  completed: 'bg-green-50 text-green-600 border border-green-200',
  failed: 'bg-red-50 text-red-600 border border-red-200',
  processing: 'bg-blue-50 text-blue-600 border border-blue-200',
}

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-2.5 h-2.5" />,
  failed: <CircleAlert className="w-2.5 h-2.5" />,
  processing: <Loader2 className="w-2.5 h-2.5 animate-spin" />,
}

const statusLabels: Record<string, string> = {
  completed: 'Completed',
  failed: 'Failed',
  processing: 'Processing',
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

export default function UploadsPage() {
  const [batches, setBatches] = useState<UploadBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // View data modal
  const [viewingBatch, setViewingBatch] = useState<UploadBatch | null>(null)
  const [records, setRecords] = useState<BatchRecord[]>([])
  const [viewLoading, setViewLoading] = useState(false)

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/api/vendor/uploads')
      if (res.data.success) {
        setBatches(res.data.data.batches)
      }
    } catch (err) {
      console.error('Failed to load uploads:', err)
      setError('Failed to load upload history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(t)
    }
  }, [success])

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Only CSV and Excel (.xlsx, .xls) files are supported.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10 MB.')
      return
    }

    try {
      setUploading(true)
      setError(null)
      setSuccess(null)
      const formData = new FormData()
      formData.append('file', file)

      const res = await api.post('/api/vendor/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data.success) {
        setSuccess(res.data.message)
        await fetchBatches()
      }
    } catch (err: any) {
      console.error('Upload failed:', err)
      const msg = err.response?.data?.error || 'Upload failed. Please try again.'
      setError(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDelete = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this upload batch?')) return

    try {
      setDeletingId(batchId)
      setError(null)
      const res = await api.delete(`/api/vendor/uploads/${batchId}`)
      if (res.data.success) {
        setBatches(prev => prev.filter(b => b._id !== batchId))
        setSuccess('Upload batch deleted successfully.')
      }
    } catch (err) {
      console.error('Delete failed:', err)
      setError('Failed to delete batch.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleView = async (batch: UploadBatch) => {
    setViewingBatch(batch)
    setRecords([])
    setViewLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/vendor/uploads/${batch._id}/records`)
      if (res.data.success) {
        setRecords(res.data.data.records)
      }
    } catch (err: any) {
      console.error('Failed to load records:', err)
      setError(err.response?.data?.error || 'Failed to load saved records.')
    } finally {
      setViewLoading(false)
    }
  }

  const allColumns = viewingBatch?.columns || []

  return (
    <div className="p-8 max-w-[960px] mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-display">Uploads</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage customer and contact data used by your WhatsApp support workflows.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Uploading...' : 'Upload Contacts'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileInput}
        className="hidden"
      />

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-xl border-2 border-dashed bg-white mb-6 transition-colors ${
          dragOver
            ? 'border-blue-400 bg-blue-50/50'
            : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="flex items-center justify-center rounded-xl mb-4 w-14 h-14 bg-blue-50">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div className="text-base font-semibold text-slate-800 mb-1 font-display">
            {uploading ? 'Uploading file...' : 'Drag & drop your file here'}
          </div>
          <p className="text-sm text-slate-400 mb-4">Supports CSV and Excel (.xlsx) files</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-5 py-2 rounded-lg text-sm font-medium border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50"
          >
            Browse files
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-blue-100 bg-blue-50/60 mb-6">
        <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-600 leading-relaxed">
          All columns from your CSV or Excel file are detected and stored as-is.
          Any column name works — no hardcoded fields.
        </p>
      </div>

      <div>
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Upload History
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No uploads yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload a CSV or Excel file to get started</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">File</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Records</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Successful</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Errors</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Uploaded</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800 text-xs font-mono">{b.original_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.total_rows.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {b.success_rows.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {b.error_rows > 0 ? (
                        <div className="flex items-center gap-1 text-sm text-red-600">
                          <X className="w-3.5 h-3.5" />
                          {b.error_rows}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[b.status] || ''}`}>
                        {statusIcons[b.status]}
                        {statusLabels[b.status] || b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(b.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(b)}
                          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(b._id)}
                          disabled={deletingId === b._id}
                          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === b._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* View data modal */}
      {viewingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900 font-display">
                  {viewingBatch.original_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {records.length} saved record{records.length !== 1 ? 's' : ''} · {viewingBatch.success_rows} valid · {viewingBatch.error_rows} invalid
                </p>
              </div>
              <button onClick={() => setViewingBatch(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {viewLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-20">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No records found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">#</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400">Status</th>
                        {allColumns.map((col) => (
                          <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-slate-400">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-slate-400">{r.row_number}</td>
                          <td className="px-4 py-2.5">
                            {r.status === 'valid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-200">
                                <CheckCircle className="w-2.5 h-2.5" /> Valid
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200"
                                title={r.validation_errors?.join('; ')}
                              >
                                <CircleAlert className="w-2.5 h-2.5" /> Invalid
                              </span>
                            )}
                          </td>
                          {allColumns.map((col) => (
                            <td key={col} className="px-4 py-2.5 text-slate-600">
                              {String(r.fields?.[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end px-6 py-3 border-t border-slate-100">
              <button
                onClick={() => setViewingBatch(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
