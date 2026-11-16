/** Reglas del formulario de producto: lo que se valida en el navegador y qué se le manda a la API. */
import { ApiError } from '@/api/client'
import type { Product, ProductCreate, ProductUpdate } from '@/api/endpoints'
import { describeError } from '@/ui'

export interface ProductFormValues {
  code: string
  name: string
  brand: string
  price: string
  stock: string
  category: string
  min_stock: string
  discount_percent: string
  active: boolean
}

export type ProductField = keyof ProductFormValues
export type ProductFormErrors = Partial<Record<ProductField, string>>

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  code: '',
  name: '',
  brand: '',
  price: '',
  stock: '0',
  category: '',
  min_stock: '',
  discount_percent: '0',
  active: true,
}

export function valuesFromProduct(product: Product): ProductFormValues {
  return {
    code: String(product.code),
    name: product.name,
    brand: product.brand,
    price: String(product.price),
    stock: String(product.stock),
    category: product.category,
    min_stock: String(product.min_stock),
    discount_percent: String(product.discount_percent),
    active: product.active,
  }
}

const filled = (text: string) => text.trim() !== ''
const isWhole = (text: string, min: number) => filled(text) && Number.isSafeInteger(Number(text)) && Number(text) >= min
const isDiscount = (text: string) => filled(text) && Number(text) >= 0 && Number(text) <= 90

export function validateProduct(values: ProductFormValues, editing: boolean): ProductFormErrors {
  const errors: ProductFormErrors = {}
  if (!editing && !isWhole(values.code, 1)) errors.code = 'Ingresá un código entero mayor a 0'
  if (!filled(values.name)) errors.name = 'Ingresá el nombre'
  if (!filled(values.brand)) errors.brand = 'Ingresá la marca'
  if (!filled(values.price) || !(Number(values.price) > 0)) errors.price = 'Ingresá un precio mayor a 0'
  if (!editing && !isWhole(values.stock, 0)) errors.stock = 'Ingresá un entero, 0 o más'
  if (!values.category) errors.category = 'Elegí una categoría'
  // Solo el alta acepta dejarlo vacío: el PATCH no tiene forma de volver al default de la tienda.
  const minStockIsOptional = !editing && !filled(values.min_stock)
  if (!minStockIsOptional && !isWhole(values.min_stock, 0)) errors.min_stock = 'Ingresá un entero, 0 o más'
  if (!isDiscount(values.discount_percent)) errors.discount_percent = 'Ingresá un porcentaje de 0 a 90'
  return errors
}

export function toProductCreate(values: ProductFormValues): ProductCreate {
  return {
    code: Number(values.code),
    name: values.name.trim(),
    brand: values.brand.trim(),
    price: Number(values.price),
    stock: Number(values.stock),
    category: values.category,
    discount_percent: Number(values.discount_percent),
    active: values.active,
    ...(filled(values.min_stock) ? { min_stock: Number(values.min_stock) } : {}),
  }
}

/** Solo lo que cambió. Nunca incluye `code` ni `stock`: la API responde 422 si llegan. */
export function changedFields(product: Product, values: ProductFormValues): ProductUpdate {
  const next = {
    name: values.name.trim(),
    brand: values.brand.trim(),
    price: Number(values.price),
    category: values.category,
    min_stock: Number(values.min_stock),
    discount_percent: Number(values.discount_percent),
    active: values.active,
  }
  return Object.fromEntries(Object.entries(next).filter(([field, value]) => value !== product[field as keyof typeof next]))
}

export const PRODUCT_GONE = 'Este producto ya no existe. Cerrá el panel y volvé a la lista.'

interface ServerProblem {
  fields: ProductFormErrors
  general: string | null
}

const fieldsOnly = (fields: ProductFormErrors): ServerProblem => ({ fields, general: null })

/** Ubica un error de la API en su campo. Lo que no tenga campo queda como mensaje general. */
export function readServerError(error: unknown, values: ProductFormValues, editing: boolean): ServerProblem {
  if (error instanceof ApiError) {
    const known = Object.entries(error.fields).filter(([field]) => field in EMPTY_PRODUCT_FORM)
    if (known.length > 0) return fieldsOnly(Object.fromEntries(known))
    if (error.status === 409 && !editing) return fieldsOnly({ code: `Ya existe un producto con el código ${values.code}` })
    if (error.status === 404) {
      // El contrato no distingue por código qué es lo que no existe: en el PATCH solo lo dice el texto.
      if (!editing || /categor/i.test(error.message)) return fieldsOnly({ category: 'Esa categoría ya no existe. Elegí otra.' })
      return { fields: {}, general: PRODUCT_GONE }
    }
  }
  return { fields: {}, general: describeError(error) }
}
