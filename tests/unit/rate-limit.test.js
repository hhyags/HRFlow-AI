import { describe, expect, it } from 'vitest'
import { checkRateLimit, rateLimitKey } from '@/lib/rate-limit'

describe('security rate limiting', () => {
  it('blocks requests beyond the configured window limit', () => {
    const key = `test-${crypto.randomUUID()}`
    expect(checkRateLimit(key, { limit: 1 }).allowed).toBe(true)
    expect(checkRateLimit(key, { limit: 1 }).allowed).toBe(false)
  })

  it('builds namespaced keys from forwarded addresses', () => {
    const request = { headers: new Headers({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }) }
    expect(rateLimitKey(request, 'auth')).toBe('auth:203.0.113.5')
  })
})
