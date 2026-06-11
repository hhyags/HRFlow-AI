import { expect, test } from '@playwright/test'

const accounts = {
  manager: {
    email: process.env.QA_HR_MANAGER_EMAIL || process.env.HRFLOW_SMOKE_EMAIL,
    password: process.env.QA_HR_MANAGER_PASSWORD || process.env.HRFLOW_SMOKE_PASSWORD,
  },
  recruiter: {
    email: process.env.QA_RECRUITER_1_EMAIL,
    password: process.env.QA_RECRUITER_1_PASSWORD,
  },
  employee: {
    email: process.env.QA_EMPLOYEE_1_EMAIL,
    password: process.env.QA_EMPLOYEE_1_PASSWORD,
  },
}

async function login(page, account) {
  if (!account.email || !account.password) {
    throw new Error('Real Firebase QA credentials are required for Playwright.')
  }
  await page.goto('/login')
  await page.getByLabel('Work email').fill(account.email)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 30000 })
}

test('HR Manager dashboard and module navigation remain functional', async ({ page }) => {
  await login(page, accounts.manager)
  await page.goto('/')
  await expect(page.getByText('Good morning, Goutham')).toBeVisible()
  await expect(page.getByText('Employee growth')).toBeVisible()
  await page.getByRole('button', { name: 'People' }).click()
  await expect(page.getByRole('heading', { name: 'People' })).toBeVisible()
  await expect(page.getByPlaceholder('Search employees...')).toBeVisible()
})

test('Recruiter can access recruitment but cannot manage employees', async ({ page }) => {
  await login(page, accounts.recruiter)
  await page.getByLabel('Toggle theme').click()
  await expect(page.locator('.app')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Recruitment' }).click()
  await expect(page.getByRole('heading', { name: 'Recruitment' })).toBeVisible()
  await expect(page.getByText('AI match accuracy')).toBeVisible()
  const denied = await page.request.post('/api/employees', { data: {} })
  expect(denied.status()).toBe(403)
  const authorized = await page.request.post('/api/jobs', { data: {} })
  expect(authorized.status()).toBe(400)
})

test('Employee can access self-service APIs but not candidate data', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page, accounts.employee)
  await page.locator('.mobileMenu').click()
  await expect(page.locator('.sidebar')).toHaveClass(/sidebarOpen/)
  await page.getByRole('button', { name: 'Leave' }).click()
  await expect(page.getByRole('heading', { name: 'Leave management', exact: true })).toBeVisible()
  expect((await page.request.get('/api/attendance')).status()).toBe(200)
  expect((await page.request.get('/api/payroll')).status()).toBe(200)
  expect((await page.request.get('/api/candidates')).status()).toBe(403)
  expect((await page.request.post('/api/leave-workflow/requests', { data: {} })).status()).toBe(400)
})

test('Firebase authentication pages and real session persistence work', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in to HRFlow' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible()
  await expect(page.getByLabel('Organization name')).toBeVisible()
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
  await login(page, accounts.manager)
  await page.reload()
  await expect(page.getByText('Good morning, Goutham')).toBeVisible()
  await page.getByTitle('Sign out').click()
  await expect(page).toHaveURL(/\/login$/)
  expect((await page.request.get('/api/auth/session')).status()).toBe(401)
})

test('Google authentication uses redirect and is not popup-dependent', async ({ page }) => {
  const oauthRequest = page.waitForRequest((request) => {
    const url = new URL(request.url())
    return url.hostname === 'accounts.google.com' && url.pathname === '/o/oauth2/auth'
  })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  const request = await oauthRequest
  await page.waitForURL((url) => url.hostname === 'accounts.google.com', { timeout: 30000 })
  expect(new URL(request.url()).searchParams.get('redirect_uri')).toBe(
    'https://hrflow-ai-alpha.vercel.app/__/auth/handler',
  )
})
