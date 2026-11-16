import { Minus, Plus } from 'lucide-react'
import styles from './QuantityStepper.module.css'

interface QuantityStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** Para los lectores de pantalla: "Cantidad de Oreo 118g". */
  label: string
}

export function QuantityStepper({ value, onChange, min = 1, max, label }: QuantityStepperProps) {
  const clamp = (next: number) => Math.max(min, max === undefined ? next : Math.min(max, next))
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label="Restar uno">
        <Minus size={16} aria-hidden />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(event) => {
          const next = Number.parseInt(event.target.value, 10)
          if (!Number.isNaN(next)) onChange(clamp(next))
        }}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={max !== undefined && value >= max} aria-label="Sumar uno">
        <Plus size={16} aria-hidden />
      </button>
    </div>
  )
}
