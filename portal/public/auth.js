/*
 * Daksh Study Portal — access check
 *
 * Computes a 10-digit access code based on the visitor's local clock.
 * Format: ddmmyyyyhh  (day + month + 4-digit year + hour 00-23)
 *
 * Intentionally externalised from the main app bundle so the formula
 * isn't sitting in the React JavaScript. Not real security.
 */
(function () {
  function pad2(n) { return n < 10 ? '0' + n : '' + n }

  function code(d) {
    const date = d || new Date()
    return pad2(date.getDate())
         + pad2(date.getMonth() + 1)
         + date.getFullYear()
         + pad2(date.getHours())
  }

  function verify(input) {
    if (!input) return false
    const cleaned = ('' + input).trim()
    return cleaned === code()
  }

  window.__dakshAuth = { verify: verify }
})()
