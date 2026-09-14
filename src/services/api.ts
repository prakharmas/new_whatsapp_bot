import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vendor_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Admin/superadmin: attach the selected vendor context to vendor API calls
  const isAdmin = localStorage.getItem('is_admin') === 'true'
  const selectedVendorId = localStorage.getItem('selected_vendor_id')
  const isVendorApi = config.url?.includes('/api/vendor/') && !config.url?.includes('/api/admin/')
  if (isAdmin && selectedVendorId && isVendorApi) {
    config.params = { ...(config.params || {}), vendorId: selectedVendorId }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vendor_token')
      localStorage.removeItem('vendor_info')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
