import { queryOptions } from '@tanstack/react-query'
import { api, type OrderStatus } from '@/api/endpoints'
import { keys } from '@/api/keys'

/** Consultas del panel: resumen, pedidos y reportes comparten claves y se invalidan juntas. */
export const adminQueries = {
  settings: () => queryOptions({ queryKey: keys.admin.settings(), queryFn: () => api.admin.settings.get() }),
  orders: (status?: OrderStatus) => queryOptions({ queryKey: keys.admin.orders(status), queryFn: () => api.admin.orders.list(status) }),
  summary: () => queryOptions({ queryKey: keys.admin.summary(), queryFn: () => api.admin.reports.summary() }),
  bestSellers: (limit: number) => queryOptions({ queryKey: keys.admin.bestSellers(limit), queryFn: () => api.admin.reports.bestSellers(limit) }),
  lowStock: () => queryOptions({ queryKey: keys.admin.lowStock(), queryFn: () => api.admin.reports.lowStock() }),
  categories: () => queryOptions({ queryKey: keys.admin.categoriesReport(), queryFn: () => api.admin.reports.categories() }),
  searches: () => queryOptions({ queryKey: keys.admin.searches(), queryFn: () => api.admin.reports.searches() }),
  exportCatalog: () => queryOptions({ queryKey: keys.admin.exportCatalog(), queryFn: () => api.admin.exportCatalog() }),
}
