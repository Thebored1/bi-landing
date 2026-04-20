import type { ReactNode } from 'react'
import styles from './AuthShell.module.css'

type AuthShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
