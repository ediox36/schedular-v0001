import { useState, useEffect } from 'react'
import { supabase, type Tenant } from './lib/supabase'
import BookingFunnel from './components/BookingFunnel'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'
import { useAdminAuth } from './hooks/useAdminAuth'

const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG ?? 'impakto'

// Detecta rota admin de forma robusta
const path = window.location.pathname
const isAdminRoute = path === '/admin' || path.startsWith('/admin/') || path.startsWith('/admin')

function Spinner({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-[#1A2E6B]' : 'bg-stone-50'}`}>
      <div className="w-6 h-6 border-2 border-[#E8501A] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function PublicApp() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('tenants').select('*').eq('slug', TENANT_SLUG).single()
      .then(({ data }) => { setTenant(data ?? null); setLoading(false) })
  }, [])

  if (loading) return <Spinner />
  if (!tenant) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <p className="text-stone-400 text-sm">Serviço temporariamente indisponível.</p>
    </div>
  )
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-orange-50/30">
      <BookingFunnel tenant={tenant} />
    </div>
  )
}

function AdminApp() {
  const { checking, isAuthenticated, login, logout } = useAdminAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [tenantLoading, setTenantLoading] = useState(true)

  useEffect(() => {
    supabase.from('tenants').select('*').eq('slug', TENANT_SLUG).single()
      .then(({ data }) => { setTenant(data ?? null); setTenantLoading(false) })
  }, [])

  if (checking) return <Spinner dark />
  if (!isAuthenticated) return <AdminLogin onAuthenticated={login} />
  if (tenantLoading) return <Spinner dark />
  return <AdminDashboard tenantId={tenant?.id ?? ''} onLogout={logout} />
}

export default function App() {
  return isAdminRoute ? <AdminApp /> : <PublicApp />
}
