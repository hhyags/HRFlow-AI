'use client'

import Link from 'next/link'
import { useState } from 'react'
import { confirmPasswordReset } from 'firebase/auth'
import AuthShell from '../AuthShell'
import styles from '../auth.module.css'
import { getFirebaseClientAuth } from '@/lib/firebase/client'

export default function ResetPasswordPage() {
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const code = new URLSearchParams(window.location.search).get('oobCode')
      if (!code) throw new Error('This password reset link is invalid.')
      const password = String(new FormData(event.currentTarget).get('password'))
      await confirmPasswordReset(getFirebaseClientAuth(), code, password)
      setStatus('Your password has been updated. You can now sign in.')
    } catch (cause) {
      setError(cause.message || 'Unable to reset the password.')
    }
  }

  return (
    <AuthShell
      eyebrow="Secure reset"
      title="Choose a new password"
      description="Use at least eight characters and avoid passwords used elsewhere."
      footer={<Link className={styles.link} href="/login">Return to sign in</Link>}
    >
      <form className={styles.form} onSubmit={submit}>
        {error && <p className={styles.error}>{error}</p>}
        {status && <p className={styles.success}>{status}</p>}
        <label className={styles.field}>New password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <button className={styles.button}>Update password</button>
      </form>
    </AuthShell>
  )
}
