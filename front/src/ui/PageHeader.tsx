import type { ReactNode } from 'react'
import { useTitle } from '@/lib/useTitle'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

/** Título de la pantalla. También pone el título de la pestaña. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  useTitle(title)
  return (
    <header className={styles.header}>
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
