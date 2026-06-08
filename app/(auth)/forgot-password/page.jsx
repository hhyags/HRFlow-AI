'use client'

import Link from 'next/link'
import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import AuthShell from '../AuthShell'
import styles from '../auth.module.css'
import { getFirebaseClientAuth } from '@/lib/firebase/client'

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const email = String(new FormData(event.currentTarget).get('email'))
      await sendPasswordResetEmail(getFirebaseClientAuth(), email, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: true,
      })
      setStatus('Check your inbox for a secure password reset link.')
    } catch (cause) {
      setError(cause.message || 'Unable to send the reset email.')
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="We’ll send a secure reset link to your verified work email."
      footer={<Link className={styles.link} href="/login">Return to sign in</Link>}
    >
      <form className={styles.form} onSubmit={submit}>
        {error && <p className={styles.error}>{error}</p>}
        {status && <p className={styles.success}>{status}</p>}
        <label className={styles.field}>Work email<input name="email" type="email" autoComplete="email" required /></label>
        <button className={styles.button}>Send reset link</button>
      </form>
    </AuthShell>
  )
}
