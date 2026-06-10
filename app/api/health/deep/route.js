import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { getFirebaseAdminAuth } from '@/lib/firebase/admin'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { environmentStatus } from '@/lib/env'
import { checkGeminiConnectivity } from '@/lib/ai/service'

async function check(name, operation) {
  const started = Date.now()
  try {
    await operation()
    return [name, { ok: true, latencyMs: Date.now() - started }]
  } catch (error) {
    return [name, { ok: false, latencyMs: Date.now() - started, error: error.message }]
  }
}

export async function GET(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'hrflow-documents'
  const checks = Object.fromEntries(await Promise.all([
    check('database', () => getPrisma().$queryRaw`SELECT 1`),
    check('firebase', () => getFirebaseAdminAuth().listUsers(1)),
    check('storage', async () => {
      const { error } = await createSupabaseAdminClient().storage.getBucket(bucket)
      if (error) throw error
    }),
    check('gemini', checkGeminiConnectivity),
  ]))
  const ok = environmentStatus().configured && Object.values(checks).every((item) => item.ok)
  return NextResponse.json({ status: ok ? 'ok' : 'degraded', checks }, { status: ok ? 200 : 503 })
}
