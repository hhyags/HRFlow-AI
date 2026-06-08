import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

function getCredential() {
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (clientEmail && privateKey) {
    return cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail,
      privateKey,
    })
  }
  return applicationDefault()
}

export function getFirebaseAdminApp() {
  if (getApps().length) return getApps()[0]
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.')
  return initializeApp({ credential: getCredential(), projectId })
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp())
}
