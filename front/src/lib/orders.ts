import type { OrderStatus } from '@/api/endpoints'
import type { BadgeTone } from '@/ui/Badge'

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pendiente', tone: 'warning' },
  completed: { label: 'Entregado', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
}

const KEY = 'almacen.recent-orders'
const MAX_REMEMBERED = 8

/** Pedidos hechos desde este navegador. No hay cuentas de cliente: se guardan solo acá. */
export function recentOrders(): number[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter(Number.isInteger) : []
  } catch {
    return []
  }
}

export function rememberOrder(id: number): void {
  try {
    const next = [id, ...recentOrders().filter((saved) => saved !== id)].slice(0, MAX_REMEMBERED)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Sin almacenamiento solo se pierde este atajo.
  }
}
