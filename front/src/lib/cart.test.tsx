import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { CartProvider, CART_STORAGE_KEY, useCart } from './cart'

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>
const setup = () => renderHook(() => useCart(), { wrapper })

describe('carrito', () => {
  it('suma cantidades cuando se agrega un código repetido', () => {
    const { result } = setup()
    act(() => result.current.add(50))
    act(() => result.current.add(50, 2))
    expect(result.current.lines).toEqual([{ code: 50, quantity: 3 }])
  })

  it('cuenta unidades para el indicador del encabezado', () => {
    const { result } = setup()
    act(() => result.current.add(50, 2))
    act(() => result.current.add(60))
    expect(result.current.units).toBe(3)
  })

  it('mantiene el orden en que se agregó cada código', () => {
    const { result } = setup()
    act(() => result.current.add(60))
    act(() => result.current.add(50))
    act(() => result.current.add(60))
    expect(result.current.lines.map((line) => line.code)).toEqual([60, 50])
  })

  it('cambia la cantidad exacta y saca la línea si llega a cero', () => {
    const { result } = setup()
    act(() => result.current.add(50, 5))
    act(() => result.current.setQuantity(50, 2))
    expect(result.current.lines).toEqual([{ code: 50, quantity: 2 }])
    act(() => result.current.setQuantity(50, 0))
    expect(result.current.lines).toEqual([])
  })

  it('saca una línea y vacía el carrito', () => {
    const { result } = setup()
    act(() => result.current.add(50))
    act(() => result.current.add(60))
    act(() => result.current.remove(50))
    expect(result.current.lines).toEqual([{ code: 60, quantity: 1 }])
    act(() => result.current.clear())
    expect(result.current.lines).toEqual([])
  })

  it('sobrevive a recargar la página', () => {
    const first = setup()
    act(() => first.result.current.add(50, 2))
    first.unmount()
    expect(setup().result.current.lines).toEqual([{ code: 50, quantity: 2 }])
  })

  it.each(['no es json', '{"a":1}', '[{"code":"x","quantity":1}]', '[{"code":1,"quantity":0}]'])(
    'ignora un carrito guardado inválido: %s',
    (saved) => {
      localStorage.setItem(CART_STORAGE_KEY, saved)
      expect(setup().result.current.lines).toEqual([])
    },
  )
})
