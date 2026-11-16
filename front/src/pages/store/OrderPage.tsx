import { useQuery } from '@tanstack/react-query'
import { PackageSearch, PartyPopper, RotateCw } from 'lucide-react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { api, type Order, type OrderStatus } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { formatDateTime, formatMoney } from '@/lib/format'
import { Button, Card, EmptyState, LinkButton, OrderStatusBadge, PageHeader, QueryState } from '@/ui'
import { parseOrderId } from './orders/orderId'
import { OrderTimeline } from './orders/OrderTimeline'
import styles from './OrderPage.module.css'

const STATUS_NOTE: Record<OrderStatus, string> = {
  pending: 'Los pedidos se atienden por orden de llegada. Volvé a mirar acá cuando quieras.',
  completed: 'Tu pedido ya fue entregado.',
  cancelled: 'Este pedido se canceló y no se va a entregar.',
}

function OrderProblem({ title, children }: { title: string; children: string }) {
  return (
    <Card>
      <EmptyState
        icon={<PackageSearch size={28} aria-hidden />}
        title={title}
        action={<LinkButton to="/seguimiento">Buscar otro pedido</LinkButton>}
      >
        {children}
      </EmptyState>
    </Card>
  )
}

function OrderDetail({ order, isNew }: { order: Order; isNew: boolean }) {
  return (
    <div className={styles.stack}>
      {isNew ? (
        <section className={styles.thanks}>
          <PartyPopper size={24} aria-hidden />
          <div>
            <h2>¡Gracias! Recibimos tu pedido</h2>
            <p>Guardá el número #{order.id}: lo vas a necesitar para seguirlo desde cualquier lado.</p>
          </div>
        </section>
      ) : null}

      <Card className={styles.status}>
        <div className={styles.statusHead}>
          <h2>Estado</h2>
          <OrderStatusBadge status={order.status} />
        </div>
        <OrderTimeline status={order.status} />
        <p className={styles.note}>{STATUS_NOTE[order.status]}</p>
      </Card>

      <Card>
        <h2>Detalle</h2>
        <dl className={styles.meta}>
          <div>
            <dt>Fecha</dt>
            <dd className="tabular">{formatDateTime(order.created_at)}</dd>
          </div>
          <div>
            <dt>A nombre de</dt>
            <dd>{order.customer_name}</dd>
          </div>
        </dl>
        <ul className={styles.items}>
          {order.items.map((item) => (
            <li key={item.code}>
              <div>
                <span className={styles.itemName}>{item.name}</span>
                <span className="tabular">
                  {item.quantity} × {formatMoney(item.unit_price)}
                </span>
              </div>
              <strong className="tabular">{formatMoney(item.subtotal)}</strong>
            </li>
          ))}
        </ul>
        <p className={styles.total}>
          <span>Total</span>
          <strong className="tabular">{formatMoney(order.total)}</strong>
        </p>
      </Card>
    </div>
  )
}

function ExistingOrder({ id }: { id: number }) {
  const [params] = useSearchParams()
  const order = useQuery({ queryKey: keys.order(id), queryFn: () => api.orders.get(id) })

  if (order.error instanceof ApiError && order.error.status === 404) {
    return (
      <>
        <PageHeader title={`Pedido #${id}`} />
        <OrderProblem title="No encontramos ese pedido">Revisá el número: puede que tenga algún dígito cambiado.</OrderProblem>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={`Pedido #${id}`}
        actions={
          <Button variant="secondary" icon={<RotateCw size={16} aria-hidden />} loading={order.isFetching} onClick={() => void order.refetch()}>
            Actualizar estado
          </Button>
        }
      />
      <QueryState query={order}>{(data) => <OrderDetail order={data} isNew={params.get('nuevo') === '1'} />}</QueryState>
    </>
  )
}

export function OrderPage() {
  const { id: text = '' } = useParams()
  const id = parseOrderId(text)
  return (
    <div className={styles.page}>
      {id === null ? (
        <>
          <PageHeader title="Tu pedido" />
          <OrderProblem title="Ese número de pedido no es válido">Los números de pedido son enteros positivos, como 12.</OrderProblem>
        </>
      ) : (
        <ExistingOrder id={id} />
      )}
    </div>
  )
}
