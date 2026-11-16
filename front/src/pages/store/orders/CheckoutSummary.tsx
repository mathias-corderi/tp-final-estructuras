import { TriangleAlert } from 'lucide-react'
import { useId, type FormEvent } from 'react'
import { formatMoney } from '@/lib/format'
import { Button, Card, TextField } from '@/ui'
import styles from './CheckoutSummary.module.css'

interface CheckoutSummaryProps {
  total: number
  units: number
  /** Hay líneas a revisar: la API rechazaría todo el pedido. */
  blocked: boolean
  /** La cotización está en camino: el total a la vista puede estar viejo. */
  updating: boolean
  customerName: string
  nameError: string | null
  placing: boolean
  onNameChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function CheckoutSummary({ total, units, blocked, updating, customerName, nameError, placing, onNameChange, onSubmit }: CheckoutSummaryProps) {
  const titleId = useId()
  return (
    <Card className={styles.summary} role="region" aria-labelledby={titleId}>
      <h2 id={titleId}>Resumen</h2>
      <dl className={styles.totals} aria-busy={updating || undefined}>
        <div>
          <dt>Productos</dt>
          <dd className="tabular">{units === 1 ? '1 unidad' : `${units} unidades`}</dd>
        </div>
        <div className={styles.total}>
          <dt>Total</dt>
          <dd className="tabular">{formatMoney(total)}</dd>
        </div>
      </dl>
      {blocked ? (
        <div className={styles.notice}>
          <TriangleAlert size={18} aria-hidden />
          <div>
            <p>No incluye los productos a revisar.</p>
            <p>Resolvelos para poder confirmar: si alguno no se puede entregar, la tienda rechaza el pedido completo.</p>
          </div>
        </div>
      ) : null}
      <form className={styles.form} noValidate onSubmit={onSubmit}>
        <TextField
          label="Tu nombre"
          name="customerName"
          autoComplete="name"
          required
          hint="Con este nombre preparamos tu pedido."
          value={customerName}
          error={nameError}
          onChange={(event) => onNameChange(event.target.value)}
        />
        <Button type="submit" block loading={placing} disabled={blocked || units === 0 || updating}>
          Confirmar pedido
        </Button>
      </form>
    </Card>
  )
}
