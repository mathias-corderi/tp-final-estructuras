import type { Product } from '@/api/endpoints'

export type StatusFilter = 'all' | 'active' | 'inactive' | 'low'

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
  { value: 'low', label: 'Stock bajo' },
]

export const isLowStock = (product: Product) => product.stock <= product.min_stock

const STATUS_MATCH: Record<StatusFilter, (product: Product) => boolean> = {
  all: () => true,
  active: (product) => product.active,
  inactive: (product) => !product.active,
  // Igual que GET /admin/reports/low-stock: solo activos, así el número coincide con el reporte.
  low: (product) => product.active && isLowStock(product),
}

const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export function filterProducts(products: Product[], text: string, status: StatusFilter): Product[] {
  const wanted = plain(text.trim())
  return products.filter(
    (product) =>
      STATUS_MATCH[status](product) &&
      (!wanted ||
        plain(product.name).includes(wanted) ||
        plain(product.brand).includes(wanted) ||
        String(product.code).includes(wanted)),
  )
}
