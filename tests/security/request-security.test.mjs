import assert from 'node:assert/strict'
import test from 'node:test'
import {
  consumeRateLimit,
  getClientIp,
  hashRateLimitKey,
  requestBodyTooLarge,
  verifyTurnstile,
} from '../../server/request-security.js'

test('enforces serialized request-body limits', () => {
  assert.equal(requestBodyTooLarge({ message: 'small' }, 100), false)
  assert.equal(requestBodyTooLarge({ message: 'x'.repeat(200) }, 100), true)
})

test('uses the trusted forwarding address and hashes identifiers', () => {
  const request = { headers: { 'x-vercel-forwarded-for': '203.0.113.7, 10.0.0.1' }, socket: {} }
  assert.equal(getClientIp(request), '203.0.113.7')
  const hash = hashRateLimitKey('203.0.113.7', 'test-secret')
  assert.match(hash, /^[a-f0-9]{64}$/)
  assert.equal(hash.includes('203.0.113.7'), false)
})

test('passes only a hashed key to the database rate limiter', async () => {
  let received
  const admin = { rpc: async (_name, input) => { received = input; return { data: true, error: null } } }
  assert.equal(await consumeRateLimit(admin, { action: 'contact.ip', identifier: '203.0.113.7', maximum: 10, windowSeconds: 60, secret: 'test-secret' }), true)
  assert.equal(received.action_input, 'contact.ip')
  assert.equal(received.key_hash_input.includes('203.0.113.7'), false)
})

test('requires a successful server-side Turnstile response', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_url, options) => {
    assert.match(String(options.body), /secret=test-secret/)
    assert.match(String(options.body), /response=test-token/)
    return { ok: true, json: async () => ({ success: true }) }
  }
  try {
    assert.equal(await verifyTurnstile({ token: 'test-token', secret: 'test-secret', ipAddress: '203.0.113.7' }), true)
    assert.equal(await verifyTurnstile({ token: '', secret: 'test-secret', ipAddress: '203.0.113.7' }), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})
