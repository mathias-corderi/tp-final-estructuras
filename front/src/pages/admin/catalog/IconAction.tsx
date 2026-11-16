import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './IconAction.module.css'

interface IconActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title'> {
  /** Texto del lector de pantalla: tiene que decir sobre qué fila actúa. */
  label: string
  /** Texto corto del tooltip. */
  hint: string
  icon: ReactNode
  danger?: boolean
}

/** Acción de una fila: solo un ícono, con su nombre completo para quien no lo ve. */
export function IconAction({ label, hint, icon, danger = false, className, type = 'button', ...rest }: IconActionProps) {
  return (
    <button
      {...rest}
      type={type}
      className={[styles.action, danger ? styles.danger : '', className].filter(Boolean).join(' ')}
      aria-label={label}
      title={hint}
    >
      {icon}
    </button>
  )
}
