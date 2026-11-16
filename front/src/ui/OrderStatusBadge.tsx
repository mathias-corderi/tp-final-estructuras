import type { OrderStatus } from '@/api/endpoints'
import { ORDER_STATUS } from '@/lib/orders'
import { Badge } from './Badge'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, tone } = ORDER_STATUS[status]
  return <Badge tone={tone}>{label}</Badge>
}
