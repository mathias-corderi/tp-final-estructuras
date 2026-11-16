/**
 * Contrato de la API como escenario único y secuencial, derivado de docs/api.md y tests/api/*.py.
 *
 * Corre contra el backend simulado (por defecto) o contra la API real:
 *   npm run test:contract            -> backend simulado
 *   npm run test:contract:real       -> levanta FastAPI con una copia limpia del seed
 *
 * Los valores esperados salen de data/seed.json, no del código que se prueba.
 * Cada bloque depende del estado que dejó el anterior: no reordenar.
 */
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createHandlers } from '../../src/mocks/handlers'
import { MockStore } from '../../src/mocks/store'

const REAL_URL = process.env.CONTRACT_API_URL
const BASE = REAL_URL ?? 'http://mock.test/api'
const TOKEN = process.env.CONTRACT_ADMIN_TOKEN ?? 'change-me'

const server = setupServer(...createHandlers(new MockStore()))

beforeAll(() => {
  if (!REAL_URL) server.listen({ onUnhandledFrame: 'error' })
})
afterAll(() => {
  if (!REAL_URL) server.close()
})

interface CallOptions {
  method?: string
  body?: unknown
  admin?: boolean
  token?: string
  raw?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any

async function call(path: string, options: CallOptions = {}): Promise<{ status: number; data: Json; headers: Headers }> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.admin) headers['X-Admin-Token'] = TOKEN
  if (options.token) headers['X-Admin-Token'] = options.token
  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  const isJson = response.headers.get('content-type')?.includes('application/json')
  return { status: response.status, data: isJson && text ? JSON.parse(text) : text, headers: response.headers }
}

const admin = (path: string, options: CallOptions = {}) => call(path, { ...options, admin: true })
const codes = (items: { code: number }[]) => items.map((item) => item.code)
const q = encodeURIComponent

describe('reportes sobre el seed intacto', () => {
  it('resumen', async () => {
    const { status, data } = await admin('/admin/reports/summary')
    expect(status).toBe(200)
    expect(data).toEqual({
      revenue: 24960,
      orders: { pending: 2, completed: 3, cancelled: 1 },
      average_ticket: 8320,
      inventory_value: 1423900,
      product_count: 38,
    })
  })

  it('más vendidos: unidades descendente y después código', async () => {
    const { data } = await admin('/admin/reports/best-sellers?limit=3')
    expect(data).toEqual([
      { code: 848, name: 'Matarazzo Spaghetti 500g', units_sold: 4, revenue: 6400 },
      { code: 221, name: 'Coca-Cola 1.5L', units_sold: 3, revenue: 7500 },
      { code: 736, name: 'Oreo 118g', units_sold: 3, revenue: 4500 },
    ])
    expect((await admin('/admin/reports/best-sellers?limit=0')).status).toBe(422)
  })

  it('stock bajo: solo activos, por stock y después código', async () => {
    const { data } = await admin('/admin/reports/low-stock')
    expect(codes(data)).toEqual([715, 801, 111, 205, 551, 614, 394, 660, 602])
  })

  it('categorías y estructuras', async () => {
    const { data } = await admin('/admin/reports/categories')
    expect(data).toMatchObject({ tree_depth: 3, bst_height_by_code: 11, bst_height_by_name: 11 })
    expect(data.categories).toHaveLength(25)
    expect(data.categories[0]).toEqual({ path: 'Grocery', product_count: 22, stock_value: 754900 })
  })

  it('búsquedas de los clientes', async () => {
    const { data } = await admin('/admin/reports/searches')
    expect(data.recent).toEqual(['cable', 'coca', 'detergent', 'oreo', 'coca'])
    expect(data.top_terms[0]).toEqual({ term: 'coca', count: 2 })
  })

  it('exportación en texto plano', async () => {
    const { status, data, headers } = await admin('/admin/export/catalog')
    expect(status).toBe(200)
    expect(headers.get('content-type')).toContain('text/plain')
    expect(data.split('\n').slice(0, 3)).toEqual([
      'Almacén Grupo TP — Catalog (37 products)',
      '',
      '762 | 7Up 1.5L | PepsiCo | Grocery/Drinks/Sodas | ARS 2100.00 | stock 12',
    ])
    expect(data.endsWith('\n')).toBe(true)
  })
})

describe('autenticación', () => {
  it('sin token 401, con token incorrecto 403', async () => {
    const missing = await call('/admin/settings')
    expect(missing.status).toBe(401)
    expect(missing.data).toEqual({ detail: 'Missing X-Admin-Token header' })
    expect((await call('/admin/settings', { token: 'wrong' })).status).toBe(403)
  })
})

describe('catálogo público', () => {
  it('lista activos por código', async () => {
    const { status, data } = await call('/products')
    expect(status).toBe(200)
    expect(data).toHaveLength(37)
    expect(data[0].code).toBe(102)
    expect(data.at(-1).code).toBe(980)
    expect(codes(data)).not.toContain(962)
  })

  it('lista por nombre y rechaza un orden inválido', async () => {
    expect((await call('/products?sort=name')).data[0].code).toBe(762)
    expect((await call('/products?sort=price')).status).toBe(422)
  })

  it('detalle de un producto con su precio final', async () => {
    const { data } = await call('/products/624')
    expect(data).toMatchObject({ code: 624, name: 'Pepsi 1.5L', price: 2200, discount_percent: 10, final_price: 1980, active: true })
  })

  it('404 si no existe o está inactivo', async () => {
    expect((await call('/products/1')).status).toBe(404)
    expect((await call('/products/962')).status).toBe(404)
  })

  it('un código que no es un número 422', async () => {
    expect((await call('/products/abc')).status).toBe(422)
    expect((await call('/products/compare-search?code=abc')).status).toBe(422)
    expect((await call('/products/compare-search')).status).toBe(422)
    expect((await call('/orders/abc')).status).toBe(422)
  })

  it('búsqueda por nombre, marca y ambos, contando comparaciones', async () => {
    const byName = await call('/products/search?name=cola')
    expect(codes(byName.data.results)).toEqual([221, 427])
    expect(byName.data.comparisons).toBe(38)
    expect(codes((await call('/products/search?brand=COCA-COLA')).data.results)).toEqual([221, 427, 614])
    const both = await call('/products/search?name=1.5&brand=coca')
    expect(codes(both.data.results)).toEqual([221, 427, 614])
    expect(both.data.comparisons).toBe(76)
  })

  it('los inactivos se revisan pero no se devuelven', async () => {
    const { data } = await call('/products/search?name=doritos')
    expect(data).toEqual({ results: [], comparisons: 38 })
  })

  it('sin criterios 422', async () => {
    expect((await call('/products/search')).status).toBe(422)
    expect((await call(`/products/search?name=${q('   ')}`)).status).toBe(422)
  })

  it('compara lista contra árbol', async () => {
    expect((await call('/products/compare-search?code=221')).data).toEqual({
      code: 221, found: true, list_comparisons: 1, tree_comparisons: 1,
    })
    expect((await call('/products/compare-search?code=962')).data.found).toBe(true)
    const missing = await call('/products/compare-search?code=1')
    expect(missing.data).toMatchObject({ code: 1, found: false, list_comparisons: 38 })
  })
})

describe('categorías públicas', () => {
  it('árbol con productos activos', async () => {
    const { data } = await call('/categories')
    expect(data).toMatchObject({ name: 'Store', path: '', product_count: 37 })
    expect(data.children.map((c: { name: string }) => c.name)).toEqual([
      'Grocery', 'Cleaning', 'Personal Care', 'Electronics', 'Stationery',
    ])
  })

  it('productos de una rama, con y sin subcategorías', async () => {
    expect(codes((await call(`/categories/products?path=${q('Grocery/Drinks/Water')}`)).data)).toEqual([980, 205])
    expect(codes((await call('/categories/products?path=Stationery')).data)).toEqual([795, 421])
    expect((await call('/categories/products?path=Stationery&include_subcategories=false')).data).toEqual([])
    expect((await call('/categories/products?path=Nope')).status).toBe(404)
  })
})

describe('carrito y pedidos', () => {
  it('cotiza sin reservar y separa lo no disponible', async () => {
    const { status, data } = await call('/cart/quote', {
      method: 'POST',
      body: { items: [{ code: 624, quantity: 2 }, { code: 715, quantity: 1 }, { code: 999, quantity: 1 }, { code: 962, quantity: 1 }] },
    })
    expect(status).toBe(200)
    expect(data).toEqual({
      lines: [{ code: 624, name: 'Pepsi 1.5L', quantity: 2, unit_price: 1980, subtotal: 3960 }],
      total: 3960,
      unavailable: [
        { code: 715, requested: 1, available: 0, reason: 'insufficient_stock' },
        { code: 999, requested: 1, available: 0, reason: 'not_found' },
        { code: 962, requested: 1, available: 0, reason: 'not_found' },
      ],
    })
  })

  it('suma códigos repetidos', async () => {
    const { data } = await call('/cart/quote', {
      method: 'POST',
      body: { items: [{ code: 624, quantity: 1 }, { code: 624, quantity: 2 }] },
    })
    expect(data.lines[0]).toMatchObject({ quantity: 3, subtotal: 5940 })
  })

  it('rechaza carritos inválidos', async () => {
    expect((await call('/cart/quote', { method: 'POST', body: { items: [] } })).status).toBe(422)
    expect((await call('/cart/quote', { method: 'POST', body: { items: [{ code: 624, quantity: 0 }] } })).status).toBe(422)
  })

  it('crea un pedido pendiente y reserva stock', async () => {
    const { status, data } = await call('/orders', {
      method: 'POST',
      body: { customer_name: 'Ana', items: [{ code: 795, quantity: 2 }] },
    })
    expect(status).toBe(201)
    expect(data).toMatchObject({
      id: 7,
      customer_name: 'Ana',
      status: 'pending',
      total: 5400,
      items: [{ code: 795, name: 'Rivadavia Notebook 48 Sheets', quantity: 2, unit_price: 2700, subtotal: 5400 }],
    })
    expect(data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
    expect((await call('/products/795')).data.stock).toBe(17)
  })

  it('sin stock 409 y no reserva nada', async () => {
    const response = await call('/orders', {
      method: 'POST',
      body: { customer_name: 'Ana', items: [{ code: 421, quantity: 1 }, { code: 795, quantity: 999 }] },
    })
    expect(response.status).toBe(409)
    expect(typeof response.data.detail).toBe('string')
    expect((await call('/products/421')).data.stock).toBe(12)
  })

  it('producto inexistente o inactivo 404; datos inválidos 422', async () => {
    const order = (items: unknown[], customer_name = 'Ana') => call('/orders', { method: 'POST', body: { customer_name, items } })
    expect((await order([{ code: 999, quantity: 1 }])).status).toBe(404)
    expect((await order([{ code: 962, quantity: 1 }])).status).toBe(404)
    expect((await order([{ code: 795, quantity: 1 }], '   ')).status).toBe(422)
    expect((await order([{ code: 795, quantity: 1 }], '')).status).toBe(422)
    expect((await order([])).status).toBe(422)
  })

  it('seguimiento', async () => {
    expect((await call('/orders/7')).data.status).toBe('pending')
    expect((await call('/orders/99')).status).toBe(404)
  })
})

describe('administración de productos', () => {
  it('ve también los inactivos', async () => {
    const { data } = await admin('/admin/products')
    expect(data).toHaveLength(38)
    expect(codes(data)).toContain(962)
    expect((await admin('/admin/products?sort=name')).data[0].code).toBe(762)
  })

  it('alta con valores por defecto', async () => {
    const { status, data } = await admin('/admin/products', {
      method: 'POST',
      body: { code: 90, name: 'Mr. Músculo Kitchen 500ml', brand: 'SC Johnson', price: 1900, category: 'Cleaning' },
    })
    expect(status).toBe(201)
    expect(data).toEqual({
      code: 90, name: 'Mr. Músculo Kitchen 500ml', brand: 'SC Johnson', price: 1900, final_price: 1900,
      stock: 0, category: 'Cleaning', min_stock: 5, discount_percent: 0, active: true,
    })
  })

  it('errores de alta', async () => {
    const base = { code: 91, name: 'Ball', brand: 'Generic', price: 500, category: 'Electronics' }
    const post = (body: unknown) => admin('/admin/products', { method: 'POST', body })
    expect((await post({ ...base, code: 90 })).status).toBe(409)
    expect((await post({ ...base, category: 'Nope' })).status).toBe(404)
    expect((await post({ ...base, price: 0 })).status).toBe(422)
    expect((await post({ ...base, discount_percent: 91 })).status).toBe(422)
    expect((await post({ ...base, color: 'red' })).status).toBe(422)
    expect((await post({ ...base, name: '   ' })).status).toBe(422)
  })

  it('modifica solo lo enviado y valida', async () => {
    const patch = (code: number, body: unknown) => admin(`/admin/products/${code}`, { method: 'PATCH', body })
    const { status, data } = await patch(90, { name: 'Mr. Músculo Cocina', discount_percent: 10 })
    expect(status).toBe(200)
    expect(data).toMatchObject({ name: 'Mr. Músculo Cocina', brand: 'SC Johnson', final_price: 1710 })
    expect((await patch(90, {})).status).toBe(422)
    expect((await patch(90, { stock: 1 })).status).toBe(422)
    expect((await patch(90, { code: 1 })).status).toBe(422)
    expect((await patch(90, { category: 'Nope' })).status).toBe(404)
    expect((await patch(1, { name: 'x' })).status).toBe(404)
  })

  it('reponer y ajustar stock', async () => {
    const restock = (code: number, quantity: number) => admin(`/admin/products/${code}/restock`, { method: 'POST', body: { quantity } })
    const adjust = (code: number, body: unknown) => admin(`/admin/products/${code}/stock-adjustment`, { method: 'POST', body })
    expect((await restock(90, 10)).data.stock).toBe(10)
    expect((await restock(90, 0)).status).toBe(422)
    expect((await restock(1, 5)).status).toBe(404)
    expect((await adjust(90, { delta: -2, reason: 'broken' })).data.stock).toBe(8)
    expect((await adjust(90, { delta: -99, reason: 'broken' })).status).toBe(409)
    expect((await adjust(90, { delta: 0, reason: 'broken' })).status).toBe(422)
    expect((await adjust(90, { delta: 1, reason: '   ' })).status).toBe(422)
    expect((await adjust(90, { delta: 1, reason: '' })).status).toBe(422)
  })

  it('historial para deshacer, el más reciente primero', async () => {
    const { data } = await admin('/admin/undo/history')
    expect(data.map((op: { kind: string }) => op.kind)).toEqual(['stock', 'stock', 'update', 'add'])
    expect(data[0].code).toBe(90)
    expect(typeof data[0].description).toBe('string')
  })

  it('deshace en orden LIFO, incluso una baja', async () => {
    expect((await admin('/admin/products/90', { method: 'DELETE' })).status).toBe(204)
    expect((await admin('/admin/products/90', { method: 'DELETE' })).status).toBe(404)
    expect((await call('/products/90')).status).toBe(404)

    const undoDelete = await admin('/admin/undo', { method: 'POST' })
    expect(undoDelete.data.undone).toMatchObject({ kind: 'delete', code: 90 })
    expect((await call('/products/90')).data.stock).toBe(8)

    expect((await admin('/admin/undo', { method: 'POST' })).data.undone.kind).toBe('stock')
    expect((await call('/products/90')).data.stock).toBe(10)
    await admin('/admin/undo', { method: 'POST' })
    expect((await admin('/admin/undo', { method: 'POST' })).data.undone.kind).toBe('update')
    expect((await call('/products/90')).data.name).toBe('Mr. Músculo Kitchen 500ml')
    await admin('/admin/undo', { method: 'POST' })
    expect((await call('/products/90')).status).toBe(404)
    expect((await admin('/admin/undo', { method: 'POST' })).status).toBe(409)
  })
})

describe('administración de categorías', () => {
  it('crea con los padres que falten', async () => {
    const { status, data } = await admin('/admin/categories', { method: 'POST', body: { path: 'Electronics/Phones/Android' } })
    expect(status).toBe(201)
    expect(data).toEqual({ name: 'Android', path: 'Electronics/Phones/Android', product_count: 0, children: [] })
  })

  it('errores de alta', async () => {
    const post = (path: string) => admin('/admin/categories', { method: 'POST', body: { path } })
    expect((await post('Electronics/Phones/Android')).status).toBe(409)
    expect((await post('A//B')).status).toBe(422)
    expect((await post('   ')).status).toBe(422)
  })

  it('renombra y actualiza los productos del subárbol', async () => {
    const rename = (path: string, new_name: string) => admin('/admin/categories', { method: 'PATCH', body: { path, new_name } })
    expect((await rename('Electronics/Phones/Android', 'iOS')).data.path).toBe('Electronics/Phones/iOS')
    expect((await rename('Stationery/Notebooks', 'Books')).status).toBe(200)
    expect((await call('/products/795')).data.category).toBe('Stationery/Books')
    expect((await rename('Grocery/Snacks', 'Pantry')).status).toBe(409)
    expect((await rename('', 'Root')).status).toBe(422)
    expect((await rename('Stationery', 'a/b')).status).toBe(422)
    expect((await rename('Nope', 'Other')).status).toBe(404)
  })

  it('borra solo si está vacía', async () => {
    const remove = (path: string) => admin(`/admin/categories?path=${q(path)}`, { method: 'DELETE' })
    expect((await remove('Electronics')).status).toBe(409)
    expect((await remove('Nope')).status).toBe(404)
    expect((await remove('')).status).toBe(422)
    expect((await remove('Electronics/Phones/iOS')).status).toBe(204)
    expect((await remove('Electronics/Phones')).status).toBe(204)
  })

  it('ajusta precios de una rama', async () => {
    const adjust = (body: unknown) => admin('/admin/categories/price-adjustment', { method: 'POST', body })
    const { status, data } = await adjust({ path: 'Stationery', percent: 10 })
    expect(status).toBe(200)
    expect(data.updated.map((p: { code: number; price: number }) => [p.code, p.price])).toEqual([[795, 2970], [421, 3740]])
    expect((await adjust({ path: 'Stationery', percent: 0 })).status).toBe(422)
    expect((await adjust({ path: 'Stationery', percent: 501 })).status).toBe(422)
    expect((await adjust({ path: 'Nope', percent: 5 })).status).toBe(404)
  })
})

describe('administración de pedidos', () => {
  it('lista y filtra', async () => {
    expect((await admin('/admin/orders')).data).toHaveLength(7)
    const pending = await admin('/admin/orders?status=pending')
    expect(pending.data.map((o: { id: number }) => o.id)).toEqual([5, 6, 7])
    expect((await admin('/admin/orders?status=lost')).status).toBe(422)
  })

  it('atiende primero el más antiguo', async () => {
    const { status, data } = await admin('/admin/orders/next/complete', { method: 'POST' })
    expect(status).toBe(200)
    expect(data).toMatchObject({ id: 5, status: 'completed' })
  })

  it('cancela un pendiente y devuelve el stock', async () => {
    const before = (await call('/products/795')).data.stock
    const { status, data } = await admin('/admin/orders/7/cancel', { method: 'POST' })
    expect(status).toBe(200)
    expect(data.status).toBe('cancelled')
    expect((await call('/products/795')).data.stock).toBe(before + 2)
    expect((await admin('/admin/orders/1/cancel', { method: 'POST' })).status).toBe(409)
    expect((await admin('/admin/orders/99/cancel', { method: 'POST' })).status).toBe(404)
  })

  it('sin pendientes 409', async () => {
    expect((await admin('/admin/orders/next/complete', { method: 'POST' })).data.id).toBe(6)
    expect((await admin('/admin/orders/next/complete', { method: 'POST' })).status).toBe(409)
  })

  it('los reportes reflejan lo atendido', async () => {
    const { data } = await admin('/admin/reports/summary')
    expect(data.orders).toEqual({ pending: 0, completed: 5, cancelled: 2 })
    expect(data.revenue).toBe(42160) // 24960 + 10000 + 7200
  })
})

describe('configuración', () => {
  it('muestra y cambia todo o nada', async () => {
    expect((await admin('/admin/settings')).data).toEqual({
      store_name: 'Almacén Grupo TP', currency: 'ARS', default_min_stock: 5, search_history_size: 10,
    })
    const patch = (body: unknown) => admin('/admin/settings', { method: 'PATCH', body })
    expect((await patch({ store_name: 'Kiosco', currency: 'usd' })).data).toMatchObject({ store_name: 'Kiosco', currency: 'USD' })
    for (const body of [{}, { color: 'red' }, { store_name: '   ' }, { store_name: '' }, { currency: 'US' }, { currency: 'U$D' }, { search_history_size: 0 }, { store_name: 'x', default_min_stock: -1 }]) {
      expect((await patch(body)).status).toBe(422)
    }
    expect((await admin('/admin/settings')).data.store_name).toBe('Kiosco')
  })

  it('lo que frena el schema trae `detail` en lista; lo que frena el dominio, en texto', async () => {
    const patch = (body: unknown) => admin('/admin/settings', { method: 'PATCH', body })
    expect(Array.isArray((await patch({ currency: 'US' })).data.detail)).toBe(true)
    expect(Array.isArray((await patch({ store_name: '' })).data.detail)).toBe(true)
    expect(Array.isArray((await patch({ color: 'red' })).data.detail)).toBe(true)
    expect(typeof (await patch({ currency: 'U$D' })).data.detail).toBe('string')
    expect(typeof (await patch({ store_name: '   ' })).data.detail).toBe('string')
    expect(typeof (await patch({})).data.detail).toBe('string')
  })

  it('achicar el historial descarta las búsquedas más viejas', async () => {
    await call('/products/search?name=alfa')
    await call('/products/search?name=beta')
    await call('/products/search?name=gama')
    await admin('/admin/settings', { method: 'PATCH', body: { search_history_size: 2 } })
    expect((await admin('/admin/reports/searches')).data.recent).toEqual(['gama', 'beta'])
  })

  it('el mínimo por defecto se aplica a los productos nuevos', async () => {
    await admin('/admin/settings', { method: 'PATCH', body: { default_min_stock: 12 } })
    const { data } = await admin('/admin/products', {
      method: 'POST',
      body: { code: 92, name: 'Ball', brand: 'Generic', price: 500, category: 'Electronics' },
    })
    expect(data.min_stock).toBe(12)
  })

  it('la exportación usa la configuración vigente', async () => {
    const { data } = await admin('/admin/export/catalog')
    expect(data.split('\n')[0]).toBe('Kiosco — Catalog (38 products)')
    expect(data).toContain('USD')
  })
})
