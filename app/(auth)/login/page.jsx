'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth'
import AuthShell from '../AuthShell'
import styles from '../auth.module.css'
import { ensureFirebasePersistence, getFirebaseClientAuth } from '@/lib/firebase/client'
import { establishServerSession } from '@/lib/firebase/browser-session'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function finish(user) {
    const { response, body } = await establishServerSession(user)
    if (body.code === 'EMAIL_NOT_VERIFIED') {
      await sendEmailVerification(user)
      router.replace('/verify-email')
      return
    }
    if (!response.ok) throw new Error(body.error || 'Unable to sign in.')
    router.replace('/')
    router.refresh()
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await ensureFirebasePersistence()
      const form = new FormData(event.currentTarget)
      const credential = await signInWithEmailAndPassword(
        getFirebaseClientAuth(),
        String(form.get('email')),
        String(form.get('password')),
      )
      await finish(credential.user)
    } catch (cause) {
      setError(cause.message || 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  async function googleLogin() {
    setBusy(true)
    setError('')
    try {
      await ensureFirebasePersistence()
      const credential = await signInWithPopup(getFirebaseClientAuth(), new GoogleAuthProvider())
      await finish(credential.user)
    } catch (cause) {
      setError(cause.message || 'Google sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to HRFlow"
      description="Access your organization’s secure people operations workspace."
      footer={<>New to HRFlow? <Link className={styles.link} href="/signup">Create an account</Link></>}
    >
      <form className={styles.form} onSubmit={submit}>
        {error && <p className={styles.error}>{error}</p>}
        <label className={styles.field}>Work email<input name="email" type="email" autoComplete="email" required /></label>
        <label className={styles.field}>Password<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
        <div className={styles.row}><span /><Link className={styles.link} href="/forgot-password">Forgot password?</Link></div>
        <button className={styles.button} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className={styles.divider}>or</div>
        <button className={`${styles.button} ${styles.google}`} type="button" onClick={googleLogin} disabled={busy}>Continue with Google</button>
      </form>
    </AuthShell>
  )
}
