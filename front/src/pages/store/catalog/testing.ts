import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'

/** Nombres de los productos que está viendo el cliente, en el orden en que aparecen. */
export function visibleProductNames(): string[] {
  return screen.queryAllByRole('article').map((card) => within(card).getByRole('heading').textContent ?? '')
}

/** Cuenta los pedidos a una ruta y los contesta con el 422 que daría la API real a un dato inválido. */
export function countCallsTo(path: string): () => number {
  let calls = 0
  server.use(
    http.get(`*/api${path}`, () => {
      calls += 1
      return HttpResponse.json({ detail: 'Input should be a valid integer' }, { status: 422 })
    }),
  )
  return () => calls
}
