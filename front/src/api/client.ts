/** Cliente HTTP de la API: agrega el token, y convierte cualquier falla en un ApiError. */
import { config } from '@/config'
import { adminSession } from './session'

export class ApiError extends Error {
  /** status 0: no hubo respuesta (sin red o API apagada). */
  readonly status: number
  /** Errores por campo, cuando falla el schema de FastAPI. */
  readonly fields: Record<string, string>
  readonly isUnavailable: boolean

  constructor(status: number, message: string, options: { fields?: Record<string, string>; unavailable?: boolean } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = options.fields ?? {}
    this.isUnavailable = options.unavailable ?? false
  }

  get isNotImplemented(): boolean {
    return this.status === 501
  }

  /** "Flujo 4" si la API aclara de quién es lo que falta. */
  get pendingFlow(): string | null {
    const match = /Flow (\d)/.exec(this.message)
    return match ? `Flujo ${match[1]}` : null
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  admin?: boolean
  /** Token a usar en lugar del de la sesión (para validarlo antes de guardarlo). */
  token?: string
}

interface FastApiFieldError {
  loc?: (string | number)[]
  msg?: string
}

function parseDetail(detail: unknown): { message: string; fields: Record<string, string> } | null {
  if (typeof detail === 'string') return { message: detail, fields: {} }
  if (!Array.isArray(detail)) return null
  const fields: Record<string, string> = {}
  const messages: string[] = []
  for (const entry of detail as FastApiFieldError[]) {
    const message = entry.msg ?? 'Invalid value'
    messages.push(message)
    const field = entry.loc?.at(-1)
    if (field !== undefined) fields[String(field)] = message
  }
  return { message: messages.join('. '), fields }
}

async function toError(response: Response): Promise<ApiError> {
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload: unknown = isJson ? await response.json().catch(() => null) : null
  const parsed = parseDetail((payload as { detail?: unknown } | null)?.detail)
  if (parsed) return new ApiError(response.status, parsed.message, { fields: parsed.fields })
  // Sin un `detail` no contestó FastAPI: es el proxy de Vite avisando que la API no responde.
  const unavailable = response.status >= 500
  return new ApiError(response.status, `Unexpected response (${response.status})`, { unavailable })
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  const token = options.token ?? (options.admin ? adminSession.get() : null)
  if (token) headers['X-Admin-Token'] = token

  let response: Response
  try {
    response = await fetch(`${config.apiBase}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(0, 'The API could not be reached', { unavailable: true })
  }

  if (!response.ok) {
    const error = await toError(response)
    if (options.admin && (error.status === 401 || error.status === 403)) adminSession.clear()
    throw error
  }
  if (response.status === 204) return undefined as T
  const isJson = response.headers.get('content-type')?.includes('application/json')
  return (isJson ? await response.json() : await response.text()) as T
}
