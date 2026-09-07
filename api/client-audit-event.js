const json = (response, status, body) => response.status(status).json(body)

export async function handleClientAuditEvent(request, response) {
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
  return json(response, 410, { error: 'Client-reported audit events are no longer accepted' })
}

export default function handler(request, response) {
  return handleClientAuditEvent(request, response)
}
