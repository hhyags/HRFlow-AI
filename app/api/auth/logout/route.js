import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 })
  }
}
