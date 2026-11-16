import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, PackageCheck } from 'lucide-react'
import { useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type Order, type OrderStatus } from '@/api/endpoints'
import { formatDateTime, formatNumber } from '@/lib/format'
import { Button, ConfirmDialog, DataTable, EmptyState, numericCell, OrderStatusBadge, PageHeader, QueryState, useToast } from '@/ui'
import { Panel } from './business/Panel'
import { adminQueries } from './business/queries'
import { useMoney } from './business/useMoney'
import styles from './AdminOrdersPage.module.css'

const FILTERS: { value: OrderStatus | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'completed', label: 'Entregados' },
  { value: 'cancelled', label: 'Cancelados' },
]

const countUnits = (order: Order) => order.items.reduce((sum, item) => sum + item.quantity, 0)

function NextInQueue() {
  const pending = useQuery(adminQueries.orders('pending'))
  const money = useMoney()
  const toast = useToast()
  const queryClient = useQueryClient()
  const nextTitleId = useId()

  const attend = useMutation({
    mutationFn: () => api.admin.orders.completeNext(),
    onSuccess: async (order) => {
      toast.success(`Atendiste el pedido #${order.id} de ${order.customer_name}.`)
      // Se espera la recarga: el botón sigue ocupado hasta saber cuál es el próximo.
      await queryClient.invalidateQueries()
    },
    onError: async (error) => {
      toast.error(error, { 409: 'No quedan pedidos pendientes para atender.' })
      await queryClient.invalidateQueries()
    },
  })

  return (
    <Panel title="Siguiente en la cola" className={styles.queue}>
      <QueryState query={pending}>
        {(orders) => {
          const next = orders[0]
          return (
            <>
              <div className={styles.queueRow}>
                {next ? (
                  <div>
                    <p id={nextTitleId} className={styles.queueTitle}>
                      Pedido #{next.id} de {next.customer_name}
                    </p>
                    <p className={`${styles.muted} tabular`}>
                      {formatDateTime(next.created_at)} · {formatNumber(countUnits(next))} u. · {money(next.total)}
                    </p>
                  </div>
                ) : (
                  <p className={styles.queueTitle}>No hay pedidos pendientes.</p>
                )}
                <Button
                  icon={<PackageCheck size={18} aria-hidden />}
                  aria-describedby={next ? nextTitleId : undefined}
                  onClick={() => attend.mutate()}
                  loading={attend.isPending}
                  disabled={!next}
                >
                  Atender siguiente
                </Button>
              </div>
              <p className={styles.note}>
                Los pedidos se atienden por orden de llegada: se toma siempre el más viejo y no se puede elegir otro. Una vez
                atendido, no se deshace.
              </p>
            </>
          )
        }}
      </QueryState>
    </Panel>
  )
}

function OrderRow({ order, onCancel }: { order: Order; onCancel: (order: Order) => void }) {
  const [open, setOpen] = useState(false)
  const detailId = useId()
  const money = useMoney()

  return (
    <>
      <tr>
        <td className={styles.number}>#{order.id}</td>
        <td>{order.customer_name}</td>
        <td className={`${styles.date} tabular`}>{formatDateTime(order.created_at)}</td>
        <td className={numericCell}>{formatNumber(countUnits(order))}</td>
        <td className={numericCell}>{money(order.total)}</td>
        <td>
          <OrderStatusBadge status={order.status} />
        </td>
        <td>
          <div className={styles.actions}>
            <Button
              variant="ghost"
              size="sm"
              icon={open ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
              aria-expanded={open}
              aria-controls={open ? detailId : undefined}
              aria-label={`Detalle del pedido ${order.id}`}
              onClick={() => setOpen(!open)}
            >
              Detalle
            </Button>
            {order.status === 'pending' ? (
              <Button variant="secondary" size="sm" aria-label={`Cancelar pedido ${order.id}`} onClick={() => onCancel(order)}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </td>
      </tr>
      {open ? (
        <tr id={detailId} className={styles.detailRow}>
          <td colSpan={7}>
            <ul className={styles.items} aria-label={`Ítems del pedido ${order.id}`}>
              {order.items.map((item) => (
                <li key={item.code}>
                  <span>
                    {formatNumber(item.quantity)} × {item.name}
                  </span>
                  <span className={`${styles.muted} tabular`}>
                    {money(item.unit_price)} c/u · <strong>{money(item.subtotal)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      ) : null}
    </>
  )
}

function CancelOrderDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const toast = useToast()
  const queryClient = useQueryClient()

  const cancel = useMutation({
    mutationFn: () => api.admin.orders.cancel(order.id),
    // Primero se cierra: un <dialog> modal queda por encima de los avisos y los taparía.
    onSuccess: async (cancelled) => {
      onClose()
      toast.success(`Cancelaste el pedido #${cancelled.id}. El stock volvió al inventario.`)
      await queryClient.invalidateQueries()
    },
    onError: async (error) => {
      onClose()
      toast.error(error, { 409: 'Ese pedido ya no está pendiente.' })
      await queryClient.invalidateQueries()
    },
  })

  return (
    <ConfirmDialog
      title={`Cancelar el pedido #${order.id}`}
      confirmLabel="Sí, cancelar pedido"
      cancelLabel="Volver"
      danger
      loading={cancel.isPending}
      onConfirm={() => cancel.mutate()}
      onCancel={onClose}
    >
      <p>
        El pedido de {order.customer_name} sale de la cola y se devuelve el stock al inventario. Los pedidos no se deshacen: si te
        arrepentís, hay que hacerlo de nuevo.
      </p>
    </ConfirmDialog>
  )
}

function OrdersTable({ status }: { status?: OrderStatus }) {
  const orders = useQuery(adminQueries.orders(status))
  const [cancelling, setCancelling] = useState<Order | null>(null)

  return (
    <QueryState query={orders}>
      {(list) =>
        list.length === 0 ? (
          <EmptyState title="No hay pedidos en este estado" />
        ) : (
          <>
            <DataTable caption="Pedidos">
              <thead>
                <tr>
                  <th scope="col" className={styles.numberHead}>
                    Número
                  </th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Fecha</th>
                  <th scope="col" className={numericCell}>
                    Productos
                  </th>
                  <th scope="col" className={numericCell}>
                    Total
                  </th>
                  <th scope="col">Estado</th>
                  <th scope="col" className={numericCell}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((order) => (
                  <OrderRow key={order.id} order={order} onCancel={setCancelling} />
                ))}
              </tbody>
            </DataTable>
            {cancelling ? <CancelOrderDialog order={cancelling} onClose={() => setCancelling(null)} /> : null}
          </>
        )
      }
    </QueryState>
  )
}

export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams()
  const status = FILTERS.find(({ value }) => value !== null && value === params.get('estado'))?.value ?? null

  return (
    <>
      <PageHeader title="Pedidos" description="Atendé la cola y cancelá los pedidos que no van a salir." />
      <div className={styles.page}>
        <NextInQueue />
        <div className={styles.filters} role="group" aria-label="Filtrar por estado">
          {FILTERS.map(({ value, label }) => (
            <Button
              key={label}
              size="sm"
              variant={value === status ? 'primary' : 'secondary'}
              aria-pressed={value === status}
              onClick={() => setParams(value ? { estado: value } : {})}
            >
              {label}
            </Button>
          ))}
        </div>
        <OrdersTable status={status ?? undefined} />
      </div>
    </>
  )
}
