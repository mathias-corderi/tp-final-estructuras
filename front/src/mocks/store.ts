/**
 * Backend simulado: reproduce en memoria el comportamiento de la API (docs/api.md).
 * Sirve para usar el front mientras los flujos no estén terminados y para los tests.
 * Es solo para desarrollo; tests/contract/ lo mantiene igual a la API real.
 */
import seed from './seed.json'

export interface StoredProduct {
  code: number
  name: string
  brand: string
  price: number
  stock: number
  category: string
  min_stock: number
  discount_percent: number
  active: boolean
}

export interface StoredItem {
  code: number
  name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface StoredOrder {
  id: number
  customer_name: string
  status: 'pending' | 'completed' | 'cancelled'
  created_at: string
  items: StoredItem[]
  total: number
}

export interface StoredSettings {
  store_name: string
  currency: string
  default_min_stock: number
  search_history_size: number
}

interface Operation {
  kind: 'add' | 'update' | 'delete' | 'stock'
  code: number
  before: Partial<StoredProduct> | null
  after: Partial<StoredProduct> | null
  description: string
}

export interface StoreSnapshot {
  settings: StoredSettings
  categories: string[]
  products: StoredProduct[]
  orders: StoredOrder[]
  search_history: string[]
}

export class MockHttpError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : 'Validation error')
    this.status = status
    this.detail = detail
  }
}

const notFound = (message: string) => new MockHttpError(404, message)
const conflict = (message: string) => new MockHttpError(409, message)
const invalid = (message: string) => new MockHttpError(422, message)

/** Error con la forma que usa FastAPI cuando falla el schema: `detail` es una lista, no un string. */
export const schemaError = (field: string, message: string) =>
  new MockHttpError(422, [{ type: 'value_error', loc: ['body', field], msg: message }])

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const isInt = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value)
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

export const withFinalPrice = (product: StoredProduct) => ({
  ...product,
  final_price: round2(product.price * (1 - product.discount_percent / 100)),
})

export function validateProductFields(fields: Partial<StoredProduct>): void {
  if ('name' in fields && !isText(fields.name)) throw invalid('name must be a non-empty string')
  if ('brand' in fields && !isText(fields.brand)) throw invalid('brand must be a non-empty string')
  if ('category' in fields && !isText(fields.category)) throw invalid('category must be a non-empty string')
  if ('price' in fields && (!isNumber(fields.price) || fields.price <= 0)) throw schemaError('price', 'Input should be greater than 0')
  if ('stock' in fields && (!isInt(fields.stock) || fields.stock < 0)) throw schemaError('stock', 'Input should be greater than or equal to 0')
  if ('min_stock' in fields && (!isInt(fields.min_stock) || fields.min_stock < 0)) throw schemaError('min_stock', 'Input should be greater than or equal to 0')
  if ('discount_percent' in fields) {
    const value = fields.discount_percent
    if (!isNumber(value) || value < 0 || value > 90) throw schemaError('discount_percent', 'Input should be between 0 and 90')
  }
  if ('active' in fields && typeof fields.active !== 'boolean') throw schemaError('active', 'Input should be a valid boolean')
}

/** BST mínimo: da las mismas alturas y comparaciones que el árbol de la API real. */
class Bst<K> {
  private root: { key: K; left?: unknown; right?: unknown } | undefined

  constructor(private readonly less: (a: K, b: K) => boolean) {}

  insert(key: K): void {
    type Node = { key: K; left?: Node; right?: Node }
    const fresh: Node = { key }
    if (!this.root) {
      this.root = fresh
      return
    }
    let node = this.root as Node
    for (;;) {
      const side = this.less(key, node.key) ? 'left' : 'right'
      const child = node[side]
      if (!child) {
        node[side] = fresh
        return
      }
      node = child
    }
  }

  height(): number {
    type Node = { left?: Node; right?: Node }
    const walk = (node?: Node): number => (node ? 1 + Math.max(walk(node.left), walk(node.right)) : 0)
    return walk(this.root as Node | undefined)
  }

  visited(key: K): number {
    type Node = { key: K; left?: Node; right?: Node }
    let node = this.root as Node | undefined
    let count = 0
    while (node) {
      count += 1
      if (node.key === key) return count
      node = this.less(key, node.key) ? node.left : node.right
    }
    return count
  }
}

interface CategoryNode {
  name: string
  children: CategoryNode[]
  parent: CategoryNode | null
}

const nameKey = (product: StoredProduct) => `${product.name.toLowerCase()}\u0000${String(product.code).padStart(12, '0')}`

export function splitPath(path: string): string[] {
  if (!path.trim()) return []
  const parts = path.split('/').map((part) => part.trim())
  if (parts.some((part) => !part)) throw invalid(`Invalid category path: ${path}`)
  return parts
}

export class MockStore {
  settings: StoredSettings
  products: StoredProduct[]
  orders: StoredOrder[]
  history: string[]
  private readonly root: CategoryNode = { name: 'Store', children: [], parent: null }
  private undoStack: Operation[] = []
  private nextOrderId: number

  constructor(initial: StoreSnapshot = seed as StoreSnapshot) {
    const data = structuredClone(initial)
    this.settings = data.settings
    this.products = data.products
    this.orders = data.orders
    this.history = data.search_history
    this.nextOrderId = Math.max(0, ...data.orders.map((order) => order.id)) + 1
    data.categories.forEach((path) => this.addPath(path))
  }

  snapshot(): StoreSnapshot {
    return {
      settings: this.settings,
      categories: this.paths(),
      products: this.products,
      orders: this.orders,
      search_history: this.history,
    }
  }

  // --- utilidades ------------------------------------------------------------
  private byCode(): Bst<number> {
    const tree = new Bst<number>((a, b) => a < b)
    this.products.forEach((product) => tree.insert(product.code))
    return tree
  }

  private byName(): Bst<string> {
    const tree = new Bst<string>((a, b) => a < b)
    this.products.forEach((product) => tree.insert(nameKey(product)))
    return tree
  }

  private find(code: number): StoredProduct {
    const product = this.products.find((candidate) => candidate.code === code)
    if (!product) throw notFound(`Product ${code} not found`)
    return product
  }

  private sorted(sort: string, list: StoredProduct[]): StoredProduct[] {
    if (sort === 'code') return [...list].sort((a, b) => a.code - b.code)
    if (sort === 'name') return [...list].sort((a, b) => (nameKey(a) < nameKey(b) ? -1 : 1))
    throw schemaError('sort', "Input should be 'code' or 'name'")
  }

  // --- categorías ------------------------------------------------------------
  private addPath(path: string): CategoryNode {
    let node = this.root
    for (const name of splitPath(path)) {
      let child = node.children.find((candidate) => candidate.name === name)
      if (!child) {
        child = { name, children: [], parent: node }
        node.children.push(child)
      }
      node = child
    }
    return node
  }

  private findNode(path: string): CategoryNode | undefined {
    let node: CategoryNode | undefined = this.root
    for (const name of splitPath(path)) {
      node = node?.children.find((candidate) => candidate.name === name)
      if (!node) return undefined
    }
    return node
  }

  private requireNode(path: string): CategoryNode {
    const node = this.findNode(path)
    if (!node) throw notFound(`Category ${path} not found`)
    return node
  }

  private nodePath(node: CategoryNode): string {
    const names: string[] = []
    for (let current: CategoryNode | null = node; current?.parent; current = current.parent) names.unshift(current.name)
    return names.join('/')
  }

  paths(): string[] {
    const out: string[] = []
    const walk = (node: CategoryNode) => {
      for (const child of node.children) {
        out.push(this.nodePath(child))
        walk(child)
      }
    }
    walk(this.root)
    return out
  }

  /** Productos del subárbol en preorden: los del nodo y después cada hijo. */
  private preorder(node: CategoryNode): StoredProduct[] {
    const own = this.products.filter((product) => product.category === this.nodePath(node))
    return [...own, ...node.children.flatMap((child) => this.preorder(child))]
  }

  private nodeDict(node: CategoryNode): unknown {
    return {
      name: node.name,
      path: this.nodePath(node),
      product_count: this.preorder(node).filter((product) => product.active).length,
      children: node.children.map((child) => this.nodeDict(child)),
    }
  }

  categoryTree() {
    return this.nodeDict(this.root)
  }

  categoryProducts(path: string, includeSubcategories: boolean) {
    const node = this.requireNode(path)
    const products = includeSubcategories
      ? this.preorder(node)
      : this.products.filter((product) => product.category === this.nodePath(node))
    return products.filter((product) => product.active).map(withFinalPrice)
  }

  createCategory(path: string) {
    if (!path.trim()) throw invalid('Category path cannot be blank')
    splitPath(path)
    if (this.findNode(path)) throw conflict(`Category ${path} already exists`)
    return this.nodeDict(this.addPath(path))
  }

  renameCategory(path: string, newName: string) {
    const node = this.requireNode(path)
    if (node === this.root) throw invalid('The root category cannot be renamed')
    const name = newName.trim()
    if (!name || name.includes('/')) throw invalid('Invalid category name')
    if (node.parent?.children.some((child) => child !== node && child.name === name)) {
      throw conflict(`Category ${name} already exists`)
    }
    const oldPath = this.nodePath(node)
    node.name = name
    const newPath = this.nodePath(node)
    for (const product of this.products) {
      if (product.category === oldPath) product.category = newPath
      else if (product.category.startsWith(`${oldPath}/`)) product.category = newPath + product.category.slice(oldPath.length)
    }
    return this.nodeDict(node)
  }

  deleteCategory(path: string): void {
    const node = this.requireNode(path)
    if (node === this.root) throw invalid('The root category cannot be deleted')
    if (node.children.length > 0 || this.products.some((product) => product.category === this.nodePath(node))) {
      throw conflict(`Category ${path} is not empty`)
    }
    node.parent!.children = node.parent!.children.filter((child) => child !== node)
  }

  adjustPrices(path: string, percent: number) {
    if (!isNumber(percent)) throw schemaError('percent', 'Input should be a valid number')
    if (percent < -90 || percent > 500) throw schemaError('percent', 'Input should be between -90 and 500')
    if (percent === 0) throw invalid('percent cannot be 0')
    const products = this.preorder(this.requireNode(path))
    for (const product of products) product.price = round2(product.price * (1 + percent / 100))
    return { updated: products.map(withFinalPrice) }
  }

  // --- catálogo público --------------------------------------------------------
  listProducts(sort: string, includeInactive = false) {
    const list = includeInactive ? this.products : this.products.filter((product) => product.active)
    return this.sorted(sort, list).map(withFinalPrice)
  }

  getProduct(code: number) {
    const product = this.find(code)
    if (!product.active) throw notFound(`Product ${code} not found`)
    return withFinalPrice(product)
  }

  private record(term: string | null): void {
    const normalized = term?.trim().toLowerCase()
    if (!normalized) return
    this.history.push(normalized)
    while (this.history.length > this.settings.search_history_size) this.history.shift()
  }

  search(name: string | null, brand: string | null) {
    this.record(name)
    this.record(brand)
    const nameText = name?.trim().toLowerCase()
    const brandText = brand?.trim().toLowerCase()
    if (!nameText && !brandText) throw invalid('At least one search criterion is required')
    const matches = this.products.filter(
      (product) =>
        product.active &&
        (!nameText || product.name.toLowerCase().includes(nameText)) &&
        (!brandText || product.brand.toLowerCase().includes(brandText)),
    )
    const comparisons = this.products.length * (nameText && brandText ? 2 : 1)
    return { results: matches.map(withFinalPrice), comparisons }
  }

  compareSearch(code: number) {
    const index = this.products.findIndex((product) => product.code === code)
    return {
      code,
      found: index >= 0,
      list_comparisons: index >= 0 ? index + 1 : this.products.length,
      tree_comparisons: this.byCode().visited(code),
    }
  }

  // --- administración de productos ---------------------------------------------
  addProduct(data: Partial<StoredProduct> & { code: number }) {
    const product: StoredProduct = {
      code: data.code,
      name: data.name as string,
      brand: data.brand as string,
      price: data.price as number,
      stock: data.stock ?? 0,
      category: data.category as string,
      min_stock: data.min_stock ?? this.settings.default_min_stock,
      discount_percent: data.discount_percent ?? 0,
      active: data.active ?? true,
    }
    validateProductFields(product)
    product.name = product.name.trim()
    product.brand = product.brand.trim()
    if (this.products.some((candidate) => candidate.code === product.code)) throw conflict(`Product ${product.code} already exists`)
    if (!this.findNode(product.category)) throw notFound(`Category ${product.category} not found`)
    this.products.push(product)
    this.undoStack.push({ kind: 'add', code: product.code, before: null, after: { ...product }, description: `Added product ${product.code}` })
    return withFinalPrice(product)
  }

  updateProduct(code: number, changes: Partial<StoredProduct>) {
    const product = this.find(code)
    if (Object.keys(changes).length === 0) throw invalid('No fields to update')
    validateProductFields(changes)
    if (changes.category !== undefined && !this.findNode(changes.category)) throw notFound(`Category ${changes.category} not found`)
    const before = Object.fromEntries(Object.keys(changes).map((field) => [field, product[field as keyof StoredProduct]]))
    Object.assign(product, changes)
    this.undoStack.push({ kind: 'update', code, before, after: { ...changes }, description: `Updated product ${code}` })
    return withFinalPrice(product)
  }

  deleteProduct(code: number): void {
    const product = this.find(code)
    this.products = this.products.filter((candidate) => candidate !== product)
    this.undoStack.push({ kind: 'delete', code, before: { ...product }, after: null, description: `Deleted product ${code}` })
  }

  private changeStock(product: StoredProduct, delta: number, description: string) {
    const before = product.stock
    product.stock += delta
    this.undoStack.push({ kind: 'stock', code: product.code, before: { stock: before }, after: { stock: product.stock }, description })
    return withFinalPrice(product)
  }

  restock(code: number, quantity: number) {
    const product = this.find(code)
    if (!isInt(quantity) || quantity <= 0) throw schemaError('quantity', 'Input should be greater than 0')
    return this.changeStock(product, quantity, `Restocked ${quantity} units of product ${code}`)
  }

  adjustStock(code: number, delta: number, reason: string) {
    if (!isInt(delta) || delta === 0) throw invalid('delta must be a non-zero integer')
    if (typeof reason !== 'string' || !reason.length) throw schemaError('reason', 'String should have at least 1 character')
    if (!reason.trim()) throw invalid('reason cannot be blank')
    const product = this.find(code)
    if (product.stock + delta < 0) throw conflict(`Not enough stock for product ${code}`)
    return this.changeStock(product, delta, `Stock adjustment ${delta} on product ${code}: ${reason}`)
  }

  undoHistory() {
    return [...this.undoStack].reverse().map(({ kind, code, description }) => ({ kind, code, description }))
  }

  undo() {
    const operation = this.undoStack.at(-1)
    if (!operation) throw conflict('Nothing to undo')
    if (operation.kind === 'add') {
      this.products = this.products.filter((product) => product.code !== operation.code)
    } else if (operation.kind === 'delete') {
      this.products.push({ ...(operation.before as StoredProduct) })
    } else if (operation.kind === 'update') {
      Object.assign(this.find(operation.code), operation.before)
    } else {
      const product = this.find(operation.code)
      const delta = (operation.before!.stock as number) - (operation.after!.stock as number)
      if (product.stock + delta < 0) throw conflict(`Cannot undo: not enough stock for product ${operation.code}`)
      product.stock += delta
    }
    this.undoStack.pop()
    const { kind, code, description } = operation
    return { undone: { kind, code, description } }
  }

  // --- carrito y pedidos -------------------------------------------------------
  private merge(items: { code: number; quantity: number }[]): { code: number; quantity: number }[] {
    const lines: { code: number; quantity: number }[] = []
    for (const { code, quantity } of items) {
      if (!isInt(quantity) || quantity <= 0) throw schemaError('quantity', 'Input should be greater than 0')
      const line = lines.find((candidate) => candidate.code === code)
      if (line) line.quantity += quantity
      else lines.push({ code, quantity })
    }
    return lines
  }

  quote(items: { code: number; quantity: number }[]) {
    const lines: StoredItem[] = []
    const unavailable: { code: number; requested: number; available: number; reason: string }[] = []
    for (const { code, quantity } of this.merge(items)) {
      const product = this.products.find((candidate) => candidate.code === code && candidate.active)
      if (!product) {
        unavailable.push({ code, requested: quantity, available: 0, reason: 'not_found' })
      } else if (product.stock < quantity) {
        unavailable.push({ code, requested: quantity, available: product.stock, reason: 'insufficient_stock' })
      } else {
        const unitPrice = withFinalPrice(product).final_price
        lines.push({ code, name: product.name, quantity, unit_price: unitPrice, subtotal: round2(unitPrice * quantity) })
      }
    }
    return { lines, total: round2(lines.reduce((sum, line) => sum + line.subtotal, 0)), unavailable }
  }

  placeOrder(customerName: string, items: { code: number; quantity: number }[]) {
    if (!isText(customerName)) throw invalid('customer_name cannot be blank')
    const lines = this.merge(items)
    const picked = lines.map(({ code, quantity }) => ({ product: this.getProductRaw(code), quantity }))
    const short = picked.find(({ product, quantity }) => product.stock < quantity)
    if (short) throw conflict(`Not enough stock for product ${short.product.code}`)
    const orderItems = picked.map(({ product, quantity }) => {
      const unitPrice = withFinalPrice(product).final_price
      product.stock -= quantity
      return { code: product.code, name: product.name, quantity, unit_price: unitPrice, subtotal: round2(unitPrice * quantity) }
    })
    const order: StoredOrder = {
      id: this.nextOrderId,
      customer_name: customerName.trim(),
      status: 'pending',
      created_at: localIso(new Date()),
      items: orderItems,
      total: round2(orderItems.reduce((sum, item) => sum + item.subtotal, 0)),
    }
    this.nextOrderId += 1
    this.orders.push(order)
    return order
  }

  private getProductRaw(code: number): StoredProduct {
    const product = this.find(code)
    if (!product.active) throw notFound(`Product ${code} not found`)
    return product
  }

  getOrder(id: number): StoredOrder {
    const order = this.orders.find((candidate) => candidate.id === id)
    if (!order) throw notFound(`Order ${id} not found`)
    return order
  }

  listOrders(status: string | null) {
    if (status === null) return this.orders
    if (!['pending', 'completed', 'cancelled'].includes(status)) throw schemaError('status', 'Invalid order status')
    return this.orders.filter((order) => order.status === status)
  }

  completeNext(): StoredOrder {
    const order = this.orders.find((candidate) => candidate.status === 'pending')
    if (!order) throw conflict('No pending orders')
    order.status = 'completed'
    return order
  }

  cancelOrder(id: number): StoredOrder {
    const order = this.getOrder(id)
    if (order.status !== 'pending') throw conflict(`Order ${id} is not pending`)
    for (const item of order.items) {
      const product = this.products.find((candidate) => candidate.code === item.code)
      if (product) product.stock += item.quantity
    }
    order.status = 'cancelled'
    return order
  }

  // --- reportes ----------------------------------------------------------------
  private stockValue(products: StoredProduct[]): number {
    return round2(products.reduce((sum, product) => sum + product.price * product.stock, 0))
  }

  summary() {
    const completed = this.orders.filter((order) => order.status === 'completed')
    const revenue = round2(completed.reduce((sum, order) => sum + order.total, 0))
    const count = (status: StoredOrder['status']) => this.orders.filter((order) => order.status === status).length
    return {
      revenue,
      orders: { pending: count('pending'), completed: completed.length, cancelled: count('cancelled') },
      average_ticket: completed.length ? round2(revenue / completed.length) : 0,
      inventory_value: this.stockValue(this.products),
      product_count: this.products.length,
    }
  }

  bestSellers(limit: number) {
    if (!isInt(limit) || limit < 1) throw schemaError('limit', 'Input should be greater than or equal to 1')
    const totals = new Map<number, { code: number; name: string; units_sold: number; revenue: number }>()
    for (const order of this.orders.filter((candidate) => candidate.status === 'completed')) {
      for (const item of order.items) {
        const entry = totals.get(item.code) ?? { code: item.code, name: item.name, units_sold: 0, revenue: 0 }
        entry.units_sold += item.quantity
        entry.revenue += item.subtotal
        totals.set(item.code, entry)
      }
    }
    return [...totals.values()]
      .sort((a, b) => b.units_sold - a.units_sold || a.code - b.code)
      .slice(0, limit)
      .map((entry) => ({ ...entry, revenue: round2(entry.revenue) }))
  }

  lowStock() {
    return this.products
      .filter((product) => product.active && product.stock <= product.min_stock)
      .sort((a, b) => a.stock - b.stock || a.code - b.code)
      .map(withFinalPrice)
  }

  categoriesReport() {
    const depth = (node: CategoryNode): number => (node.children.length ? 1 + Math.max(...node.children.map(depth)) : 0)
    return {
      tree_depth: depth(this.root),
      bst_height_by_code: this.byCode().height(),
      bst_height_by_name: this.byName().height(),
      categories: this.paths().map((path) => {
        const products = this.preorder(this.requireNode(path))
        return { path, product_count: products.length, stock_value: this.stockValue(products) }
      }),
    }
  }

  searchesReport() {
    const counts = new Map<string, number>()
    this.history.forEach((term) => counts.set(term, (counts.get(term) ?? 0) + 1))
    const ranking = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    return {
      recent: [...this.history].reverse(),
      top_terms: ranking.slice(0, 5).map(([term, count]) => ({ term, count })),
    }
  }

  exportCatalog(): string {
    const products = this.listProducts('name')
    const lines = [`${this.settings.store_name} — Catalog (${products.length} products)`, '']
    for (const product of products) {
      lines.push(
        `${product.code} | ${product.name} | ${product.brand} | ${product.category} | ` +
          `${this.settings.currency} ${product.final_price.toFixed(2)} | stock ${product.stock}`,
      )
    }
    return `${lines.join('\n')}\n`
  }

  updateSettings(changes: Record<string, unknown>) {
    const fields = Object.keys(changes)
    if (fields.length === 0) throw invalid('No settings to change')
    const unknownField = fields.find((field) => !(field in this.settings))
    if (unknownField) throw schemaError(unknownField, 'Extra inputs are not permitted')
    const next = { ...this.settings, ...changes } as StoredSettings
    // Largo y tipo los frena el schema de FastAPI; el contenido, el dominio. Cada uno responde con su forma de `detail`.
    if (next.store_name === '') throw schemaError('store_name', 'String should have at least 1 character')
    if (typeof next.currency !== 'string' || next.currency.length !== 3) throw schemaError('currency', 'String should have exactly 3 characters')
    if (!isText(next.store_name)) throw invalid('store_name must be a non-empty string')
    if (!/^[A-Za-z]{3}$/.test(next.currency)) throw invalid('currency must be exactly 3 letters')
    if (!isInt(next.default_min_stock) || next.default_min_stock < 0) throw schemaError('default_min_stock', 'Input should be greater than or equal to 0')
    if (!isInt(next.search_history_size) || next.search_history_size < 1 || next.search_history_size > 100) {
      throw schemaError('search_history_size', 'Input should be between 1 and 100')
    }
    next.store_name = next.store_name.trim()
    next.currency = next.currency.toUpperCase()
    this.settings = next
    this.history = this.history.slice(-next.search_history_size)
    return this.settings
  }
}

function localIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}
