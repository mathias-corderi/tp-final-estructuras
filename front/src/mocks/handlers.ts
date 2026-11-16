/** Rutas del backend simulado. Convierte cada request en una llamada a MockStore, como hacen las rutas de FastAPI. */
import { delay, http, HttpResponse, type HttpHandler, type JsonBodyType } from 'msw'
import { MockHttpError, MockStore, schemaError, type StoredProduct } from './store'

export const MOCK_ADMIN_TOKEN = 'change-me'

interface HandlerOptions {
  latency?: number
  /** Se llama después de cada cambio exitoso (el modo demo guarda en localStorage). */
  onChange?: (store: MockStore) => void
}

type Resolver = (args: { request: Request; url: URL; params: Record<string, string | readonly string[] | undefined>; body: Record<string, unknown> }) => unknown

const PRODUCT_CREATE_FIELDS = ['code', 'name', 'brand', 'price', 'stock', 'category', 'min_stock', 'discount_percent', 'active']
const PRODUCT_UPDATE_FIELDS = ['name', 'brand', 'price', 'category', 'min_stock', 'discount_percent', 'active']

function rejectExtra(body: Record<string, unknown>, allowed: string[]): void {
  const extra = Object.keys(body).find((field) => !allowed.includes(field))
  if (extra) throw schemaError(extra, 'Extra inputs are not permitted')
}

/** Igual que un parámetro `int` en FastAPI: lo que no sea un entero da 422. */
function integer(value: unknown, field: string): number {
  const number = Number(value)
  if (typeof value !== 'string' || value.trim() === '' || !Number.isInteger(number)) {
    throw schemaError(field, 'Input should be a valid integer')
  }
  return number
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string') throw schemaError(field, 'Field required')
  if (!value.length) throw schemaError(field, 'String should have at least 1 character')
  return value
}

export function createHandlers(store: MockStore, options: HandlerOptions = {}): HttpHandler[] {
  const { latency = 0, onChange } = options

  const run = async (resolver: Resolver, args: { request: Request; params: Record<string, string | readonly string[] | undefined> }, config: { admin?: boolean; status?: number; write?: boolean }) => {
    if (latency) await delay(latency)
    try {
      if (config.admin) {
        const token = args.request.headers.get('X-Admin-Token')
        if (token === null) return HttpResponse.json({ detail: 'Missing X-Admin-Token header' }, { status: 401 })
        if (token !== MOCK_ADMIN_TOKEN) return HttpResponse.json({ detail: 'Invalid admin token' }, { status: 403 })
      }
      const url = new URL(args.request.url)
      const text = config.write ? await args.request.text() : ''
      const body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
      const result = resolver({ request: args.request, url, params: args.params, body })
      if (config.write) onChange?.(store)
      if (config.status === 204) return new HttpResponse(null, { status: 204 })
      if (typeof result === 'string') return new HttpResponse(result, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      return HttpResponse.json(result as JsonBodyType, { status: config.status ?? 200 })
    } catch (error) {
      if (error instanceof MockHttpError) return HttpResponse.json({ detail: error.detail } as JsonBodyType, { status: error.status })
      throw error
    }
  }

  const get = (path: string, resolver: Resolver, admin = false) =>
    http.get(`*/api${path}`, (args) => run(resolver, args, { admin }))
  const send = (method: 'post' | 'patch' | 'delete', path: string, resolver: Resolver, config: { admin?: boolean; status?: number } = {}) =>
    http[method](`*/api${path}`, (args) => run(resolver, args, { ...config, write: true }))

  const code = (params: Record<string, unknown>) => integer(params.code, 'code')
  const orderId = (params: Record<string, unknown>) => integer(params.id, 'order_id')

  return [
    // Catálogo público. /search y /compare-search van antes de /:code, igual que en FastAPI.
    get('/products/search', ({ url }) => {
      const result = store.search(url.searchParams.get('name'), url.searchParams.get('brand'))
      onChange?.(store)
      return result
    }),
    get('/products/compare-search', ({ url }) => store.compareSearch(integer(url.searchParams.get('code'), 'code'))),
    get('/products/:code', ({ params }) => store.getProduct(code(params))),
    get('/products', ({ url }) => store.listProducts(url.searchParams.get('sort') ?? 'code')),

    // Categorías públicas.
    get('/categories/products', ({ url }) =>
      store.categoryProducts(url.searchParams.get('path') ?? '', url.searchParams.get('include_subcategories') !== 'false'),
    ),
    get('/categories', () => store.categoryTree()),

    // Carrito y pedidos.
    send('post', '/cart/quote', ({ body }) => {
      const items = body.items as { code: number; quantity: number }[]
      if (!Array.isArray(items) || items.length === 0) throw schemaError('items', 'List should have at least 1 item')
      return store.quote(items)
    }),
    send('post', '/orders', ({ body }) => {
      const items = body.items as { code: number; quantity: number }[]
      if (!Array.isArray(items) || items.length === 0) throw schemaError('items', 'List should have at least 1 item')
      return store.placeOrder(requireText(body.customer_name, 'customer_name'), items)
    }, { status: 201 }),
    get('/orders/:id', ({ params }) => store.getOrder(orderId(params))),

    // Administración de productos.
    get('/admin/products', ({ url }) => store.listProducts(url.searchParams.get('sort') ?? 'code', true), true),
    send('post', '/admin/products', ({ body }) => {
      rejectExtra(body, PRODUCT_CREATE_FIELDS)
      return store.addProduct(body as unknown as StoredProduct)
    }, { admin: true, status: 201 }),
    send('patch', '/admin/products/:code', ({ params, body }) => {
      rejectExtra(body, PRODUCT_UPDATE_FIELDS)
      return store.updateProduct(code(params), body as Partial<StoredProduct>)
    }, { admin: true }),
    send('delete', '/admin/products/:code', ({ params }) => store.deleteProduct(code(params)), { admin: true, status: 204 }),
    send('post', '/admin/products/:code/restock', ({ params, body }) => store.restock(code(params), body.quantity as number), { admin: true }),
    send('post', '/admin/products/:code/stock-adjustment', ({ params, body }) =>
      store.adjustStock(code(params), body.delta as number, body.reason as string), { admin: true }),
    send('post', '/admin/undo', () => store.undo(), { admin: true }),
    get('/admin/undo/history', () => store.undoHistory(), true),

    // Administración de categorías.
    send('post', '/admin/categories/price-adjustment', ({ body }) => store.adjustPrices(body.path as string, body.percent as number), { admin: true }),
    send('post', '/admin/categories', ({ body }) => store.createCategory(requireText(body.path, 'path')), { admin: true, status: 201 }),
    send('patch', '/admin/categories', ({ body }) => store.renameCategory(body.path as string, requireText(body.new_name, 'new_name')), { admin: true }),
    send('delete', '/admin/categories', ({ url }) => store.deleteCategory(url.searchParams.get('path') ?? ''), { admin: true, status: 204 }),

    // Administración de pedidos.
    get('/admin/orders', ({ url }) => store.listOrders(url.searchParams.get('status')), true),
    send('post', '/admin/orders/next/complete', () => store.completeNext(), { admin: true }),
    send('post', '/admin/orders/:id/cancel', ({ params }) => store.cancelOrder(orderId(params)), { admin: true }),

    // Reportes.
    get('/admin/reports/summary', () => store.summary(), true),
    get('/admin/reports/best-sellers', ({ url }) => store.bestSellers(Number(url.searchParams.get('limit') ?? 10)), true),
    get('/admin/reports/low-stock', () => store.lowStock(), true),
    get('/admin/reports/categories', () => store.categoriesReport(), true),
    get('/admin/reports/searches', () => store.searchesReport(), true),
    get('/admin/export/catalog', () => store.exportCatalog(), true),

    // Configuración.
    get('/admin/settings', () => store.settings, true),
    send('patch', '/admin/settings', ({ body }) => store.updateSettings(body), { admin: true }),
  ]
}
