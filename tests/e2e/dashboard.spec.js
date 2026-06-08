import { expect, test } from '@playwright/test'

test('dashboard renders and module navigation remains functional', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Good morning, Goutham')).toBeVisible()
  await expect(page.getByText('Employee growth')).toBeVisible()
  await page.getByRole('button', { name: 'People' }).click()
  await expect(page.getByRole('heading', { name: 'People' })).toBeVisible()
  await expect(page.getByPlaceholder('Search employees...')).toBeVisible()
})

test('theme toggle and recruitment pipeline work', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Toggle theme').click()
  await expect(page.locator('.app')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Recruitment' }).click()
  await expect(page.getByRole('heading', { name: 'Recruitment' })).toBeVisible()
  await expect(page.getByText('AI match accuracy')).toBeVisible()
})

test('mobile navigation opens without changing the design', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.locator('.mobileMenu').click()
  await expect(page.locator('.sidebar')).toHaveClass(/sidebarOpen/)
  await page.getByRole('button', { name: 'Leave' }).click()
  await expect(page.getByRole('heading', { name: 'Leave management', exact: true })).toBeVisible()
})

test('Firebase authentication pages render and validate required fields', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in to HRFlow' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await expect(page.getByLabel('Invitation code')).toBeVisible()
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
})
