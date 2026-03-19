import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)

export type Tenant = {
  id: string
  slug: string
  name: string
  pixel_id: string | null
  primary_color: string
  meeting_duration_min: number
  timezone: string
  logo_url: string | null
}

export type Booking = {
  id: string
  tenant_id: string
  full_name: string
  email: string
  phone: string
  company: string
  challenge: string
  budget_range: string
  booking_date: string
  booking_time: string
  status: string
  created_at: string
}
