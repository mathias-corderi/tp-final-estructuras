import { describe, expect, it } from 'vitest'
import { formatDateTime, formatMoney, formatNumber } from './format'

// Intl usa un espacio duro entre el símbolo y el número.
const plain = (text: string) => text.replace(/ /g, ' ')

describe('formatMoney', () => {
  it('usa el formato argentino con dos decimales', () => {
    expect(plain(formatMoney(1234.5))).toBe('$ 1.234,50')
    expect(plain(formatMoney(0))).toBe('$ 0,00')
  })

  it('respeta la moneda configurada', () => {
    expect(plain(formatMoney(10, 'USD'))).toMatch(/US\$ 10,00|USD 10,00/)
  })

  it('no se rompe con una moneda que Intl no conoce', () => {
    expect(plain(formatMoney(10, 'ZZZ'))).toContain('10,00')
  })
})

describe('formatDateTime', () => {
  it('muestra fecha y hora locales sin correrlas por zona horaria', () => {
    expect(formatDateTime('2026-10-01T10:15:00')).toBe('01/10/2026, 10:15')
  })

  it('devuelve el texto original si no es una fecha', () => {
    expect(formatDateTime('nada')).toBe('nada')
  })
})

describe('formatNumber', () => {
  it('separa miles', () => {
    expect(formatNumber(1423900)).toBe('1.423.900')
  })
})
