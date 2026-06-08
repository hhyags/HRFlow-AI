import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const roles = {
  HR_MANAGER: 'HR_MANAGER',
  RECRUITER: 'RECRUITER',
  EMPLOYEE: 'EMPLOYEE',
}

export async function getRequestAuth(request) {
  const supabase = await createSupabaseServerClient()
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const { data, error } = bearer ? await supabase.auth.getUser(bearer) : await supabase.auth.getUser()
  if (error || !data.user) return null

  const prisma = getPrisma()
  let profile = await prisma.profile.findUnique({ where: { id: data.user.id } })
  if (!profile) {
    const organizationId = data.user.app_metadata?.organization_id
    if (!organizationId) return null
    profile = await prisma.profile.create({
      data: {
        id: data.user.id,
        organizationId,
        fullName: data.user.user_metadata?.full_name || data.user.email || 'HRFlow User',
        role: data.user.app_metadata?.role || roles.EMPLOYEE,
      },
    })
  }
  return { user: data.user, profile }
}

export async function requireAuth(request, allowedRoles = []) {
  try {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.headers.get('origin')
      const usesBearer = request.headers.has('authorization')
      if (origin && !usesBearer && origin !== request.nextUrl.origin) {
        return { error: NextResponse.json({ error: 'Invalid request origin' }, { status: 403 }) }
      }
    }
    const auth = await getRequestAuth(request)
    if (!auth) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    if (allowedRoles.length && !allowedRoles.includes(auth.profile.role)) {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    return auth
  } catch (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 503 }) }
  }
}
