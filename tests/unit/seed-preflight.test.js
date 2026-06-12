import { describe, expect, it, vi } from 'vitest'
import {
  missingSeedEnvironment,
  printSeedEnvironmentError,
  validateSeedEnvironment,
} from '@/prisma/seed-preflight.mjs'

describe('seed preflight validation', () => {
  it('rejects a missing Firebase demo UID', () => {
    expect(() => validateSeedEnvironment({
      DATABASE_URL: 'postgresql://test',
    })).toThrow('FIREBASE_DEMO_UID')
  })

  it('rejects placeholder values', () => {
    expect(missingSeedEnvironment({
      FIREBASE_DEMO_UID: 'configure-firebase-demo-uid',
      DATABASE_URL: 'postgresql://test',
    })).toEqual(['FIREBASE_DEMO_UID'])
  })

  it('accepts complete seed configuration', () => {
    expect(() => validateSeedEnvironment({
      FIREBASE_DEMO_UID: 'valid-firebase-uid-abc123',
      DATABASE_URL: 'postgresql://test',
    })).not.toThrow()
  })

  it('prints variable names without printing secret values', () => {
    const logger = { error: vi.fn() }
    const error = new Error('missing')
    error.missing = ['DATABASE_URL']

    printSeedEnvironmentError(error, logger)

    const output = logger.error.mock.calls.flat().join(' ')
    expect(output).toContain('DATABASE_URL')
    expect(output).not.toContain('postgresql://')
  })
})
