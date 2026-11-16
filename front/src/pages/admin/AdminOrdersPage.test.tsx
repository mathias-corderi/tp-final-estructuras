import { screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { adminSession } from '@/api/session'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

const ROUTE = '/admin/pedidos'

const orderRow = (id: number) => screen.findByRole('row', { name: new RegExp(`^#${id} `) })
const orderIds = () =>
  screen
    .getAllByRole('row')
    .map((row) => /^#(\d+)/.exec(row.textContent ?? '')?.[1])
    .filter(Boolean)
    .map(Number)
const stockOf = (code: number) => mockStore.products.find((product) => product.code === code)?.stock
const statusOf = (id: number) => mockStore.getOrder(id).status
const attendNext = () => screen.findByRole('button', { name: 'Atender siguiente' })

describe('lista de pedidos', () => {
  it('muestra número, cliente, fecha, unidades, total y estado', async () => {
    renderRoute(ROUTE, { admin: true })
    const row = await orderRow(5)

    expect(within(row).getByRole('cell', { name: 'Valentina' })).toBeInTheDocument()
    expect(within(row).getByRole('cell', { name: '09/10/2026, 17:20' })).toBeInTheDocument()
    expect(within(row).getByRole('cell', { name: '3' })).toBeInTheDocument()
    expect(within(row).getByRole('cell', { name: /10\.000,00/ })).toBeInTheDocument()
    expect(within(row).getByText('Pendiente')).toBeInTheDocument()
    expect(orderIds()).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('usa la moneda configurada', async () => {
    mockStore.settings.currency = 'USD'
    renderRoute(ROUTE, { admin: true })
    const row = await orderRow(5)
    expect(await within(row).findByRole('cell', { name: /US\$\s*10\.000,00/ })).toBeInTheDocument()
  })

  it('despliega los ítems de un pedido', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const toggle = within(await orderRow(5)).getByRole('button', { name: 'Detalle del pedido 5' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/USB-C Cable 1m/)).not.toBeInTheDocument()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const detail = screen.getByRole('list', { name: 'Ítems del pedido 5' })
    const items = within(detail).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('1 × USB-C Cable 1m')
    expect(items[0]).toHaveTextContent(/4\.200,00/)
    expect(items[1]).toHaveTextContent('2 × Colgate Total 90g')
    expect(items[1]).toHaveTextContent(/5\.800,00/)

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/USB-C Cable 1m/)).not.toBeInTheDocument()
  })
})

describe('filtro por estado', () => {
  it('filtra con la API y deja el estado en la URL', async () => {
    const { user, router } = renderRoute(ROUTE, { admin: true })
    await orderRow(1)

    await user.click(screen.getByRole('button', { name: 'Pendientes' }))

    expect(router.state.location.search).toBe('?estado=pending')
    await waitFor(() => expect(orderIds()).toEqual([5, 6]))
    expect(screen.getByRole('button', { name: 'Pendientes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('entra directo a un estado desde la URL', async () => {
    renderRoute(`${ROUTE}?estado=cancelled`, { admin: true })
    await orderRow(3)
    expect(orderIds()).toEqual([3])
    expect(screen.getByRole('button', { name: 'Cancelados' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('"Entregados" muestra los completados', async () => {
    renderRoute(`${ROUTE}?estado=completed`, { admin: true })
    await orderRow(1)
    expect(orderIds()).toEqual([1, 2, 4])
  })

  it('"Todos" saca el filtro de la URL', async () => {
    const { user, router } = renderRoute(`${ROUTE}?estado=cancelled`, { admin: true })
    await orderRow(3)
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    expect(router.state.location.search).toBe('')
    await orderRow(1)
  })

  it('ignora un estado desconocido en la URL en lugar de mostrar un error', async () => {
    renderRoute(`${ROUTE}?estado=shipped`, { admin: true })
    await orderRow(1)
    expect(orderIds()).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('avisa cuando ningún pedido tiene ese estado', async () => {
    mockStore.cancelOrder(5)
    mockStore.cancelOrder(6)
    renderRoute(`${ROUTE}?estado=pending`, { admin: true })
    expect(await screen.findByRole('heading', { name: 'No hay pedidos en este estado' })).toBeInTheDocument()
  })
})

describe('atender siguiente', () => {
  it('muestra qué pedido se va a atender y aclara que es el más viejo', async () => {
    renderRoute(ROUTE, { admin: true })
    const queue = await screen.findByRole('region', { name: 'Siguiente en la cola' })

    expect(await within(queue).findByText('Pedido #5 de Valentina')).toBeInTheDocument()
    expect(within(queue).getByText(/siempre el más viejo/i)).toBeInTheDocument()
    expect(within(queue).getByRole('button', { name: 'Atender siguiente' })).toBeEnabled()
  })

  it('el botón le dice a un lector de pantalla qué pedido atiende', async () => {
    renderRoute(ROUTE, { admin: true })
    expect(await attendNext()).toHaveAccessibleDescription('Pedido #5 de Valentina')
  })

  it('no deja elegir qué pedido atender', async () => {
    renderRoute(ROUTE, { admin: true })
    const row = await orderRow(6)
    expect(within(row).queryByRole('button', { name: /atender/i })).not.toBeInTheDocument()
  })

  it('atiende el 5, después el 6 y sin pendientes queda deshabilitado', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })

    await user.click(await attendNext())
    expect(await screen.findByText(/Atendiste el pedido #5 de Valentina/)).toBeInTheDocument()
    expect(statusOf(5)).toBe('completed')
    expect(statusOf(6)).toBe('pending')
    expect(await screen.findByText('Pedido #6 de Tomás')).toBeInTheDocument()

    await user.click(await attendNext())
    expect(await screen.findByText(/Atendiste el pedido #6 de Tomás/)).toBeInTheDocument()
    expect(statusOf(6)).toBe('completed')

    await waitFor(async () => expect(await attendNext()).toBeDisabled())
    expect(screen.getByText('No hay pedidos pendientes.')).toBeInTheDocument()
  })

  it('completar no vuelve a tocar el stock', async () => {
    const before = stockOf(934)
    const { user } = renderRoute(ROUTE, { admin: true })
    await user.click(await attendNext())
    await screen.findByText(/Atendiste el pedido #5/)
    expect(stockOf(934)).toBe(before)
  })

  it('actualiza la tabla y el estado después de atender', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    await user.click(await attendNext())
    await waitFor(async () => expect(within(await orderRow(5)).getByText('Entregado')).toBeInTheDocument())
  })

  it('sin pendientes queda deshabilitado desde el principio', async () => {
    mockStore.completeNext()
    mockStore.completeNext()
    renderRoute(ROUTE, { admin: true })
    expect(await attendNext()).toBeDisabled()
  })

  it('informa el pedido que atendió la API, aunque la pantalla estuviera atrasada', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const button = await attendNext()
    await screen.findByText('Pedido #5 de Valentina')

    mockStore.completeNext() // otra pestaña atendió el 5 mientras esta seguía mostrándolo
    await user.click(button)

    expect(await screen.findByText(/Atendiste el pedido #6 de Tomás/)).toBeInTheDocument()
  })

  it('un 409 avisa que no quedan pendientes y actualiza la pantalla', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const button = await attendNext()
    await screen.findByText('Pedido #5 de Valentina')

    mockStore.completeNext()
    mockStore.completeNext()
    await user.click(button)

    expect(await screen.findByText('No quedan pedidos pendientes para atender.')).toBeInTheDocument()
    await waitFor(async () => expect(await attendNext()).toBeDisabled())
  })
})

describe('cancelar', () => {
  const openCancel = async (user: ReturnType<typeof renderRoute>['user'], id: number) => {
    await user.click(within(await orderRow(id)).getByRole('button', { name: `Cancelar pedido ${id}` }))
    return screen.findByRole('dialog', { name: `Cancelar el pedido #${id}` })
  }

  it('solo se ofrece en los pedidos pendientes', async () => {
    renderRoute(ROUTE, { admin: true })
    const pending = await orderRow(5)
    expect(within(pending).getByRole('button', { name: 'Cancelar pedido 5' })).toBeInTheDocument()
    for (const id of [1, 3]) {
      const row = await orderRow(id)
      expect(within(row).queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument()
    }
  })

  it('pide confirmación aclarando que devuelve el stock', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const dialog = await openCancel(user, 6)

    expect(dialog).toHaveTextContent('Tomás')
    expect(dialog).toHaveTextContent(/devuelve el stock/i)
    expect(statusOf(6)).toBe('pending')
  })

  it('cerrar el diálogo no cancela nada', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const dialog = await openCancel(user, 6)

    await user.click(within(dialog).getByRole('button', { name: 'Volver' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(statusOf(6)).toBe('pending')
  })

  it('cancela y devuelve el stock', async () => {
    const before = stockOf(980) ?? 0
    const { user } = renderRoute(ROUTE, { admin: true })
    const dialog = await openCancel(user, 6)

    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar pedido' }))

    expect(await screen.findByText(/Cancelaste el pedido #6/)).toBeInTheDocument()
    expect(statusOf(6)).toBe('cancelled')
    expect(stockOf(980)).toBe(before + 6)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(async () => expect(within(await orderRow(6)).getByText('Cancelado')).toBeInTheDocument())
    expect(within(await orderRow(6)).queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument()
  })

  it('cierra el diálogo antes de avisar, para que el aviso no quede tapado', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const dialog = await openCancel(user, 6)
    server.use(http.get('*/api/admin/orders', () => delay(300).then(() => undefined)))
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar pedido' }))

    await screen.findByText(/Cancelaste el pedido #6/)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el pedido cancelado deja de ser el siguiente de la cola', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const dialog = await openCancel(user, 5)
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar pedido' }))
    expect(await screen.findByText('Pedido #6 de Tomás')).toBeInTheDocument()
  })

  it('un 409 avisa que ya no está pendiente y actualiza la tabla', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const dialog = await openCancel(user, 5)

    mockStore.completeNext() // lo atendieron mientras el diálogo estaba abierto
    await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar pedido' }))

    expect(await screen.findByText('Ese pedido ya no está pendiente.')).toBeInTheDocument()
    expect(statusOf(5)).toBe('completed')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(async () => expect(within(await orderRow(5)).getByText('Entregado')).toBeInTheDocument())
  })
})

describe('sesión', () => {
  it('un 401 al atender lleva al ingreso', async () => {
    const { user, router } = renderRoute(ROUTE, { admin: true })
    server.use(
      http.post('*/api/admin/orders/next/complete', () => HttpResponse.json({ detail: 'Missing X-Admin-Token header' }, { status: 401 })),
    )

    await user.click(await attendNext())

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/ingresar'))
    expect(adminSession.get()).toBeNull()
  })
})

describe('API incompleta', () => {
  it('si la cola no carga, la tabla sigue funcionando', async () => {
    server.use(
      http.get('*/api/admin/orders', ({ request }) => {
        if (new URL(request.url).searchParams.get('status') === 'pending') {
          return HttpResponse.json({ detail: 'Not implemented (Flow 4)' }, { status: 501 })
        }
        return undefined
      }),
    )
    renderRoute(ROUTE, { admin: true })

    expect(await screen.findByText('Esta parte todavía está en construcción')).toBeInTheDocument()
    await orderRow(1)
    expect(screen.queryByRole('button', { name: 'Atender siguiente' })).not.toBeInTheDocument()
  })
})
