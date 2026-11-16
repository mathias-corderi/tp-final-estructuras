import { useQuery } from '@tanstack/react-query'
import type { OrderStatus } from '@/api/endpoints'
import { formatNumber } from '@/lib/format'
import { OrderStatusBadge, QueryState, Stat } from '@/ui'
import { Panel } from './Panel'
import panelStyles from './Panel.module.css'
import { adminQueries } from './queries'
import styles from './reports.module.css'
import { useMoney } from './useMoney'

const STATUSES: OrderStatus[] = ['pending', 'completed', 'cancelled']

export function SalesReport() {
  const summary = useQuery(adminQueries.summary())
  const money = useMoney()

  return (
    <QueryState query={summary}>
      {(data) => (
        <div className={styles.section}>
          <div className={panelStyles.stats}>
            <Stat label="Facturación" value={money(data.revenue)} hint="Solo pedidos entregados." />
            <Stat label="Ticket promedio" value={money(data.average_ticket)} hint="Facturación por pedido entregado." />
            <Stat label="Valor del inventario" value={money(data.inventory_value)} hint="Precio de lista por stock, inactivos incluidos." />
            <Stat label="Productos" value={formatNumber(data.product_count)} hint="En el catálogo, inactivos incluidos." />
          </div>
          <Panel title="Pedidos por estado">
            <ul className={`${styles.bareList} ${styles.statusList}`} aria-label="Pedidos por estado">
              {STATUSES.map((status) => (
                <li key={status}>
                  <OrderStatusBadge status={status} />
                  <span className={`${styles.statusCount} tabular`}>{formatNumber(data.orders[status])}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </QueryState>
  )
}
