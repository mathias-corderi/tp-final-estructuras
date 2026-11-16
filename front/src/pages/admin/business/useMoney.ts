import { useQuery } from '@tanstack/react-query'
import { formatMoney } from '@/lib/format'
import { adminQueries } from './queries'

/** Montos del panel en la moneda del dueño. Si la configuración falla, formatMoney usa la de config.ts. */
export function useMoney(): (amount: number) => string {
  const { data } = useQuery(adminQueries.settings())
  return (amount) => formatMoney(amount, data?.currency)
}
