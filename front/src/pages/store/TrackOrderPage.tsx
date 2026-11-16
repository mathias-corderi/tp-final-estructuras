import { useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { recentOrders } from '@/lib/orders'
import { Button, Card, PageHeader, TextField } from '@/ui'
import { parseOrderId } from './orders/orderId'
import { RecentOrderRow } from './orders/RecentOrderRow'
import styles from './TrackOrderPage.module.css'

export function TrackOrderPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [recent] = useState(recentOrders)
  const recentTitle = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const id = parseOrderId(text.trim().replace(/^#/, ''))
    if (id === null) setError('Escribí un número de pedido válido, por ejemplo 12.')
    else void navigate(`/pedidos/${id}`)
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Seguí tu pedido"
        description="No hace falta una cuenta: cualquiera que tenga el número del pedido puede consultarlo."
      />
      <Card>
        <form className={styles.form} noValidate onSubmit={submit}>
          <TextField
            label="Número de pedido"
            inputMode="numeric"
            autoComplete="off"
            required
            value={text}
            error={error}
            onChange={(event) => {
              setText(event.target.value)
              setError(null)
            }}
          />
          <Button type="submit">Ver pedido</Button>
        </form>
      </Card>

      {recent.length > 0 ? (
        <section className={styles.recent} aria-labelledby={recentTitle}>
          <h2 id={recentTitle}>Pedidos hechos desde este navegador</h2>
          <Card padded={false}>
            <ul className={styles.list}>
              {recent.map((id) => (
                <RecentOrderRow key={id} id={id} />
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  )
}
