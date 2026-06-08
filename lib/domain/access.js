import { getPrisma } from '@/lib/prisma'

export async function resolveEmployeeForAuth(auth, requestedEmployeeId, prisma = getPrisma()) {
  if (auth.profile.role === 'HR_MANAGER') {
    if (!requestedEmployeeId) throw new Error('employeeId is required.')
    return prisma.employee.findFirst({
      where: { id: requestedEmployeeId, organizationId: auth.profile.organizationId },
    })
  }
  return prisma.employee.findFirst({
    where: { profileId: auth.user.id, organizationId: auth.profile.organizationId },
  })
}
