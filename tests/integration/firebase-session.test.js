import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  setCustomUserClaims: vi.fn(),
  writeAuditLog: vi.fn(),
}))

vi.mock('@/lib/firebase/admin', () => ({
  getFirebaseAdminAuth: () => ({ setCustomUserClaims: mocks.setCustomUserClaims }),
}))
vi.mock('@/lib/audit', () => ({ writeAuditLog: mocks.writeAuditLog }))

const { provisionFirebaseUser } = await import('@/lib/firebase/session')

function prisma(existing = null) {
  const client = {
    user: {
      findUnique: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'user-id', ...data })),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...existing, ...data })),
    },
    organization: { findUnique: vi.fn().mockResolvedValue({ id: 'org' }) },
    organizationInvite: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'invite',
        organizationId: 'org',
        email: 'user@example.com',
        role: 'EMPLOYEE',
        expiresAt: new Date(Date.now() + 60_000),
        acceptedAt: null,
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  }
  client.$transaction = (operation) => operation(client)
  return client
}

const token = {
  uid: 'firebase-uid',
  email: 'USER@example.com',
  name: 'Firebase User',
  firebase: { sign_in_provider: 'password' },
}

describe('Firebase user provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.HRFLOW_BOOTSTRAP_SECRET
  })

  it('creates an organization-scoped employee and Firebase claims', async () => {
    const db = prisma()
    const result = await provisionFirebaseUser({
      decodedToken: token,
      invitationToken: 'valid-invitation',
      fullName: 'User Name',
      prisma: db,
    })
    expect(result.created).toBe(true)
    expect(db.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firebaseUid: 'firebase-uid',
        organizationId: 'org',
        email: 'user@example.com',
        role: 'EMPLOYEE',
      }),
    })
    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith('firebase-uid', {
      role: 'authenticated',
      app_role: 'EMPLOYEE',
      organization_id: 'org',
    })
    expect(mocks.writeAuditLog).toHaveBeenCalled()
  })

  it('requires a valid bootstrap secret for privileged roles', async () => {
    process.env.HRFLOW_BOOTSTRAP_SECRET = 'correct-secret'
    await expect(provisionFirebaseUser({
      decodedToken: token,
      organizationId: 'org',
      requestedRole: 'HR_MANAGER',
      bootstrapSecret: 'wrong-secret',
      prisma: prisma(),
    })).rejects.toThrow('bootstrap secret')
  })

  it('updates trusted identity fields without changing tenant or role', async () => {
    const existing = {
      id: 'user-id',
      firebaseUid: 'firebase-uid',
      organizationId: 'org',
      email: 'old@example.com',
      fullName: 'Old Name',
      role: 'RECRUITER',
    }
    const db = prisma(existing)
    const result = await provisionFirebaseUser({
      decodedToken: { ...token, role: 'authenticated', app_role: 'RECRUITER', organization_id: 'org' },
      fullName: 'New Name',
      prisma: db,
    })
    expect(result.claimsChanged).toBe(false)
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { email: 'user@example.com', fullName: 'New Name' },
    })
    expect(mocks.setCustomUserClaims).not.toHaveBeenCalled()
  })
})
