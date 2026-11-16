/** Una función por endpoint de docs/api.md. Los tipos salen de src/api/schema.d.ts (contrato real). */
import { request } from './client'
import type { components } from './schema'

type Schemas = components['schemas']

export type Product = Schemas['ProductOut']
export type ProductCreate = Schemas['ProductCreate']
export type ProductUpdate = Schemas['ProductUpdate']
export type SearchResult = Schemas['SearchOut']
export type CompareSearch = Schemas['CompareSearchOut']
export type Operation = Schemas['OperationOut']
export type CategoryNode = Schemas['CategoryNodeOut']
export type Quote = Schemas['QuoteOut']
export type CartItem = Schemas['CartItemIn']
export type Order = Schemas['OrderOut']
export type OrderStatus = Schemas['OrderStatus']
export type Summary = Schemas['SummaryOut']
export type BestSeller = Schemas['BestSellerOut']
export type CategoriesReport = Schemas['CategoriesReportOut']
export type SearchesReport = Schemas['SearchesReportOut']
export type Settings = Schemas['SettingsOut']
export type SettingsUpdate = Schemas['SettingsUpdate']

export type ProductSort = 'code' | 'name'

const query = (params: Record<string, string | number | boolean | null | undefined>): string => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

const adminJson = <T>(path: string, method: string, body?: unknown) => request<T>(path, { method, body, admin: true })

export const api = {
  products: {
    list: (sort: ProductSort = 'code') => request<Product[]>(`/products${query({ sort })}`),
    get: (code: number) => request<Product>(`/products/${code}`),
    /** Cada llamada queda en el historial de búsquedas: usarla al confirmar, nunca mientras se escribe. */
    search: (criteria: { name?: string; brand?: string }) => request<SearchResult>(`/products/search${query(criteria)}`),
    compareSearch: (code: number) => request<CompareSearch>(`/products/compare-search${query({ code })}`),
  },
  categories: {
    tree: () => request<CategoryNode>('/categories'),
    products: (path: string, includeSubcategories = true) =>
      request<Product[]>(`/categories/products${query({ path, include_subcategories: includeSubcategories })}`),
  },
  cart: {
    quote: (items: CartItem[]) => request<Quote>('/cart/quote', { method: 'POST', body: { items } }),
  },
  orders: {
    place: (customerName: string, items: CartItem[]) =>
      request<Order>('/orders', { method: 'POST', body: { customer_name: customerName, items } }),
    get: (id: number) => request<Order>(`/orders/${id}`),
  },
  admin: {
    /** Valida un token probándolo en una ruta de admin, sin guardarlo. */
    verifyToken: (token: string) => request<Settings>('/admin/settings', { token }),
    products: {
      list: (sort: ProductSort = 'code') => request<Product[]>(`/admin/products${query({ sort })}`, { admin: true }),
      create: (product: ProductCreate) => adminJson<Product>('/admin/products', 'POST', product),
      update: (code: number, changes: ProductUpdate) => adminJson<Product>(`/admin/products/${code}`, 'PATCH', changes),
      remove: (code: number) => adminJson<void>(`/admin/products/${code}`, 'DELETE'),
      restock: (code: number, quantity: number) => adminJson<Product>(`/admin/products/${code}/restock`, 'POST', { quantity }),
      adjustStock: (code: number, delta: number, reason: string) =>
        adminJson<Product>(`/admin/products/${code}/stock-adjustment`, 'POST', { delta, reason }),
    },
    undo: {
      run: () => adminJson<Schemas['UndoOut']>('/admin/undo', 'POST'),
      history: () => request<Operation[]>('/admin/undo/history', { admin: true }),
    },
    categories: {
      create: (path: string) => adminJson<CategoryNode>('/admin/categories', 'POST', { path }),
      rename: (path: string, newName: string) => adminJson<CategoryNode>('/admin/categories', 'PATCH', { path, new_name: newName }),
      remove: (path: string) => adminJson<void>(`/admin/categories${query({ path })}`, 'DELETE'),
      adjustPrices: (path: string, percent: number) =>
        adminJson<Schemas['PriceAdjustmentOut']>('/admin/categories/price-adjustment', 'POST', { path, percent }),
    },
    orders: {
      list: (status?: OrderStatus) => request<Order[]>(`/admin/orders${query({ status })}`, { admin: true }),
      completeNext: () => adminJson<Order>('/admin/orders/next/complete', 'POST'),
      cancel: (id: number) => adminJson<Order>(`/admin/orders/${id}/cancel`, 'POST'),
    },
    reports: {
      summary: () => request<Summary>('/admin/reports/summary', { admin: true }),
      bestSellers: (limit = 10) => request<BestSeller[]>(`/admin/reports/best-sellers${query({ limit })}`, { admin: true }),
      lowStock: () => request<Product[]>('/admin/reports/low-stock', { admin: true }),
      categories: () => request<CategoriesReport>('/admin/reports/categories', { admin: true }),
      searches: () => request<SearchesReport>('/admin/reports/searches', { admin: true }),
    },
    exportCatalog: () => request<string>('/admin/export/catalog', { admin: true }),
    settings: {
      get: () => request<Settings>('/admin/settings', { admin: true }),
      update: (changes: SettingsUpdate) => adminJson<Settings>('/admin/settings', 'PATCH', changes),
    },
  },
}
