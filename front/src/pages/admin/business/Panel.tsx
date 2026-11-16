import { useId, type ReactNode } from 'react'
import { Card } from '@/ui'
import styles from './Panel.module.css'

interface PanelProps {
  title: string
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** Bloque con título propio: cada uno carga y falla por su cuenta. */
export function Panel({ title, action, className, children }: PanelProps) {
  const titleId = useId()
  return (
    <Card role="region" aria-labelledby={titleId} className={[styles.panel, className].filter(Boolean).join(' ')}>
      <header className={styles.header}>
        <h2 id={titleId}>{title}</h2>
        {action}
      </header>
      {children}
    </Card>
  )
}
