import { useState, useEffect, useCallback } from 'react'

const SUPABASE_URL = 'https://itfptgjsfnznzfobntka.supabase.co'
const AUTH_ENDPOINT = `${SUPABASE_URL}/functions/v1/admin-auth`
const SESSION_KEY = 'schedular_admin_token'

type AuthState = 'checking' | 'unauthenticated' | 'authenticated'

export function useAdminAuth() {
  const [state, setState] = useState<AuthState>('checking')
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY)

    // Sem token guardado -> mostrar login imediatamente
    if (!stored || stored.length !== 96) {
      sessionStorage.removeItem(SESSION_KEY)
      setState('unauthenticated')
      return
    }

    // Token existe -> verificar no servidor
    let cancelled = false
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    fetch(AUTH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', token: stored }),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        clearTimeout(timeout)
        if (data.valid === true) {
          setToken(stored)
          setState('authenticated')
        } else {
          sessionStorage.removeItem(SESSION_KEY)
          setState('unauthenticated')
        }
      })
      .catch(() => {
        if (cancelled) return
        clearTimeout(timeout)
        // Em caso de erro de rede, rejeitar por segurança
        sessionStorage.removeItem(SESSION_KEY)
        setState('unauthenticated')
      })

    return () => { cancelled = true }
  }, [])

  const login = useCallback((t: string) => {
    sessionStorage.setItem(SESSION_KEY, t)
    setToken(t)
    setState('authenticated')
  }, [])

  const logout = useCallback(async () => {
    const t = token ?? sessionStorage.getItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
    setToken(null)
    setState('unauthenticated')
    if (t) {
      try {
        await fetch(AUTH_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'logout', token: t }),
        })
      } catch { /* ignora */ }
    }
  }, [token])

  return {
    checking: state === 'checking',
    isAuthenticated: state === 'authenticated',
    login,
    logout,
  }
}
