import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { roles } from '@/lib/auth'

export async function POST(request) {
  try {
    const { email, password, fullName, organizationId, role = roles.EMPLOYEE } = await request.json()
    if (!email || !password || !fullName || !organizationId) {
      return NextResponse.json({ error: 'email, password, fullName, and organizationId are required' }, { status: 400 })
    }
    if (!Object.values(roles).includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    if (role !== roles.EMPLOYEE) {
      const providedSecret = request.headers.get('x-bootstrap-secret')
      if (!process.env.HRFLOW_BOOTSTRAP_SECRET || providedSecret !== process.env.HRFLOW_BOOTSTRAP_SECRET) {
        return NextResponse.json({ error: 'A valid bootstrap secret is required for privileged roles' }, { status: 403 })
      }
    }

    const { data, error } = await createSupabaseAdminClient().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { organization_id: organizationId, role },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: { user: data.user } }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 })
  }
}
