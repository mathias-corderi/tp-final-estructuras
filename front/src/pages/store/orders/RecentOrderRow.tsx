import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { formatMoney } from '@/lib/format'
import { OrderStatusBadge, Skeleton } from '@/ui'
import styles from './RecentOrderRow.module.css'

/** Sin datos la fila igual lleva al pedido: el número es lo que está guardado acá, y el detalle explica el problema. */
export function RecentOrderRow({ id }: { id: number }) {
  const order = useQuery({ queryKey: keys.order(id), queryFn: () => api.orders.get(id) })
  return (
    <li>
      <Link to={`/pedidos/${id}`} className={styles.row}>
        <strong className={`${styles.number} tabular`}>Pedido #{id}</strong>
        <span className={styles.status}>
          {order.isPending ? <Skeleton width={96} height={22} /> : null}
          {order.isError ? <span className={styles.missing}>Sin datos por ahora</span> : null}
          {order.isSuccess ? <OrderStatusBadge status={order.data.status} /> : null}
        </span>
        {order.isSuccess ? <span className={`${styles.total} tabular`}>{formatMoney(order.data.total)}</span> : null}
        <ChevronRight size={18} className={styles.chevron} aria-hidden />
      </Link>
    </li>
  )
}
