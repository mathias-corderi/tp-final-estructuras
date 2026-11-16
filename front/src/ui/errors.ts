import { ApiError } from '@/api/client'

/** Texto propio para un código de estado, cuando la pantalla sabe qué significa. */
export type ErrorMessages = Partial<Record<number, string>>

/** Mensaje en español para mostrarle a una persona. Los `detail` de la API vienen en inglés. */
export function describeError(error: unknown, messages: ErrorMessages = {}): string {
  if (!(error instanceof ApiError)) return 'Ocurrió un error inesperado. Probá de nuevo.'
  const custom = messages[error.status]
  if (custom) return custom
  if (error.isUnavailable) return 'No pudimos conectarnos con la tienda. Probá de nuevo en un momento.'
  if (error.isNotImplemented) {
    return error.pendingFlow ? `Esta función todavía no está disponible (${error.pendingFlow}).` : 'Esta función todavía no está disponible.'
  }
  if (error.status === 401 || error.status === 403) return 'Tu sesión venció. Volvé a ingresar.'
  if (error.status === 404) return 'No encontramos lo que buscabas.'
  if (error.status === 409) return `No se pudo completar: ${error.message}`
  if (error.status === 422) return `Revisá los datos: ${error.message}`
  return `Algo salió mal: ${error.message}`
}
