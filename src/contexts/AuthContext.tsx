import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import api from '../services/api'

interface Vendor {
  vendor_id: string
  company_name: string
  email: string
}

interface AuthContextType {
  vendor: Vendor | null
  isAdmin: boolean
  role: string | null
  name: string | null
  email: string | null
  token: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('vendor_token')
    const storedVendor = localStorage.getItem('vendor_info')
    const storedRole = localStorage.getItem('user_role')
    const storedAdmin = localStorage.getItem('is_admin')
    const storedName = localStorage.getItem('user_name')
    const storedEmail = localStorage.getItem('user_email')

    if (storedToken) {
      setToken(storedToken)
      setRole(storedRole || 'vendor')
      setIsAdmin(storedAdmin === 'true')
      setName(storedName)
      setEmail(storedEmail)
      if (storedVendor) {
        setVendor(JSON.parse(storedVendor))
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password })
      if (response.data.success) {
        const data = response.data.data
        const newToken = data.token

        localStorage.setItem('vendor_token', newToken)
        localStorage.setItem('user_role', data.role || 'vendor')
        localStorage.setItem('is_admin', data.isAdmin ? 'true' : 'false')
        localStorage.setItem('user_name', data.name || '')
        localStorage.setItem('user_email', data.email || (data.vendor?.email || ''))
        if (data.vendor) {
          localStorage.setItem('vendor_info', JSON.stringify(data.vendor))
        } else {
          localStorage.removeItem('vendor_info')
        }

        setToken(newToken)
        setRole(data.role || 'vendor')
        setIsAdmin(Boolean(data.isAdmin))
        setName(data.name)
        setEmail(data.email || data.vendor?.email || '')
        setVendor(data.vendor || null)

        return { success: true }
      }
      return { success: false, error: response.data.error }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed. Please try again.',
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('vendor_token')
    localStorage.removeItem('vendor_info')
    localStorage.removeItem('user_role')
    localStorage.removeItem('is_admin')
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_email')
    localStorage.removeItem('selected_vendor_id')
    setToken(null)
    setVendor(null)
    setIsAdmin(false)
    setRole(null)
    setName(null)
    setEmail(null)
    api.post('/api/auth/logout').catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ vendor, isAdmin, role, name, email, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
