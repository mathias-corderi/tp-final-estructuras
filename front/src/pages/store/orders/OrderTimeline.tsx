import { Check, X } from 'lucide-react'
import type { OrderStatus } from '@/api/endpoints'
import styles from './OrderTimeline.module.css'

type Step = { label: string; reached: boolean; current: boolean; failed?: boolean }

function stepsOf(status: OrderStatus): Step[] {
  const received = { label: 'Recibido', reached: true, current: status === 'pending' }
  if (status === 'cancelled') return [received, { label: 'Cancelado', reached: true, current: true, failed: true }]
  return [received, { label: 'Entregado', reached: status === 'completed', current: status === 'completed' }]
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  return (
    <ol className={styles.timeline} aria-label="Estado del pedido">
      {stepsOf(status).map((step) => (
        <li
          key={step.label}
          className={[styles.step, step.reached ? styles.reached : '', step.failed ? styles.failed : ''].filter(Boolean).join(' ')}
          aria-current={step.current ? 'step' : undefined}
        >
          <span className={styles.dot} aria-hidden>
            {step.failed ? <X size={16} /> : step.reached ? <Check size={16} /> : null}
          </span>
          <span className={styles.label}>{step.label}</span>
        </li>
      ))}
    </ol>
  )
}
