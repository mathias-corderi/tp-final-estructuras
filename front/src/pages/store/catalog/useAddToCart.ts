import type { Product } from '@/api/endpoints'
import { useCart } from '@/lib/cart'
import { useToast } from '@/ui'

/** Agrega al carrito sin pasarse del stock: `remaining` descuenta lo que el cliente ya tiene en el carrito. */
export function useAddToCart(product: Product) {
  const { lines, add } = useCart()
  const toast = useToast()
  const inCart = lines.find((line) => line.code === product.code)?.quantity ?? 0

  const addToCart = (quantity = 1) => {
    add(product.code, quantity)
    toast.success(quantity > 1 ? `Agregamos ${quantity} unidades de ${product.name} al carrito` : `Agregamos ${product.name} al carrito`)
  }

  return { remaining: Math.max(0, product.stock - inCart), addToCart }
}
