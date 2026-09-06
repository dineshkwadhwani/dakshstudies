const MEASUREMENT_ID = String(import.meta.env.VITE_GOOGLE_ANALYTICS_ID || '').trim()
const CONSENT_KEY = 'tenthkipadhai_analytics_consent'
const SCRIPT_ID = 'google-analytics-tag'

export function analyticsConsent() {
  if (!MEASUREMENT_ID) return 'denied'
  return window.localStorage.getItem(CONSENT_KEY)
}

export function setAnalyticsConsent(value) {
  if (!MEASUREMENT_ID) return
  window.localStorage.setItem(CONSENT_KEY, value ? 'granted' : 'denied')
  window[`ga-disable-${MEASUREMENT_ID}`] = !value
}

export function enableLandingAnalytics() {
  if (!MEASUREMENT_ID) return
  window[`ga-disable-${MEASUREMENT_ID}`] = false
  window.dataLayer = window.dataLayer || []
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments) }

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
    document.head.appendChild(script)
  }

  if (!window.__tenthKiPadhaiGaConfigured) {
    window.gtag('js', new Date())
    window.gtag('config', MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    })
    window.__tenthKiPadhaiGaConfigured = true
  }

  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: `${window.location.pathname}${window.location.search}`,
  })
}

export function disableAnalytics() {
  if (!MEASUREMENT_ID) return
  window[`ga-disable-${MEASUREMENT_ID}`] = true
}

export function trackLandingEvent(eventName, parameters = {}) {
  if (!MEASUREMENT_ID || analyticsConsent() !== 'granted' || typeof window.gtag !== 'function') return
  window.gtag('event', eventName, parameters)
}
