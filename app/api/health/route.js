import { NextResponse } from 'next/server'
import { environmentStatus } from '@/lib/env'

export async function GET() {
  const environment = environmentStatus()
  return NextResponse.json({
    status: environment.configured ? 'ok' : 'degraded',
    service: 'hrflow-ai',
    timestamp: new Date().toISOString(),
    environment: {
      configured: environment.configured,
      missingCount: environment.missing.length,
    },
  }, { status: environment.configured ? 200 : 503 })
}
