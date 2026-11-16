/** Presentación del historial de deshacer. La API lo manda en inglés (RNF-07). */
import type { Operation } from '@/api/endpoints'
import type { BadgeTone } from '@/ui'

const KINDS: Record<string, { label: string; tone: BadgeTone }> = {
  add: { label: 'Alta', tone: 'success' },
  update: { label: 'Modificación', tone: 'info' },
  delete: { label: 'Baja', tone: 'danger' },
  stock: { label: 'Stock', tone: 'warning' },
}

export function operationKind(kind: string): { label: string; tone: BadgeTone } {
  return KINDS[kind] ?? { label: kind, tone: 'neutral' }
}

const restockText = (quantity: string, code: string) =>
  quantity === '1' ? `Se repuso 1 unidad del producto ${code}` : `Se repusieron ${quantity} unidades del producto ${code}`

// El contrato no fija estos textos: si la API manda otra cosa, se muestra tal cual.
const TRANSLATIONS: [RegExp, (...parts: string[]) => string][] = [
  [/^Added product (\d+)$/, (code) => `Se agregó el producto ${code}`],
  [/^Updated product (\d+)$/, (code) => `Se modificó el producto ${code}`],
  [/^Deleted product (\d+)$/, (code) => `Se eliminó el producto ${code}`],
  [/^Restocked (\d+) units? of product (\d+)$/, restockText],
  [/^Stock adjustment (-?\d+) on product (\d+): (.*)$/s, (delta, code, reason) => `Se ajustó en ${delta} el stock del producto ${code}: ${reason}`],
]

export function operationText({ description }: Operation): string {
  for (const [pattern, translate] of TRANSLATIONS) {
    const match = pattern.exec(description)
    if (match) return translate(...match.slice(1))
  }
  return description
}
