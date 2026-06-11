import nextEnv from '@next/env'
import { PrismaClient } from '@prisma/client'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

nextEnv.loadEnvConfig(process.cwd())

const fix = process.argv.includes('--fix')
const prisma = new PrismaClient()
const app = getApps()[0] || initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
})
const firebase = getAuth(app)

async function listFirebaseUsers() {
  const users = []
  let pageToken
  do {
    const page = await firebase.listUsers(1000, pageToken)
    users.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken)
  return users
}

const [databaseUsers, firebaseUsers] = await Promise.all([
  prisma.user.findMany({
    select: { id: true, firebaseUid: true, email: true, role: true, organizationId: true },
  }),
  listFirebaseUsers(),
])

const firebaseByUid = new Map(firebaseUsers.map((user) => [user.uid, user]))
const databaseByUid = new Map(databaseUsers.map((user) => [user.firebaseUid, user]))
const missingFirebase = databaseUsers.filter((user) => !firebaseByUid.has(user.firebaseUid))
const missingDatabase = firebaseUsers.filter((user) => !databaseByUid.has(user.uid))
const mismatches = databaseUsers.flatMap((user) => {
  const identity = firebaseByUid.get(user.firebaseUid)
  if (!identity) return []
  const expected = {
    role: 'authenticated',
    app_role: user.role,
    organization_id: user.organizationId,
  }
  const emailMismatch = identity.email?.toLowerCase() !== user.email.toLowerCase()
  const claimsMismatch = Object.entries(expected).some(([key, value]) => identity.customClaims?.[key] !== value)
  return emailMismatch || claimsMismatch ? [{ user, identity, expected, emailMismatch, claimsMismatch }] : []
})

if (fix) {
  for (const user of missingFirebase) {
    const identity = await firebase.createUser({
      uid: user.firebaseUid,
      email: user.email,
      emailVerified: false,
      disabled: true,
      displayName: 'Seeded HRFlow profile',
    })
    await firebase.setCustomUserClaims(identity.uid, {
      role: 'authenticated',
      app_role: user.role,
      organization_id: user.organizationId,
    })
  }
  for (const mismatch of mismatches) {
    await firebase.setCustomUserClaims(mismatch.user.firebaseUid, mismatch.expected)
    if (mismatch.identity.email && mismatch.emailMismatch) {
      await prisma.user.update({
        where: { id: mismatch.user.id },
        data: { email: mismatch.identity.email.toLowerCase() },
      })
    }
  }
}

console.log(JSON.stringify({
  status: missingFirebase.length || missingDatabase.length || mismatches.length ? 'drift-detected' : 'ok',
  fixApplied: fix,
  counts: {
    databaseUsers: databaseUsers.length,
    firebaseUsers: firebaseUsers.length,
    missingFirebase: missingFirebase.length,
    missingDatabase: missingDatabase.length,
    mismatches: mismatches.length,
  },
  missingFirebase: missingFirebase.map((user) => ({ id: user.id, email: user.email })),
  missingDatabase: missingDatabase.map((user) => ({ uid: user.uid, email: user.email })),
  mismatches: mismatches.map(({ user, emailMismatch, claimsMismatch }) => ({
    id: user.id,
    email: user.email,
    emailMismatch,
    claimsMismatch,
  })),
}, null, 2))

await prisma.$disconnect()
if ((!fix && (missingFirebase.length || mismatches.length)) || missingDatabase.length) process.exitCode = 1
