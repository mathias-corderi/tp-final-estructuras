import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'sm'

interface LookProps {
  variant?: Variant
  size?: Size
  block?: boolean
}

const classes = ({ variant = 'primary', size = 'md', block = false }: LookProps, extra?: string) =>
  [styles.button, styles[variant], styles[size], block ? styles.block : '', extra].filter(Boolean).join(' ')

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, LookProps {
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant, size, block, loading = false, icon, children, className, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button {...rest} type={type} className={classes({ variant, size, block }, className)} disabled={disabled || loading} aria-busy={loading || undefined}>
      {loading ? <LoaderCircle size={18} className={styles.spin} aria-hidden /> : icon}
      {children}
    </button>
  )
}

interface LinkButtonProps extends LinkProps, LookProps {
  icon?: ReactNode
}

export function LinkButton({ variant, size, block, icon, children, className, ...rest }: LinkButtonProps) {
  return (
    <Link {...rest} className={classes({ variant, size, block }, className)}>
      {icon}
      {children}
    </Link>
  )
}
