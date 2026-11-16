import { useQuery } from '@tanstack/react-query'
import { Boxes, CircleDollarSign, Clock, Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '@/api/endpoints'
import { formatDateTime, formatNumber } from '@/lib/format'
import { Badge, EmptyState, PageHeader, QueryState, Stat } from '@/ui'
import { BestSellerRanking } from './business/BestSellerRanking'
import { Panel } from './business/Panel'
import panelStyles from './business/Panel.module.css'
import { adminQueries } from './business/queries'
import { useMoney } from './business/useMoney'
import styles from './DashboardPage.module.css'

const SHORT_LIST = 5

function BusinessStats() {
  const summary = useQuery(adminQueries.summary())
  const money = useMoney()

  return (
    <section aria-label="Números del negocio">
      <QueryState query={summary}>
        {(data) => (
          <div className={panelStyles.stats}>
            <Stat label="Facturación" value={money(data.revenue)} hint="Pedidos entregados" icon={<CircleDollarSign size={18} aria-hidden />} />
            <Stat label="Pedidos pendientes" value={formatNumber(data.orders.pending)} hint="Esperando en la cola" icon={<Clock size={18} aria-hidden />} />
            <Stat label="Ticket promedio" value={money(data.average_ticket)} hint="Por pedido entregado" icon={<Receipt size={18} aria-hidden />} />
            <Stat label="Valor del inventario" value={money(data.inventory_value)} hint="A precio de lista" icon={<Boxes size={18} aria-hidden />} />
          </div>
        )}
      </QueryState>
    </section>
  )
}

function NextOrder() {
  const pending = useQuery(adminQueries.orders('pending'))
  const money = useMoney()

  return (
    <Panel title="Próximo pedido a atender" action={<Link to="/admin/pedidos?estado=pending">Ir a pedidos</Link>}>
      <QueryState query={pending}>
        {(orders) => {
          const next = orders[0]
          if (!next) return <p className={styles.muted}>No hay pedidos pendientes.</p>
          return (
            <div className={styles.next}>
              <p className={styles.nextTitle}>
                Pedido #{next.id} de {next.customer_name}
              </p>
              <p className={`${styles.muted} tabular`}>
                {formatDateTime(next.created_at)} · {money(next.total)}
              </p>
            </div>
          )
        }}
      </QueryState>
    </Panel>
  )
}

function LowStockRow({ product }: { product: Product }) {
  return (
    <li className={styles.row}>
      <span>{product.name}</span>
      <span className={styles.rowEnd}>
        <Badge tone={product.stock === 0 ? 'danger' : 'warning'}>{product.stock === 0 ? 'Sin stock' : `Quedan ${product.stock}`}</Badge>
        <span className={`${styles.minimum} tabular`}>mín. {product.min_stock}</span>
      </span>
    </li>
  )
}

function LowStock() {
  const lowStock = useQuery(adminQueries.lowStock())

  return (
    <Panel title="Stock bajo" action={<Link to="/admin/productos">Ir a productos</Link>}>
      <QueryState query={lowStock}>
        {(products) =>
          products.length === 0 ? (
            <p className={styles.muted}>Ningún producto está por debajo de su mínimo.</p>
          ) : (
            <ul className={styles.rows}>
              {products.slice(0, SHORT_LIST).map((product) => (
                <LowStockRow key={product.code} product={product} />
              ))}
            </ul>
          )
        }
      </QueryState>
    </Panel>
  )
}

function TopSellers() {
  const bestSellers = useQuery(adminQueries.bestSellers(SHORT_LIST))

  return (
    <Panel title="Más vendidos" action={<Link to="/admin/reportes?seccion=mas-vendidos">Ver ranking</Link>}>
      <QueryState query={bestSellers}>
        {(items) =>
          items.length === 0 ? <EmptyState title="Todavía no hay ventas">Acá aparecen los pedidos entregados.</EmptyState> : <BestSellerRanking items={items} />
        }
      </QueryState>
    </Panel>
  )
}

export function DashboardPage() {
  return (
    <>
      <PageHeader title="Resumen" description="Lo que necesitás mirar primero." />
      <div className={styles.page}>
        <BusinessStats />
        <NextOrder />
        <div className={styles.columns}>
          <LowStock />
          <TopSellers />
        </div>
      </div>
    </>
  )
}
