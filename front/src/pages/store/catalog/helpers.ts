import type { CategoryNode, Product } from '@/api/endpoints'
import { formatNumber } from '@/lib/format'

export const productCount = (count: number): string => `${formatNumber(count)} ${count === 1 ? 'producto' : 'productos'}`

export const discountLabel = (product: Product): string => `-${formatNumber(product.discount_percent)}%`

/** La API contesta 422 a lo que no sea un entero: un código mal escrito no llega a preguntarse. */
export function parseProductCode(text: string): number | null {
  const code = /^\d+$/.test(text) ? Number(text) : null
  return code !== null && Number.isSafeInteger(code) ? code : null
}

/** Baja por el árbol nombre por nombre: distingue mayúsculas, igual que la API. */
export function findCategory(root: CategoryNode, path: string): CategoryNode | undefined {
  let node: CategoryNode | undefined = root
  for (const name of path.split('/')) node = node?.children.find((child) => child.name === name)
  return node
}
