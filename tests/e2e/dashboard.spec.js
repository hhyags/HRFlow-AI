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
  test.setTimeout(90000)
  await login(page, accounts.manager)
  await expect(page.getByRole('heading', { name: /^Welcome,/ })).toBeVisible()
  await expect(page.getByText('Employee growth')).toBeVisible()
  await page.getByRole('button', { name: 'People' }).click()
  await expect(page.getByRole('heading', { name: 'People' })).toBeVisible()
  await expect(page.getByPlaceholder('Search employees...')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible({ timeout: 30000 })
  await page.getByRole('button', { name: 'Payroll' }).click()
  await expect(page.getByRole('button', { name: 'Run payroll' })).toBeVisible()
  await page.getByRole('button', { name: 'Leave' }).click()
  await expect(page.getByRole('button', { name: 'Approve' }).first()).toBeVisible()
})

test('Recruiter can access recruitment but cannot manage employees', async ({ page }) => {
  test.setTimeout(90000)
  await login(page, accounts.recruiter)
  await page.getByLabel('Toggle theme').click()
  await expect(page.locator('.app')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Recruitment' }).click()
  await expect(page.getByRole('heading', { name: 'Recruitment' })).toBeVisible()
  await expect(page.getByText('Average AI score')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume AI' }).first()).toBeVisible({ timeout: 30000 })
  await expect(page.getByRole('button', { name: 'Rank', exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Questions' }).first()).toBeVisible()
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
  await page.getByRole('button', { name: 'Create new' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Employee ID')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.locator('.mobileMenu').click()
  await page.getByRole('button', { name: 'Time & attendance' }).click()
  await expect(page.getByRole('button', { name: 'Check in' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request correction' })).toBeVisible()
  expect((await page.request.get('/api/attendance')).status()).toBe(200)
  expect((await page.request.get('/api/payroll')).status()).toBe(200)
  expect((await page.request.get('/api/candidates')).status()).toBe(403)
  expect((await page.request.post('/api/leave-workflow/requests', { data: {} })).status()).toBe(400)
})

test('Firebase authentication pages and real session persistence work', async ({ page }) => {
  test.setTimeout(90000)
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in to HRFlow' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await Promise.all([
    page.waitForURL(/\/signup$/),
    page.getByRole('link', { name: 'Create an account' }).click(),
  ])
  await expect(page.getByRole('heading', { name: 'Create your workspace' })).toBeVisible()
  await expect(page.getByLabel('Organization name')).toBeVisible()
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
  await login(page, accounts.manager)
  await page.reload({ waitUntil: 'domcontentloaded' })
  const sessionAfterReload = await page.request.get('/api/auth/session')
  expect(sessionAfterReload.status(), await sessionAfterReload.text()).toBe(200)
  await expect(page.getByRole('heading', { name: /^Welcome,/ })).toBeVisible()
  await expect(page.getByTitle('Sign out')).not.toContainText('HRFlow user')
  await page.getByTitle('Sign out').click()
  await expect(page).toHaveURL(/\/login$/, { timeout: 60000 })
  expect((await page.request.get('/api/auth/session')).status()).toBe(401)
})

test('Google authentication opens the Firebase-authorized account chooser', async ({ page, context }, testInfo) => {
  test.setTimeout(60000)
  const hostname = new URL(testInfo.project.use.baseURL).hostname
  test.skip(['localhost', '127.0.0.1'].includes(hostname), 'Firebase Google chooser is validated against the authorized production domain.')
  await page.goto('/login')
  const popupPromise = context.waitForEvent('page')
  await page.getByRole('button', { name: 'Continue with Google' }).click()
  const popup = await popupPromise
  await popup.waitForURL((url) => url.hostname === 'accounts.google.com', {
    timeout: 45000,
    waitUntil: 'commit',
  })
  expect(popup.url()).not.toContain('redirect_uri_mismatch')
})
