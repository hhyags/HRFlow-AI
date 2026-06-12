const REQUIRED_SEED_ENV = ['FIREBASE_DEMO_UID', 'DATABASE_URL']

function placeholderFor(name) {
  return `configure-${name.toLowerCase().replaceAll('_', '-')}`
}

export function missingSeedEnvironment(env = process.env) {
  return REQUIRED_SEED_ENV.filter((name) => {
    const value = env[name]?.trim()
    return !value || value === placeholderFor(name)
  })
}

export function validateSeedEnvironment(env = process.env) {
  const missing = missingSeedEnvironment(env)
  if (missing.length === 0) return

  const error = new Error(`Missing required seed environment variables: ${missing.join(', ')}`)
  error.code = 'SEED_ENV_MISSING'
  error.missing = missing
  throw error
}

export function printSeedEnvironmentError(error, logger = console) {
  logger.error('[SEED ERROR] Missing required environment variables:')
  for (const name of error.missing || []) logger.error(`  - ${name}`)
  logger.error('Set valid values in .env.local before seeding.')
}
