import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '@/test/server'
import { ApiError, request } from './client'
import { adminSession } from './session'

const reply = (response: () => Response, method: 'get' | 'post' = 'get') =>
  server.use(http[method]('*/api/thing', response))

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => {
      throw new Error('se esperaba un error')
    },
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

describe('respuestas correctas', () => {
  it('devuelve el JSON', async () => {
    reply(() => HttpResponse.json({ ok: true }))
    await expect(request('/thing')).resolves.toEqual({ ok: true })
  })

  it('devuelve undefined en un 204', async () => {
    reply(() => new HttpResponse(null, { status: 204 }), 'post')
    await expect(request('/thing', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('devuelve texto cuando la API responde text/plain', async () => {
    reply(() => new HttpResponse('hola\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
    await expect(request('/thing')).resolves.toBe('hola\n')
  })

  it('manda el body como JSON', async () => {
    let received: unknown
    server.use(
      http.post('*/api/thing', async ({ request: incoming }) => {
        received = await incoming.json()
        return HttpResponse.json({})
      }),
    )
    await request('/thing', { method: 'POST', body: { a: 1 } })
    expect(received).toEqual({ a: 1 })
  })
})

describe('errores', () => {
  it('usa el detail de texto de los errores de negocio', async () => {
    reply(() => HttpResponse.json({ detail: 'Product 1 not found' }, { status: 404 }))
    const error = await failure(request('/thing'))
    expect(error.status).toBe(404)
    expect(error.message).toBe('Product 1 not found')
  })

  it('entiende la lista de errores del schema de FastAPI', async () => {
    reply(() =>
      HttpResponse.json(
        {
          detail: [
            { type: 'greater_than', loc: ['body', 'price'], msg: 'Input should be greater than 0' },
            { type: 'missing', loc: ['body', 'name'], msg: 'Field required' },
          ],
        },
        { status: 422 },
      ),
    )
    const error = await failure(request('/thing'))
    expect(error.status).toBe(422)
    expect(error.fields).toEqual({ price: 'Input should be greater than 0', name: 'Field required' })
    expect(error.message).toBe('Input should be greater than 0. Field required')
  })

  it('marca como pendiente lo que la API todavía no implementa', async () => {
    reply(() => HttpResponse.json({ detail: 'Not implemented yet: Flow 4: Queue.__init__' }, { status: 501 }))
    const error = await failure(request('/thing'))
    expect(error.isNotImplemented).toBe(true)
    expect(error.pendingFlow).toBe('Flujo 4')
  })

  it('marca como no disponible un corte de red', async () => {
    reply(() => HttpResponse.error())
    const error = await failure(request('/thing'))
    expect(error.status).toBe(0)
    expect(error.isUnavailable).toBe(true)
  })

  it('marca como no disponible la respuesta del proxy cuando la API está apagada', async () => {
    reply(() => new HttpResponse('', { status: 500 }))
    expect((await failure(request('/thing'))).isUnavailable).toBe(true)
  })

  it('no confunde un error interno con detail con una API apagada', async () => {
    reply(() => HttpResponse.json({ detail: 'Boom' }, { status: 500 }))
    const error = await failure(request('/thing'))
    expect(error.isUnavailable).toBe(false)
    expect(error.message).toBe('Boom')
  })
})

describe('sesión del dueño', () => {
  function captureToken(): { value?: string | null } {
    const seen: { value?: string | null } = {}
    server.use(
      http.get('*/api/thing', ({ request: incoming }) => {
        seen.value = incoming.headers.get('X-Admin-Token')
        return HttpResponse.json({})
      }),
    )
    return seen
  }

  it('manda el token solo en las llamadas de admin', async () => {
    adminSession.set('secreto')
    const seen = captureToken()
    await request('/thing', { admin: true })
    expect(seen.value).toBe('secreto')
    await request('/thing')
    expect(seen.value).toBeNull()
  })

  it.each([401, 403])('cierra la sesión si la API responde %i', async (status) => {
    adminSession.set('vencido')
    const listener = vi.fn()
    const unsubscribe = adminSession.subscribe(listener)
    reply(() => HttpResponse.json({ detail: 'nope' }, { status }))
    await failure(request('/thing', { admin: true }))
    expect(adminSession.get()).toBeNull()
    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })

  it('un 401 en una llamada pública no toca la sesión', async () => {
    adminSession.set('vigente')
    reply(() => HttpResponse.json({ detail: 'nope' }, { status: 401 }))
    await failure(request('/thing'))
    expect(adminSession.get()).toBe('vigente')
  })
})
