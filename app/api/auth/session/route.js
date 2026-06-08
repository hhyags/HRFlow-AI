import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

export async function GET(request) {
  const auth = await requireAuth(request)
  if (auth.error) return auth.error
  return NextResponse.json({
    data: {
      user: { id: auth.user.id, email: auth.user.email },
      profile: auth.profile,
    },
  })
}
