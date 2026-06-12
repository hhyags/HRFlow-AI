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
    let retryTimer
    let disposed = false

    async function syncSession(user, retry = true) {
      if (!user || Date.now() - lastSync < 5 * 60_000) return
      try {
        const { response } = await establishServerSession(user, {}, { refresh: true })
        if (!response.ok) throw new Error('Session refresh failed')
        lastSync = Date.now()
      } catch {
        if (!retry || disposed || !navigator.onLine) return
        retryTimer = window.setTimeout(() => syncSession(user, false), 2_000)
      }
    }

    const unsubscribe = onIdTokenChanged(auth, (user) => syncSession(user))
    return () => {
      disposed = true
      unsubscribe()
      window.clearTimeout(retryTimer)
    }
  }, [])
  return null
}
