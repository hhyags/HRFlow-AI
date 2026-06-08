import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { email, password } = await request.json()
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return NextResponse.json({ error: error.message }, { status: 401 })
    return NextResponse.json({ data: { user: data.user, session: data.session } })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 })
  }
}
