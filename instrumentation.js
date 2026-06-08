import { reportError } from '@/lib/logger'
import { validateServerEnv } from '@/lib/env'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.VERCEL_ENV === 'production' || process.env.HRFLOW_VALIDATE_ENV === '1') {
      validateServerEnv()
    }
    process.on('unhandledRejection', (error) => reportError(error, { source: 'unhandledRejection' }))
    process.on('uncaughtException', (error) => reportError(error, { source: 'uncaughtException' }))
  }
}

export async function onRequestError(error, request, context) {
  await reportError(error, {
    source: 'next-request',
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
    renderSource: context.renderSource,
  })
}
