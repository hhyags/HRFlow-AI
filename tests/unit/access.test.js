import { describe, expect, it, vi } from 'vitest'
import { resolveEmployeeForAuth } from '@/lib/domain/access'

describe('employee access resolution', () => {
  it('allows HR to request an organization employee', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'emp' })
    const auth = { profile: { role: 'HR_MANAGER', organizationId: 'org' }, user: { id: 'manager' } }
    await expect(resolveEmployeeForAuth(auth, 'emp', { employee: { findFirst } })).resolves.toEqual({ id: 'emp' })
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'emp', organizationId: 'org' } })
  })

  it('always scopes employees to their linked profile', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'self' })
    const auth = { profile: { role: 'EMPLOYEE', organizationId: 'org' }, user: { id: 'user' } }
    await resolveEmployeeForAuth(auth, 'someone-else', { employee: { findFirst } })
    expect(findFirst).toHaveBeenCalledWith({ where: { profileId: 'user', organizationId: 'org' } })
  })

  it('requires an employee id for HR', async () => {
    await expect(resolveEmployeeForAuth(
      { profile: { role: 'HR_MANAGER', organizationId: 'org' } },
      null,
      { employee: { findFirst: vi.fn() } },
    )).rejects.toThrow('employeeId')
  })
})
