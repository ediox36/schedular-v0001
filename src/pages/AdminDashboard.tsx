import { useState, useEffect } from 'react'
import { supabase, type Booking } from '../lib/supabase'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', cancelled: 'Cancelado',
  completed: 'Concluído', no_show: 'Faltou'
}
const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  no_show:   'bg-stone-50 text-stone-500 border-stone-200',
}

export default function AdminDashboard({ tenantId, onLogout }: { tenantId: string; onLogout?: () => void }) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false })
    setBookings(data ?? [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x))
  }

  const filtered = bookings
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => !search || b.full_name.toLowerCase().includes(search.toLowerCase()) || b.email.toLowerCase().includes(search.toLowerCase()))

  const counts = {
    total:      bookings.length,
    confirmed:  bookings.filter(b => b.status === 'confirmed').length,
    pending:    bookings.filter(b => b.status === 'pending').length,
    completed:  bookings.filter(b => b.status === 'completed').length,
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-brand"/>
              <span className="text-xs font-semibold tracking-widest text-stone-400 uppercase">IMPAKTO</span>
            </div>
            <h1 className="font-display text-2xl text-stone-900">Painel de agendamentos</h1>
          </div>
          {onLogout && (
            <button onClick={onLogout}
              className="px-4 py-2 rounded-xl border border-red-100 text-sm text-red-400 hover:bg-red-50 transition-colors flex items-center gap-2 mr-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Sair
            </button>
          )}
          <button onClick={load}
            className="px-4 py-2 rounded-xl border border-stone-200 text-sm text-stone-500 hover:bg-white transition-colors flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115 0M20 15a9 9 0 01-15 0"/>
            </svg>
            Actualizar
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total',      val: counts.total,     color: 'text-stone-900' },
            { label: 'Confirmados',val: counts.confirmed,  color: 'text-green-600' },
            { label: 'Pendentes',  val: counts.pending,    color: 'text-amber-600' },
            { label: 'Concluídos', val: counts.completed,  color: 'text-blue-600' },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-xl border border-stone-100 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">{m.label}</p>
              <p className={`text-3xl font-display ${m.color}`}>{m.val}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-5 border-b border-stone-100">
            <div className="flex gap-1">
              {['all','pending','confirmed','completed'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                    ${filter === f ? 'bg-stone-100 text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}>
                  {f === 'all' ? 'Todos' : STATUS_LABELS[f]}
                </button>
              ))}
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por nome ou email..."
              className="px-4 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-brand w-full sm:w-64 transition-colors"/>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-stone-300 text-sm">Nenhum agendamento encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100">
                    {['Cliente','Data & Hora','Desafio','Orçamento','Estado','Ações'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-stone-400 px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => (
                    <tr key={b.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-stone-900">{b.full_name}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{b.email}</p>
                        {b.company && <p className="text-xs text-stone-400">{b.company}</p>}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-stone-700">
                          {new Date(b.booking_date).toLocaleDateString('pt-PT', { day:'numeric', month:'short', year:'numeric' })}
                        </p>
                        <p className="text-xs text-stone-400">{b.booking_time.slice(0,5)}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-600">{b.challenge || '—'}</td>
                      <td className="px-5 py-4 text-sm text-stone-600">{b.budget_range || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[b.status] || STATUS_COLORS.pending}`}>
                          {STATUS_LABELS[b.status] || b.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <select value={b.status}
                          onChange={e => updateStatus(b.id, e.target.value)}
                          className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand bg-white transition-colors">
                          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
