import { useEffect, useRef } from 'react'

let scriptPromise

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('cloudflare-turnstile-script')
    const script = existing || document.createElement('script')
    if (!existing) {
      script.id = 'cloudflare-turnstile-script'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => resolve(window.turnstile), { once: true })
    script.addEventListener('error', () => reject(new Error('Security check could not be loaded.')), { once: true })
  })
  return scriptPromise
}

export default function Turnstile({ siteKey, onToken, onError }) {
  const container = useRef(null)
  useEffect(() => {
    let active = true
    let widgetId
    loadTurnstile().then(turnstile => {
      if (!active || !container.current) return
      widgetId = turnstile.render(container.current, {
        sitekey: siteKey,
        callback: onToken,
        'expired-callback': () => onToken(''),
        'error-callback': () => { onToken(''); onError?.() },
        theme: 'light',
      })
    }).catch(() => active && onError?.())
    return () => { active = false; if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId) }
  }, [siteKey, onToken, onError])
  return <div className="min-h-[65px]" ref={container} />
}

