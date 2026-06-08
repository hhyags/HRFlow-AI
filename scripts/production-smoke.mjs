import nextEnv from '@next/env'

nextEnv.loadEnvConfig(process.cwd())

const baseUrl = (process.env.PRODUCTION_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
const cronSecret = process.env.CRON_SECRET

if (!baseUrl || !cronSecret) {
  console.error('PRODUCTION_URL (or NEXT_PUBLIC_APP_URL) and CRON_SECRET are required.')
  process.exit(1)
}

const checks = []

async function check(name, operation) {
  const started = Date.now()
  try {
    const detail = await operation()
    checks.push({ name, ok: true, latencyMs: Date.now() - started, detail })
  } catch (error) {
    checks.push({ name, ok: false, latencyMs: Date.now() - started, error: error.message })
  }
}

async function expectStatus(path, expected, options) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual', ...options })
  if (!expected.includes(response.status)) {
    throw new Error(`Expected ${expected.join('/')} from ${path}, received ${response.status}`)
  }
  return response
}

await check('public health', async () => {
  const response = await expectStatus('/api/health', [200])
  const body = await response.json()
  if (body.status !== 'ok') throw new Error(`Health status is ${body.status}`)
  return body.status
})

await check('deep dependencies', async () => {
  const response = await expectStatus('/api/health/deep', [200], {
    headers: { Authorization: `Bearer ${cronSecret}` },
  })
  const body = await response.json()
  const failed = Object.entries(body.checks || {}).filter(([, result]) => !result.ok)
  if (failed.length) throw new Error(`Failed dependencies: ${failed.map(([name]) => name).join(', ')}`)
  return Object.keys(body.checks || {})
})

await check('route protection', async () => {
  const response = await expectStatus('/', [307, 308])
  const location = response.headers.get('location') || ''
  if (!location.includes('/login')) throw new Error('Dashboard did not redirect to login.')
  return location
})

await check('API protection', async () => {
  await expectStatus('/api/dashboard', [401])
  return 'unauthenticated access denied'
})

await check('security headers', async () => {
  const response = await expectStatus('/login', [200])
  const required = [
    'content-security-policy',
    'x-content-type-options',
    'x-frame-options',
    'referrer-policy',
  ]
  const missing = required.filter((name) => !response.headers.get(name))
  if (missing.length) throw new Error(`Missing headers: ${missing.join(', ')}`)
  return 'present'
})

await check('SEO endpoints', async () => {
  await Promise.all([
    expectStatus('/robots.txt', [200]),
    expectStatus('/sitemap.xml', [200]),
    expectStatus('/opengraph-image', [200]),
    expectStatus('/icon.svg', [200]),
  ])
  return 'available'
})

if (
  process.env.HRFLOW_SMOKE_EMAIL
  && process.env.HRFLOW_SMOKE_PASSWORD
  && process.env.NEXT_PUBLIC_FIREBASE_API_KEY
) {
  await check('Firebase email login and authenticated API', async () => {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.HRFLOW_SMOKE_EMAIL,
          password: process.env.HRFLOW_SMOKE_PASSWORD,
          returnSecureToken: true,
        }),
      },
    )
    const auth = await response.json()
    if (!response.ok) throw new Error(auth.error?.message || 'Firebase login failed.')
    const session = await expectStatus('/api/auth/session', [200], {
      headers: { Authorization: `Bearer ${auth.idToken}` },
    })
    const body = await session.json()
    return { userId: body.data?.user?.id, role: body.data?.profile?.role }
  })
}

const failed = checks.filter((item) => !item.ok)
console.log(JSON.stringify({ baseUrl, checks, passed: checks.length - failed.length, failed: failed.length }, null, 2))
if (failed.length) process.exitCode = 1
