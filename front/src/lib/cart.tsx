/** Carrito del cliente: vive en el navegador. La API solo lo ve al cotizar y al comprar. */
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

export const CART_STORAGE_KEY = 'almacen.cart'

export interface CartLine {
  code: number
  quantity: number
}

interface CartValue {
  lines: CartLine[]
  /** Unidades totales, para el indicador del encabezado. */
  units: number
  add: (code: number, quantity?: number) => void
  setQuantity: (code: number, quantity: number) => void
  remove: (code: number) => void
  clear: () => void
}

const CartContext = createContext<CartValue | null>(null)

const isLine = (value: unknown): value is CartLine => {
  const line = value as CartLine | null
  return Number.isInteger(line?.code) && Number.isInteger(line?.quantity) && (line?.quantity ?? 0) > 0
}

function readSaved(): CartLine[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]')
    return Array.isArray(saved) && saved.every(isLine) ? saved : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readSaved)

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Sin almacenamiento disponible el carrito funciona igual hasta recargar.
    }
  }, [lines])

  const add = useCallback((code: number, quantity = 1) => {
    setLines((current) =>
      current.some((line) => line.code === code)
        ? current.map((line) => (line.code === code ? { ...line, quantity: line.quantity + quantity } : line))
        : [...current, { code, quantity }],
    )
  }, [])

  const remove = useCallback((code: number) => {
    setLines((current) => current.filter((line) => line.code !== code))
  }, [])

  const setQuantity = useCallback(
    (code: number, quantity: number) => {
      if (quantity <= 0) {
        remove(code)
        return
      }
      setLines((current) => current.map((line) => (line.code === code ? { ...line, quantity } : line)))
    },
    [remove],
  )

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartValue>(
    () => ({ lines, units: lines.reduce((sum, line) => sum + line.quantity, 0), add, setQuantity, remove, clear }),
    [lines, add, setQuantity, remove, clear],
  )

  return <CartContext value={value}>{children}</CartContext>
}

export function useCart(): CartValue {
  const value = use(CartContext)
  if (!value) throw new Error('useCart necesita un CartProvider')
  return value
}
