/* eslint-disable @typescript-eslint/no-explicit-any */
export function initPixel(pixelId: string) {
  if (!pixelId || (window as any).fbq) return
  const f = window as any
  const n: any = (f.fbq = function() {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
  })
  f._fbq = n
  n.push = n; n.loaded = true; n.version = '2.0'; n.queue = []
  const t = document.createElement('script') as HTMLScriptElement
  t.async = true
  t.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(t)
  n('init', pixelId)
  n('track', 'PageView')
}

function fbq(...args: any[]) {
  const f = (window as any).fbq
  if (typeof f === 'function') f(...args)
}

export const pixelViewContent = (name: string) =>
  fbq('track', 'ViewContent', { content_name: name })

export const pixelLead = (challenge?: string) =>
  fbq('track', 'Lead', { content_category: challenge, currency: 'MZN', value: 0 })

export const pixelSchedule = () =>
  fbq('track', 'Schedule')

export const pixelComplete = () =>
  fbq('track', 'CompleteRegistration', { currency: 'MZN', value: 0, status: 'confirmed' })
