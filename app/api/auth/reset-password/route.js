import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { email, redirectTo } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: { sent: true } })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 })
  }
}
