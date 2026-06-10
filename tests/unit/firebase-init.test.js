import { describe, expect, it, vi } from 'vitest'

describe('Firebase hosting helper configuration', () => {
  it('returns only public Firebase client settings', async () => {
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'public-key')
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'hrflow.example')
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'hrflow')
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'hrflow.example')
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'sender')
    vi.stubEnv('NEXT_PUBLIC_FIREBASE_APP_ID', 'app')

    const { GET } = await import('@/app/api/firebase/init/route')
    const response = await GET()
    const body = await response.json()

    expect(body).toMatchObject({
      apiKey: 'public-key',
      authDomain: 'hrflow.example',
      projectId: 'hrflow',
    })
    expect(JSON.stringify(body)).not.toContain('service')
  })
})
