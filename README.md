# Schedular — Sistema de Agendamento

SaaS de agendamento multi-tenant com Facebook Pixel, WhatsApp e Google Calendar.

## Stack
- **Frontend**: React 19 + Vite + TailwindCSS
- **Backend**: Supabase (Postgres + Edge Functions)
- **Deploy**: Vercel

## Setup no Vercel

Após conectar este repositório no Vercel, adiciona estas variáveis de ambiente em:
**Settings → Environment Variables**

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://itfptgjsfnznzfobntka.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (a tua anon key do Supabase) |
| `VITE_TENANT_SLUG` | `impakto` |

## Desenvolvimento local

```bash
npm install
cp .env.example .env.local
# preenche .env.local com as tuas credenciais
npm run dev
```

## URLs

- `/` → Formulário de agendamento (público)
- `/admin` → Painel de gestão (protegido)

## Supabase

Projecto: `schedular` (`itfptgjsfnznzfobntka`)  
Edge Functions activas: `send-whatsapp`, `create-calendar-event`, `meta-conversions`
