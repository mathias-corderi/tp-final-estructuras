import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import styles from './Field.module.css'

interface WrapperProps {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  children: ReactNode
}

function Wrapper({ id, label, hint, error, children }: WrapperProps) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className={styles.hint}>{hint}</p> : null}
      {error ? <p id={`${id}-error`} className={styles.error}>{error}</p> : null}
    </div>
  )
}

const describedBy = (id: string, hint: unknown, error: unknown) => {
  if (error) return `${id}-error`
  return hint ? `${id}-hint` : undefined
}

interface CommonProps {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
}

export function TextField({ label, hint, error, id, className, ...rest }: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <Wrapper id={fieldId} label={label} hint={hint} error={error}>
      <input
        {...rest}
        id={fieldId}
        className={[styles.control, className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
      />
    </Wrapper>
  )
}

export function SelectField({ label, hint, error, id, className, children, ...rest }: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <Wrapper id={fieldId} label={label} hint={hint} error={error}>
      <select
        {...rest}
        id={fieldId}
        className={[styles.control, className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
      >
        {children}
      </select>
    </Wrapper>
  )
}

export function TextAreaField({ label, hint, error, id, className, ...rest }: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generated = useId()
  const fieldId = id ?? generated
  return (
    <Wrapper id={fieldId} label={label} hint={hint} error={error}>
      <textarea
        {...rest}
        id={fieldId}
        className={[styles.control, styles.area, className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
      />
    </Wrapper>
  )
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  return (
    <label className={[styles.checkbox, className].filter(Boolean).join(' ')}>
      <input {...rest} type="checkbox" />
      <span>{label}</span>
    </label>
  )
}
