import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { describeError, type ErrorMessages } from './errors'
import styles from './Toast.module.css'

interface ToastItem {
  id: number
  kind: 'success' | 'error'
  text: string
}

interface ToastValue {
  success: (text: string) => void
  /** Acepta un texto o el error de una llamada a la API. */
  error: (error: unknown, messages?: ErrorMessages) => void
}

const ToastContext = createContext<ToastValue | null>(null)
const DURATION = 5000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastItem['kind'], text: string) => {
      const id = nextId.current
      nextId.current += 1
      setItems((current) => [...current, { id, kind, text }])
      setTimeout(() => dismiss(id), DURATION)
    },
    [dismiss],
  )

  const value = useMemo<ToastValue>(
    () => ({
      success: (text) => push('success', text),
      error: (error, messages) => push('error', typeof error === 'string' ? error : describeError(error, messages)),
    }),
    [push],
  )

  return (
    <ToastContext value={value}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`${styles.toast} ${styles[item.kind]}`}>
            {item.kind === 'success' ? <CircleCheck size={20} aria-hidden /> : <CircleAlert size={20} aria-hidden />}
            <p>{item.text}</p>
            <button type="button" onClick={() => dismiss(item.id)} aria-label="Cerrar aviso">
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast(): ToastValue {
  const value = use(ToastContext)
  if (!value) throw new Error('useToast necesita un ToastProvider')
  return value
}
