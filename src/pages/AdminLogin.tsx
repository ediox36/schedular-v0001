import { useState, useEffect, useRef } from 'react'

const SUPABASE_URL = 'https://itfptgjsfnznzfobntka.supabase.co'
const AUTH_ENDPOINT = `${SUPABASE_URL}/functions/v1/admin-auth`
const SESSION_KEY = 'schedular_admin_token'
const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG ?? 'impakto'

// Sanitiza input removendo caracteres perigosos
function sanitize(val: string): string {
  return val.replace(/[<>"'`\\]/g, '').substring(0, 200)
}

interface AdminLoginProps {
  onAuthenticated: (token: string) => void
}

export default function AdminLogin({ onAuthenticated }: AdminLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const usernameRef = useRef<HTMLInputElement>(null)

  // Foco automático no campo username
  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  // Countdown do bloqueio local
  useEffect(() => {
    if (!blockedUntil) return
    const interval = setInterval(() => {
      const remaining = Math.ceil((blockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setBlockedUntil(null)
        setCountdown(0)
        setError('')
        clearInterval(interval)
      } else {
        setCountdown(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [blockedUntil])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Bloqueio local após 5 tentativas (adicional ao servidor)
    if (blockedUntil && Date.now() < blockedUntil) {
      setError(`Aguarde ${countdown} segundos antes de tentar novamente.`)
      return
    }

    const cleanUsername = sanitize(username.trim())
    const cleanPassword = sanitize(password)

    // Validação client-side básica
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Nome de utilizador inválido.')
      return
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      setError('Palavra-passe inválida.')
      return
    }

    setLoading(true)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000) // timeout 10s

      const res = await fetch(AUTH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: cleanUsername,
          password: cleanPassword,
          tenant_slug: TENANT_SLUG,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      const data = await res.json()

      if (res.status === 429) {
        // Rate limit do servidor
        setBlockedUntil(Date.now() + 15 * 60 * 1000)
        setError('Demasiadas tentativas. Bloqueado por 15 minutos.')
        setLoading(false)
        return
      }

      if (res.status === 423) {
        setError('Conta bloqueada temporariamente. Tente novamente em 30 minutos.')
        setLoading(false)
        return
      }

      if (!res.ok || !data.token) {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        // Bloqueio local progressivo
        if (newAttempts >= 5) {
          const blockMs = 5 * 60 * 1000 // 5 min local
          setBlockedUntil(Date.now() + blockMs)
          setError('Demasiadas tentativas incorrectas. Aguarde 5 minutos.')
        } else {
          setError(`Credenciais incorrectas. (${5 - newAttempts} tentativa${5 - newAttempts !== 1 ? 's' : ''} restante${5 - newAttempts !== 1 ? 's' : ''})`)
        }

        // Limpar password por segurança
        setPassword('')
        setLoading(false)
        return
      }

      // Login bem-sucedido
      sessionStorage.setItem(SESSION_KEY, data.token)
      onAuthenticated(data.token)

    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setError('Tempo limite excedido. Verifique a sua ligação.')
      } else {
        setError('Erro de ligação. Tente novamente.')
      }
      setPassword('')
      setLoading(false)
    }
  }

  const isBlocked = !!blockedUntil && Date.now() < blockedUntil

  return (
    <div className="min-h-screen bg-[#1A2E6B] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E8501A] mb-4 shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Painel Admin</h1>
          <p className="text-blue-200/60 text-sm mt-1">Schedular · IMPAKTO</p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} noValidate autoComplete="off">
            {/* Campo username */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Utilizador
              </label>
              <input
                ref={usernameRef}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading || isBlocked}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={50}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50
                  text-stone-800 text-sm placeholder-stone-300
                  focus:outline-none focus:ring-2 focus:ring-[#E8501A]/40 focus:border-[#E8501A]
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                placeholder="nome de utilizador"
              />
            </div>

            {/* Campo password */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Palavra-passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading || isBlocked}
                autoComplete="current-password"
                maxLength={200}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50
                  text-stone-800 text-sm placeholder-stone-300
                  focus:outline-none focus:ring-2 focus:ring-[#E8501A]/40 focus:border-[#E8501A]
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                placeholder="••••••••"
              />
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
                <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-600 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            {/* Countdown */}
            {isBlocked && countdown > 0 && (
              <div className="mb-4 text-center">
                <span className="text-xs text-stone-400">
                  Desbloqueio em <span className="font-mono font-bold text-[#E8501A]">{countdown}s</span>
                </span>
              </div>
            )}

            {/* Botão login */}
            <button
              type="submit"
              disabled={loading || isBlocked || !username || !password}
              className="w-full py-3 px-6 rounded-xl bg-[#E8501A] text-white font-semibold text-sm
                hover:bg-[#d4461a] active:scale-[0.98]
                disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                transition-all duration-150 shadow-md shadow-orange-200
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  A verificar...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200/30 text-xs mt-6">
          Acesso restrito · Schedular v1.0
        </p>
      </div>
    </div>
  )
}
