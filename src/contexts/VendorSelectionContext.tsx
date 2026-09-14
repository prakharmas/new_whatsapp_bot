import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

interface VendorOption {
  vendor_id: string
  company_name: string
  email: string
}

interface VendorSelectionContextType {
  vendors: VendorOption[]
  selectedVendorId: string | null
  selectedVendor: VendorOption | null
  loading: boolean
  setSelectedVendorId: (vendorId: string | null) => Promise<void>
  refreshVendors: () => Promise<void>
}

const VendorSelectionContext = createContext<VendorSelectionContextType | undefined>(undefined)

export function VendorSelectionProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [selectedVendorId, setSelectedVendorIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshVendors = useCallback(async () => {
    if (!isAdmin) return
    try {
      const res = await api.get('/api/admin/vendors')
      if (res.data.success) {
        setVendors(res.data.data)
        const list = res.data.data as VendorOption[]
        if (list.length > 0) {
          const stored = localStorage.getItem('selected_vendor_id')
          const storedValid = stored && list.some((v) => v.vendor_id === stored)
          if (!storedValid) {
            const first = list[0].vendor_id
            setSelectedVendorIdState(first)
            localStorage.setItem('selected_vendor_id', first)
            api.post('/api/admin/selected-vendor', { vendorId: first }).catch(() => {})
          }
        }
      }
    } catch (err) {
      console.error('Failed to load vendors:', err)
    }
  }, [isAdmin])

  useEffect(() => {
    const stored = localStorage.getItem('selected_vendor_id')
    if (stored) setSelectedVendorIdState(stored)
  }, [])

  useEffect(() => {
    if (isAdmin) {
      refreshVendors()
    }
  }, [isAdmin, refreshVendors])

  const setSelectedVendorId = useCallback(async (vendorId: string | null) => {
    setSelectedVendorIdState(vendorId)
    if (vendorId) {
      localStorage.setItem('selected_vendor_id', vendorId)
    } else {
      localStorage.removeItem('selected_vendor_id')
    }
    try {
      setLoading(true)
      await api.post('/api/admin/selected-vendor', { vendorId })
    } catch (err) {
      console.error('Failed to persist selected vendor:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const selectedVendor = vendors.find(v => v.vendor_id === selectedVendorId) || null

  return (
    <VendorSelectionContext.Provider
      value={{ vendors, selectedVendorId, selectedVendor, loading, setSelectedVendorId, refreshVendors }}
    >
      {children}
    </VendorSelectionContext.Provider>
  )
}

export function useVendorSelection() {
  const context = useContext(VendorSelectionContext)
  if (context === undefined) {
    throw new Error('useVendorSelection must be used within a VendorSelectionProvider')
  }
  return context
}
