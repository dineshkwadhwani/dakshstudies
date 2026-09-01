const json = (response, status, body) => response.status(status).json(body)
const validEmail = (value) => /^\S+@\S+\.\S+$/.test(value)
const clean = (value, max) => String(value || '').trim().slice(0, max)
const escapeHtml = (value) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])

export async function handleContact(request, response, env = process.env) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
  if (request.body?.website) return json(response, 200, { ok: true })

  const name = clean(request.body?.name, 120)
  const email = clean(request.body?.email, 254).toLowerCase()
  const phone = clean(request.body?.phone, 30)
  const subject = clean(request.body?.subject, 160)
  const message = clean(request.body?.message, 4000)
  if (name.length < 2 || !validEmail(email) || subject.length < 3 || message.length < 10) {
    return json(response, 400, { error: 'Please provide a valid name, email, subject and message.' })
  }

  const apiKey = env.RESEND_API_KEY
  const fromEmail = env.FROM_EMAIL
  const fromName = env.FROM_NAME || 'Tenth Ki Padhai'
  const recipient = env.CONTACT_EMAIL || 'contact@tenthkipadhai.online'
  if (!apiKey || !fromEmail) return json(response, 500, { error: 'Email delivery is not configured.' })

  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [recipient],
      reply_to: email,
      subject: `[Website enquiry] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\n${message}`,
      html: `<h2>New website enquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}<br><strong>Email:</strong> ${escapeHtml(email)}<br><strong>Phone:</strong> ${escapeHtml(phone || 'Not provided')}</p><h3>${escapeHtml(subject)}</h3><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
    }),
  })
  const delivery = await result.json().catch(() => ({}))
  if (!result.ok) {
    console.error('Resend contact delivery failed', result.status, delivery?.message || 'Unknown error')
    return json(response, 502, { error: 'Your message could not be delivered. Please email us directly.' })
  }
  return json(response, 200, { ok: true })
}

export default function handler(request, response) {
  return handleContact(request, response)
}
