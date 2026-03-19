import { useState, useEffect } from 'react'
import { supabase, type Tenant } from '../lib/supabase'
import { initPixel, pixelViewContent, pixelLead, pixelSchedule, pixelComplete } from '../lib/pixel'
import { useAvailability } from '../hooks/useAvailability'

type FormData = {
  full_name: string; email: string; phone: string; company: string
  challenge: string; budget_range: string
}

type Step = 1 | 2 | 3 | 'done'

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_PT   = ['D','S','T','Q','Q','S','S']

const CHALLENGES = [
  { val: 'captacao', label: 'Captação de clientes',   desc: 'Dificuldade em atrair novos clientes online' },
  { val: 'conversao', label: 'Conversão e vendas',    desc: 'Tenho visitas mas pouca conversão' },
  { val: 'escalar',  label: 'Escalar o negócio',      desc: 'Quero crescer de forma sistemática' },
]
const BUDGETS = ['Até 10.000 MT','10.000 – 25.000 MT','25.000 – 50.000 MT','Acima de 50.000 MT']

export default function BookingFunnel({ tenant }: { tenant: Tenant }) {
  const [step, setStep]         = useState<Step>(1)
  const [form, setForm]         = useState<FormData>({ full_name:'', email:'', phone:'', company:'', challenge:'', budget_range:'' })
  const [selDate, setSelDate]   = useState<string | null>(null)
  const [selTime, setSelTime]   = useState<string | null>(null)
  const [calYear, setCalYear]   = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)

  const { slots, loading: slotsLoading } = useAvailability(tenant.id, selDate, tenant.meeting_duration_min)

  useEffect(() => {
    if (tenant.pixel_id) initPixel(tenant.pixel_id)
    pixelViewContent(tenant.name)
  }, [])

  const upd = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Calendar helpers ──────────────────────────────────────────────
  const today = new Date(); today.setHours(0,0,0,0)
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDay    = new Date(calYear, calMonth, 1).getDay()
  const isPast      = (d: number) => new Date(calYear, calMonth, d) < today
  const isWeekend   = (d: number) => { const dw = new Date(calYear, calMonth, d).getDay(); return dw === 0 || dw === 6 }
  const dateStr     = (d: number) => `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  // ── Step handlers ─────────────────────────────────────────────────
  const goStep2 = () => {
    if (!form.full_name || !form.email || !form.phone || !form.challenge || !form.budget_range) {
      setError('Preenche todos os campos obrigatórios.'); return
    }
    setError(null)
    pixelLead(form.challenge)
    setStep(2)
  }

  const goStep3 = () => {
    if (!selDate || !selTime) { setError('Seleciona data e hora.'); return }
    setError(null)
    pixelSchedule()
    setStep(3)
  }

  const confirm = async () => {
    setSubmitting(true); setError(null)
    const params = new URLSearchParams(window.location.search)
    const { data, error: dbErr } = await supabase.from('bookings').insert({
      tenant_id: tenant.id,
      ...form,
      booking_date: selDate!,
      booking_time: selTime! + ':00',
      duration_min: tenant.meeting_duration_min,
      status: 'pending',
      fbclid: params.get('fbclid'),
      utm_source: params.get('utm_source'),
      utm_campaign: params.get('utm_campaign'),
      pixel_lead_fired: true,
      pixel_schedule_fired: true,
      pixel_complete_fired: true,
    }).select('id').single()

    if (dbErr || !data) { setError('Erro ao confirmar. Tenta novamente.'); setSubmitting(false); return }

    setBookingId(data.id)
    pixelComplete()

    // Trigger edge functions (fire-and-forget)
    const base = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'
    const auth = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }
    fetch(`${base}/send-whatsapp`,        { method:'POST', headers: auth, body: JSON.stringify({ booking_id: data.id, tenant_id: tenant.id }) }).catch(() => {})
    fetch(`${base}/create-calendar-event`,{ method:'POST', headers: auth, body: JSON.stringify({ booking_id: data.id, tenant_id: tenant.id }) }).catch(() => {})

    setSubmitting(false)
    setStep('done')
  }

  // ── STEP INDICATOR ────────────────────────────────────────────────
  const StepDot = ({ n, label }: { n: number; label: string }) => {
    const active = step === n
    const done   = typeof step === 'number' && step > n
    return (
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
          ${done   ? 'bg-green-500 text-white' :
            active ? 'bg-brand text-white shadow-lg shadow-brand/30' :
                     'bg-white border border-stone-200 text-stone-400'}`}>
          {done ? '✓' : n}
        </div>
        <span className={`text-sm hidden sm:block transition-colors ${active ? 'text-stone-900 font-medium' : 'text-stone-400'}`}>{label}</span>
      </div>
    )
  }

  // ── SUCCESS ───────────────────────────────────────────────────────
  if (step === 'done') return (
    <div className="text-center py-16 px-6 anim-scalein">
      <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-5">
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h2 className="font-display text-2xl text-stone-900 mb-2">Agendamento confirmado!</h2>
      <p className="text-stone-500 text-sm mb-1">Receberás confirmação no WhatsApp: <strong className="text-stone-700">{form.phone}</strong></p>
      <p className="text-stone-400 text-xs mb-8">
        {selDate && new Date(selDate).toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long' })} às {selTime}
      </p>
      {bookingId && <p className="text-xs text-stone-300 font-mono mb-6">#{bookingId.slice(0,8)}</p>}
      <button onClick={() => { setStep(1); setForm({ full_name:'', email:'', phone:'', company:'', challenge:'', budget_range:'' }); setSelDate(null); setSelTime(null) }}
        className="text-sm text-stone-400 hover:text-brand transition-colors underline underline-offset-4">
        Fazer novo agendamento
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Brand header */}
      <div className="text-center mb-10 anim-fadeup">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-brand"/>
          <span className="text-xs font-semibold tracking-widest text-stone-400 uppercase">{tenant.name}</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-stone-900 leading-tight">
          Marca a tua sessão<br/>
          <span className="text-brand">estratégica gratuita</span>
        </h1>
        <p className="text-stone-500 text-sm mt-3">30 minutos · Online · Sem compromisso</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-8 anim-fadeup delay-1">
        <StepDot n={1} label="Sobre ti"/>
        <div className="w-12 h-px bg-stone-200"/>
        <StepDot n={2} label="Data & Hora"/>
        <div className="w-12 h-px bg-stone-200"/>
        <StepDot n={3} label="Confirmar"/>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm shadow-stone-100 overflow-hidden anim-scalein delay-2">

        {/* ── STEP 1 ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-8">
            <h2 className="font-display text-xl text-stone-900 mb-1">Conta-nos sobre o teu negócio</h2>
            <p className="text-stone-400 text-sm mb-7">Precisamos de algumas informações para personalizar a reunião.</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label="Nome completo *" value={form.full_name} onChange={upd('full_name')} placeholder="João Silva"/>
              <Field label="Empresa" value={form.company} onChange={upd('company')} placeholder="Empresa Lda."/>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Field label="Email *" type="email" value={form.email} onChange={upd('email')} placeholder="joao@empresa.co.mz"/>
              <Field label="WhatsApp *" type="tel" value={form.phone} onChange={upd('phone')} placeholder="+258 84 000 0000"/>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
                Qual é o teu desafio principal? *
              </label>
              <div className="space-y-2">
                {CHALLENGES.map(c => (
                  <label key={c.val} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all
                    ${form.challenge === c.val ? 'border-brand bg-orange-50/60' : 'border-stone-100 hover:border-stone-200'}`}
                    onClick={() => setForm(f => ({ ...f, challenge: c.val }))}>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all
                      ${form.challenge === c.val ? 'border-brand bg-brand' : 'border-stone-300'}`}/>
                    <div>
                      <div className="text-sm font-medium text-stone-800">{c.label}</div>
                      <div className="text-xs text-stone-400 mt-0.5">{c.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                Orçamento mensal disponível *
              </label>
              <select value={form.budget_range} onChange={upd('budget_range')}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm text-stone-800 bg-white focus:outline-none focus:border-brand transition-colors appearance-none">
                <option value="">Selecionar...</option>
                {BUDGETS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button onClick={goStep2}
              className="w-full py-4 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-brand/20 active:scale-[0.99]">
              Continuar →
            </button>
          </div>
        )}

        {/* ── STEP 2 ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-8">
            <h2 className="font-display text-xl text-stone-900 mb-1">Escolhe data e hora</h2>
            <p className="text-stone-400 text-sm mb-7">Seleciona o dia e horário que preferes.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Calendar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}
                    className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-500 transition-colors">‹</button>
                  <span className="text-sm font-semibold text-stone-700">{MONTHS_PT[calMonth]} {calYear}</span>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}
                    className="w-8 h-8 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-500 transition-colors">›</button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_PT.map((d, i) => <div key={i} className="text-center text-xs text-stone-400 font-medium py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array(firstDay).fill(null).map((_, i) => <div key={'e'+i}/>)}
                  {Array(daysInMonth).fill(null).map((_, i) => {
                    const d = i + 1
                    const ds = dateStr(d)
                    const disabled = isPast(d) || isWeekend(d)
                    const selected = selDate === ds
                    const isToday  = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
                    return (
                      <button key={d} disabled={disabled}
                        onClick={() => { setSelDate(ds); setSelTime(null) }}
                        className={`aspect-square rounded-lg text-xs font-medium transition-all
                          ${disabled ? 'text-stone-200 cursor-not-allowed' :
                            selected ? 'bg-brand text-white shadow-md shadow-brand/30' :
                            isToday  ? 'text-brand font-bold hover:bg-orange-50' :
                                       'text-stone-700 hover:bg-stone-100'}`}>
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Slots */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
                  {selDate ? new Date(selDate).toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'short' }) : 'Seleciona uma data'}
                </p>
                {!selDate && (
                  <div className="h-40 flex items-center justify-center text-stone-300 text-sm">← Escolhe um dia</div>
                )}
                {selDate && slotsLoading && (
                  <div className="h-40 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin"/>
                  </div>
                )}
                {selDate && !slotsLoading && slots.length === 0 && (
                  <div className="h-40 flex items-center justify-center text-stone-300 text-sm">Sem disponibilidade neste dia</div>
                )}
                {selDate && !slotsLoading && slots.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {slots.map(s => (
                      <button key={s.time} disabled={!s.available}
                        onClick={() => setSelTime(s.time)}
                        className={`py-2.5 rounded-xl text-sm font-medium transition-all border
                          ${!s.available ? 'text-stone-200 border-stone-100 cursor-not-allowed line-through' :
                            selTime === s.time ? 'bg-brand text-white border-brand shadow-md shadow-brand/20' :
                                                'border-stone-200 text-stone-700 hover:border-brand hover:text-brand'}`}>
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors">
                ← Voltar
              </button>
              <button onClick={goStep3}
                className="flex-1 py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-brand/20">
                Confirmar horário →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ────────────────────────────────────────── */}
        {step === 3 && (
          <div className="p-8">
            <h2 className="font-display text-xl text-stone-900 mb-1">Confirmar agendamento</h2>
            <p className="text-stone-400 text-sm mb-7">Verifica os detalhes antes de confirmar.</p>

            <div className="bg-stone-50 rounded-xl p-5 mb-6 space-y-3">
              {[
                ['Nome',      form.full_name],
                ['Empresa',   form.company || '—'],
                ['Email',     form.email],
                ['WhatsApp',  form.phone],
                ['Data',      selDate ? new Date(selDate).toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : '—'],
                ['Hora',      selTime || '—'],
                ['Duração',   `${tenant.meeting_duration_min} minutos`],
                ['Desafio',   CHALLENGES.find(c => c.val === form.challenge)?.label || '—'],
                ['Orçamento', form.budget_range || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                  <span className="text-stone-400">{k}</span>
                  <span className="text-stone-800 font-medium text-right max-w-[60%]">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50/50 mb-6">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">W</span>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Confirmação por WhatsApp</p>
                <p className="text-xs text-green-600 mt-0.5">Enviaremos um lembrete 24h antes da reunião para {form.phone}</p>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:bg-stone-50 transition-colors">
                ← Voltar
              </button>
              <button onClick={confirm} disabled={submitting}
                className="flex-1 py-3 bg-brand hover:bg-brand-dark text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-brand/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {submitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> A confirmar...</> : 'Confirmar agendamento ✓'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-stone-300 mt-6">
        Powered by <span className="font-semibold text-brand">IMPAKTO</span> · impaktomz.com
      </p>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm text-stone-800 bg-white placeholder-stone-300
          focus:outline-none focus:border-brand transition-colors"/>
    </div>
  )
}
