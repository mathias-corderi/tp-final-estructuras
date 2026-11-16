/** Número de pedido escrito o en la URL. Devuelve null si no es un entero positivo representable. */
export function parseOrderId(text: string): number | null {
  if (!/^[1-9]\d*$/.test(text)) return null
  const id = Number(text)
  return Number.isSafeInteger(id) ? id : null
}
