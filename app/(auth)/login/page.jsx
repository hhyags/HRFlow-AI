'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth'
import AuthShell from '../AuthShell'
import styles from '../auth.module.css'
import {
  consumeFirebaseRedirectResult,
  ensureFirebasePersistence,
  getFirebaseClientAuth,
} from '@/lib/firebase/client'
import { establishPasswordSession, establishServerSession } from '@/lib/firebase/browser-session'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    async function finishRedirect() {
      try {
        const credential = await consumeFirebaseRedirectResult()
        if (!credential || !active) return
        setBusy(true)
        await finish(credential.user)
      } catch (cause) {
        if (active) setError(authenticationMessage(cause))
      } finally {
        if (active) setBusy(false)
      }
    }
    finishRedirect()
    return () => {
      active = false
    }
  }, [])

  function authenticationMessage(cause) {
    if (cause?.code === 'auth/invalid-credential') return 'The email or password is incorrect.'
    if (cause?.code === 'auth/too-many-requests') return 'Too many attempts. Wait a moment or reset your password.'
    if (cause?.code === 'auth/account-exists-with-different-credential') {
      return 'This email already uses password sign-in. Sign in with your password once, then use Google.'
    }
    if (cause?.code === 'auth/redirect-cancelled-by-user') return 'Google sign-in was cancelled.'
    if (cause?.code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled.'
    if (cause?.code === 'auth/cancelled-popup-request') return 'A Google sign-in request is already open.'
    if (cause?.code === 'auth/network-request-failed') return 'Unable to reach Google sign-in. Check your connection and try again.'
    if (cause?.code === 'auth/web-storage-unsupported') {
      return 'Secure browser storage is disabled. Enable cookies and site data, then try again.'
    }
    if (cause?.code === 'auth/unauthorized-domain') {
      return 'Google sign-in is not enabled for this web address. Use the production HRFlow address or contact an administrator.'
    }
    if (cause?.code === 'auth/internal-error') {
      return 'Your browser blocked secure sign-in storage. Refresh the page or try a private window.'
    }
    return cause?.message || 'Unable to sign in.'
  }

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
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const { response, body } = await establishPasswordSession(
        String(form.get('email')),
        String(form.get('password')),
      )
      if (!response.ok) throw new Error(body.error || 'Unable to sign in.')
      router.replace('/')
      router.refresh()
    } catch (cause) {
      setError(authenticationMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function googleLogin() {
    setBusy(true)
    setError('')
    const auth = getFirebaseClientAuth()
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      const credential = await signInWithPopup(auth, provider)
      await finish(credential.user)
    } catch (cause) {
      if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(cause?.code)) {
        try {
          await ensureFirebasePersistence()
          await signInWithRedirect(auth, provider)
          return
        } catch (redirectCause) {
          setError(authenticationMessage(redirectCause))
          setBusy(false)
          return
        }
      }
      setError(authenticationMessage(cause))
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
