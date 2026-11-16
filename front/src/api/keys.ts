/**
 * Claves de TanStack Query. Después de cualquier cambio del dueño o una compra se invalida
 * todo con `queryClient.invalidateQueries()`: un cambio toca stock, precios, reportes e historial a la vez.
 */
import type { OrderStatus, ProductSort } from './endpoints'

export const keys = {
  products: (sort: ProductSort) => ['products', sort] as const,
  product: (code: number) => ['product', code] as const,
  search: (name: string, brand: string) => ['search', name, brand] as const,
  compareSearch: (code: number) => ['compare-search', code] as const,
  categoryTree: () => ['categories'] as const,
  categoryProducts: (path: string, includeSubcategories: boolean) => ['category-products', path, includeSubcategories] as const,
  quote: (signature: string) => ['quote', signature] as const,
  order: (id: number) => ['order', id] as const,
  admin: {
    products: (sort: ProductSort) => ['admin', 'products', sort] as const,
    undoHistory: () => ['admin', 'undo-history'] as const,
    orders: (status?: OrderStatus) => ['admin', 'orders', status ?? 'all'] as const,
    summary: () => ['admin', 'summary'] as const,
    bestSellers: (limit: number) => ['admin', 'best-sellers', limit] as const,
    lowStock: () => ['admin', 'low-stock'] as const,
    categoriesReport: () => ['admin', 'categories-report'] as const,
    searches: () => ['admin', 'searches'] as const,
    exportCatalog: () => ['admin', 'export'] as const,
    settings: () => ['admin', 'settings'] as const,
  },
}
