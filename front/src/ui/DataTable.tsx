import type { ReactNode } from 'react'
import styles from './DataTable.module.css'

/** Tabla con scroll propio: en pantallas chicas se desplaza la tabla, no la página. */
export function DataTable({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className={styles.wrapper} tabIndex={0} role="region" aria-label={caption}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export const numericCell = styles.numeric
