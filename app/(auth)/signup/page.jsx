'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth'
import AuthShell from '../AuthShell'
import styles from '../auth.module.css'
import { ensureFirebasePersistence, getFirebaseClientAuth } from '@/lib/firebase/client'
import { establishServerSession } from '@/lib/firebase/browser-session'

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function signupMessage(cause) {
    if (cause?.code === 'auth/email-already-in-use') return 'An account already exists for this email. Sign in instead.'
    if (cause?.code === 'auth/weak-password') return 'Use a stronger password with at least eight characters.'
    if (cause?.code === 'auth/invalid-email') return 'Enter a valid work email address.'
    if (cause?.code === 'auth/network-request-failed') return 'Unable to reach the sign-up service. Check your connection and try again.'
    if (cause?.code === 'auth/too-many-requests') return 'Too many attempts. Wait a moment and try again.'
    return cause?.message || 'Unable to create your account.'
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const form = new FormData(event.currentTarget)
      const fullName = String(form.get('fullName')).trim()
      const organizationName = String(form.get('organizationName')).trim()
      await ensureFirebasePersistence()
      const credential = await createUserWithEmailAndPassword(
        getFirebaseClientAuth(),
        String(form.get('email')),
        String(form.get('password')),
      )
      await updateProfile(credential.user, { displayName: fullName })

      try {
        const { response, body } = await establishServerSession(credential.user, {
          fullName,
          organizationName,
        })
        if (!response.ok && body.code !== 'EMAIL_NOT_VERIFIED') {
          throw new Error(body.error || 'Unable to create your workspace.')
        }
      } catch (cause) {
        await credential.user.delete().catch(() => {})
        throw cause
      }

      await sendEmailVerification(credential.user)
      router.replace('/verify-email')
    } catch (cause) {
      setError(signupMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your workspace"
      description="Start a secure HRFlow workspace for your organization."
      footer={<>Already have an account? <Link className={styles.link} href="/login">Sign in</Link></>}
    >
      <form className={styles.form} onSubmit={submit}>
        {error && <p className={styles.error}>{error}</p>}
        <label className={styles.field}>Full name<input name="fullName" autoComplete="name" required /></label>
        <label className={styles.field}>Organization name<input name="organizationName" autoComplete="organization" required /></label>
        <label className={styles.field}>Work email<input name="email" type="email" autoComplete="email" required /></label>
        <label className={styles.field}>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <button className={styles.button} disabled={busy}>{busy ? 'Creating workspace...' : 'Create workspace'}</button>
      </form>
    </AuthShell>
  )
}
