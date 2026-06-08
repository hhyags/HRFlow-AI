import { defineConfig, devices } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'

if (existsSync('.env.qa.local')) {
  for (const line of readFileSync('.env.qa.local', 'utf8').split(/\r?\n/)) {
    const separator = line.indexOf('=')
    if (separator <= 0) continue
    const name = line.slice(0, separator)
    if (!process.env[name]) process.env[name] = line.slice(separator + 1)
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const useLocalServer = !process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: useLocalServer ? {
    command: 'npm run dev -- --webpack --hostname 127.0.0.1',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  } : undefined,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
      },
    },
  ],
})
