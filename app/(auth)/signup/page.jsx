'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import AuthShell from '../AuthShell'
import styles from '../auth.module.css'
import { ensureFirebasePersistence, getFirebaseClientAuth } from '@/lib/firebase/client'
import { establishServerSession } from '@/lib/firebase/browser-session'

export default function SignupPage() {
  const router = useRouter()
  const formRef = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function provision(user, fullName, invitationToken) {
    const { response, body } = await establishServerSession(user, { fullName, invitationToken })
    if (!response.ok && body.code !== 'EMAIL_NOT_VERIFIED') {
      throw new Error(body.error || 'Unable to join the organization.')
    }
    return body
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const form = new FormData(event.currentTarget)
      const fullName = String(form.get('fullName')).trim()
      const invitationToken = String(form.get('invitationToken')).trim()
      await ensureFirebasePersistence()
      const credential = await createUserWithEmailAndPassword(
        getFirebaseClientAuth(),
        String(form.get('email')),
        String(form.get('password')),
      )
      await updateProfile(credential.user, { displayName: fullName })
      try {
        await provision(credential.user, fullName, invitationToken)
      } catch (cause) {
        await credential.user.delete().catch(() => {})
        throw cause
      }
      await sendEmailVerification(credential.user)
      router.replace('/verify-email')
    } catch (cause) {
      setError(cause.message || 'Unable to create your account.')
    } finally {
      setBusy(false)
    }
  }

  async function googleSignup() {
    setBusy(true)
    setError('')
    try {
      const form = new FormData(formRef.current)
      const invitationToken = String(form.get('invitationToken')).trim()
      if (!invitationToken) throw new Error('Invitation code is required.')
      await ensureFirebasePersistence()
      const credential = await signInWithPopup(getFirebaseClientAuth(), new GoogleAuthProvider())
      await provision(credential.user, credential.user.displayName, invitationToken)
      router.replace('/')
      router.refresh()
    } catch (cause) {
      setError(cause.message || 'Google sign up failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="Join your organization’s secure HRFlow workspace."
      footer={<>Already have an account? <Link className={styles.link} href="/login">Sign in</Link></>}
    >
      <form ref={formRef} className={styles.form} onSubmit={submit}>
        {error && <p className={styles.error}>{error}</p>}
        <label className={styles.field}>Full name<input name="fullName" autoComplete="name" required /></label>
        <label className={styles.field}>Work email<input name="email" type="email" autoComplete="email" required /></label>
        <label className={styles.field}>Invitation code<input name="invitationToken" autoComplete="one-time-code" required /></label>
        <label className={styles.field}>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
        <button className={styles.button} disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <div className={styles.divider}>or</div>
        <button className={`${styles.button} ${styles.google}`} type="button" onClick={googleSignup} disabled={busy}>Continue with Google</button>
      </form>
    </AuthShell>
  )
}
