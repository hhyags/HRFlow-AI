'use client'

import { useEffect } from 'react'
import { onIdTokenChanged } from 'firebase/auth'
import { getFirebaseClientAuth } from '@/lib/firebase/client'
import { establishServerSession } from '@/lib/firebase/browser-session'

export default function AuthSessionSync() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return undefined
    const auth = getFirebaseClientAuth()
    let lastSync = 0
    return onIdTokenChanged(auth, async (user) => {
      if (!user || Date.now() - lastSync < 5 * 60_000) return
      lastSync = Date.now()
      await establishServerSession(user).catch(() => {})
    })
  }, [])
  return null
}
