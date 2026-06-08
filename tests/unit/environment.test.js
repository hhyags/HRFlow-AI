import { describe, expect, it } from 'vitest'
import { environmentStatus, validatePublicEnv } from '@/lib/env'

const publicEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'project.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'project',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'project.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'sender',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'app',
  NEXT_PUBLIC_APP_URL: 'https://hrflowai.app',
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
}

describe('environment validation', () => {
  it('accepts complete public configuration', () => {
    expect(validatePublicEnv(publicEnv)).toMatchObject({ NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'project' })
  })

  it('reports missing server configuration without leaking values', () => {
    const status = environmentStatus(publicEnv)
    expect(status.configured).toBe(false)
    expect(status.missing).toContain('DATABASE_URL')
  })

  it('throws for malformed public configuration', () => {
    expect(() => validatePublicEnv({ ...publicEnv, NEXT_PUBLIC_SUPABASE_URL: 'invalid' })).toThrow('Invalid public environment')
  })
})
