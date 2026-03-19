import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type Slot = { time: string; available: boolean }

export function useAvailability(tenantId: string, date: string | null, durationMin: number) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!date || !tenantId) { setSlots([]); return }
    load()
  }, [tenantId, date])

  async function load() {
    setLoading(true)
    const dow = new Date(date!).getDay()

    const { data: avail } = await supabase
      .from('availability')
      .select('start_time, end_time')
      .eq('tenant_id', tenantId)
      .eq('day_of_week', dow)
      .eq('is_active', true)
      .single()

    if (!avail) { setSlots([]); setLoading(false); return }

    const { data: booked } = await supabase
      .from('bookings')
      .select('booking_time')
      .eq('tenant_id', tenantId)
      .eq('booking_date', date!)
      .in('status', ['pending', 'confirmed'])

    const busy = new Set(booked?.map(b => b.booking_time.slice(0, 5)) ?? [])
    const [sh, sm] = avail.start_time.split(':').map(Number)
    const [eh, em] = avail.end_time.split(':').map(Number)
    let cur = sh * 60 + sm
    const end = eh * 60 + em
    const out: Slot[] = []

    while (cur + durationMin <= end) {
      const hh = String(Math.floor(cur / 60)).padStart(2, '0')
      const mm = String(cur % 60).padStart(2, '0')
      const time = `${hh}:${mm}`
      out.push({ time, available: !busy.has(time) })
      cur += durationMin
    }

    setSlots(out)
    setLoading(false)
  }

  return { slots, loading }
}
