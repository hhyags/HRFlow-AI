import Link from 'next/link'
import styles from './auth.module.css'

export default function AuthShell({ eyebrow, title, description, children, footer }) {
  return (
    <main className={styles.page}>
      <section className={styles.brandPanel}>
        <Link href="/login" className={styles.logo}>
          <span>H</span>
          <strong>HRFlow AI</strong>
        </Link>
        <div className={styles.brandCopy}>
          <p>Intelligent people operations</p>
          <h1>Build exceptional teams with clarity.</h1>
          <span>Secure HR workflows, thoughtful automation, and AI insights in one enterprise workspace.</span>
        </div>
        <div className={styles.visual} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2>{title}</h2>
          <p className={styles.description}>{description}</p>
          {children}
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </section>
    </main>
  )
}
