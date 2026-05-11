// Treat dates as local-day to avoid timezone issues.
export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatShort(iso) {
  const d = parseISO(iso)
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
}

export function formatLong(iso) {
  const d = parseISO(iso)
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function daysBetween(a, b) {
  const da = parseISO(a)
  const db = parseISO(b)
  return Math.round((db - da) / 86400000)
}

export function isPast(iso) {
  return daysBetween(iso, todayISO()) > 0
}
export function isToday(iso) {
  return iso === todayISO()
}
export function isFuture(iso) {
  return daysBetween(iso, todayISO()) < 0
}
