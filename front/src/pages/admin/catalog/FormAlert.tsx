import type { ReactNode } from 'react'
import styles from './forms.module.css'

/** Error que no pertenece a un campo. Se anuncia, porque aparece lejos de donde está el foco. */
export function FormAlert({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className={styles.alert}>
      {children}
    </p>
  )
}
