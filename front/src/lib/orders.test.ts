import { describe, expect, it } from 'vitest'
import { recentOrders, rememberOrder } from './orders'

describe('pedidos recientes', () => {
  it('guarda primero el más nuevo, sin repetir', () => {
    rememberOrder(1)
    rememberOrder(2)
    rememberOrder(1)
    expect(recentOrders()).toEqual([1, 2])
  })

  it('recuerda como máximo ocho', () => {
    for (let id = 1; id <= 10; id += 1) rememberOrder(id)
    expect(recentOrders()).toEqual([10, 9, 8, 7, 6, 5, 4, 3])
  })

  it('ignora datos guardados inválidos', () => {
    localStorage.setItem('almacen.recent-orders', 'no es json')
    expect(recentOrders()).toEqual([])
  })
})
