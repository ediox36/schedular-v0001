import { useState, useEffect } from 'react'
import { supabase, type Tenant } from './lib/supabase'
import BookingFunnel from './components/BookingFunnel'
import AdminDashboard from './pages/AdminDashboard'

const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG ?? 'impakto'
const isAdmin = window.location.pathname.startsWith('/admin')

export default function App() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    supabase
      .from('tenants').select('*').eq('slug', TENANT_SLUG).single()
      .then(({ data, error: e }) => {
        if (e || !data) { setError(true) } else { setTenant(data) }
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-6 h-6 border-2 border-[#E8501A] border-t-transparent rounded-full animate-spin"/>
        <p className="text-xs text-stone-400 tracking-widest uppercase">A carregar...</p>
      </div>
    </div>
  )

  if (error || !tenant) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <p className="text-stone-400 text-sm">Tenant não encontrado: {TENANT_SLUG}</p>
    </div>
  )

  if (isAdmin) return <AdminDashboard tenantId={tenant.id}/>

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-orange-50/30">
      <BookingFunnel tenant={tenant}/>
    </div>
  )
}
