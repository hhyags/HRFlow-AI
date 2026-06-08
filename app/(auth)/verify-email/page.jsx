'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendEmailVerification } from 'firebase/auth'
import AuthShell from '../AuthShell'
import styles from '../auth.module.css'
import { getFirebaseClientAuth } from '@/lib/firebase/client'
import { establishServerSession } from '@/lib/firebase/browser-session'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Open the verification email we sent, then continue.')
  const [error, setError] = useState('')

  async function continueToApp() {
    setError('')
    try {
      const user = getFirebaseClientAuth().currentUser
      if (!user) throw new Error('Sign in again to verify your email.')
      await user.reload()
      if (!user.emailVerified) throw new Error('Your email is not verified yet.')
      await user.getIdToken(true)
      await establishServerSession(user)
      router.replace('/')
      router.refresh()
    } catch (cause) {
      setError(cause.message)
    }
  }

  async function resend() {
    const user = getFirebaseClientAuth().currentUser
    if (!user) return setError('Sign in again to resend verification.')
    await sendEmailVerification(user)
    setStatus('A new verification email has been sent.')
  }

  return (
    <AuthShell eyebrow="Verify identity" title="Check your inbox" description={status}>
      <div className={styles.form}>
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.button} onClick={continueToApp}>I’ve verified my email</button>
        <button className={`${styles.button} ${styles.google}`} onClick={resend}>Resend verification email</button>
      </div>
    </AuthShell>
  )
}
