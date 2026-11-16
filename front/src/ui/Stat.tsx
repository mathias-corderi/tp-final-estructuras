import type { ReactNode } from 'react'
import { Card } from './Card'
import styles from './Stat.module.css'

interface StatProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
}

export function Stat({ label, value, hint, icon }: StatProps) {
  return (
    <Card className={styles.stat}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon ? <span className={styles.icon}>{icon}</span> : null}
      </div>
      <strong className={`${styles.value} tabular`}>{value}</strong>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </Card>
  )
}
