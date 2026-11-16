import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

const RECENT_KEY = 'almacen.recent-orders'
const numberField = () => screen.getByRole('textbox', { name: 'Número de pedido' })
const searchButton = () => screen.getByRole('button', { name: 'Ver pedido' })

describe('TrackOrderPage: buscar por número', () => {
  it('un pedido existente lleva a su detalle', async () => {
    const { user, router } = renderRoute('/seguimiento')

    await user.type(numberField(), '5')
    await user.click(searchButton())

    await waitFor(() => expect(router.state.location.pathname).toBe('/pedidos/5'))
    expect(await screen.findByText('Valentina')).toBeInTheDocument()
  })

  it('un pedido inexistente termina en el aviso amable', async () => {
    const { user } = renderRoute('/seguimiento')

    await user.type(numberField(), '999')
    await user.click(searchButton())

    expect(await screen.findByRole('heading', { name: 'No encontramos ese pedido' })).toBeInTheDocument()
  })

  it('acepta el número tal como se muestra: con # y espacios', async () => {
    const { user, router } = renderRoute('/seguimiento')

    await user.type(numberField(), ' #5 ')
    await user.click(searchButton())

    await waitFor(() => expect(router.state.location.pathname).toBe('/pedidos/5'))
  })

  it.each(['', 'abc', '0', '-3', '1.5'])('rechaza "%s" sin navegar', async (text) => {
    const { user, router } = renderRoute('/seguimiento')

    if (text) await user.type(numberField(), text)
    await user.click(searchButton())

    expect(await screen.findByText('Escribí un número de pedido válido, por ejemplo 12.')).toBeInTheDocument()
    expect(numberField()).toBeInvalid()
    expect(router.state.location.pathname).toBe('/seguimiento')
  })

  it('el error se va al corregir el número', async () => {
    const { user } = renderRoute('/seguimiento')
    await user.click(searchButton())
    expect(await screen.findByText('Escribí un número de pedido válido, por ejemplo 12.')).toBeInTheDocument()

    await user.type(numberField(), '5')

    expect(screen.queryByText('Escribí un número de pedido válido, por ejemplo 12.')).not.toBeInTheDocument()
  })
})

describe('TrackOrderPage: pedidos recientes', () => {
  const recents = () => screen.findByRole('region', { name: 'Pedidos hechos desde este navegador' })

  it('sin pedidos guardados no muestra la sección', async () => {
    renderRoute('/seguimiento')
    await screen.findByRole('heading', { name: 'Seguí tu pedido' })

    expect(screen.queryByRole('region', { name: 'Pedidos hechos desde este navegador' })).not.toBeInTheDocument()
  })

  it('lista cada pedido guardado con su estado y total', async () => {
    localStorage.setItem(RECENT_KEY, '[5,1]')
    renderRoute('/seguimiento')

    const section = within(await recents())
    const pending = section.getByRole('link', { name: /Pedido #5/ })
    expect(pending).toHaveAttribute('href', '/pedidos/5')
    expect(await within(pending).findByText('Pendiente')).toBeInTheDocument()
    expect(within(pending).getByText('$ 10.000,00')).toBeInTheDocument()
    const delivered = section.getByRole('link', { name: /Pedido #1/ })
    expect(await within(delivered).findByText('Entregado')).toBeInTheDocument()
    expect(within(delivered).getByText('$ 7.600,00')).toBeInTheDocument()
  })

  it('un pedido que ya no existe deja el acceso sin datos', async () => {
    localStorage.setItem(RECENT_KEY, '[999]')
    renderRoute('/seguimiento')

    const section = within(await recents())
    const row = section.getByRole('link', { name: /Pedido #999/ })
    expect(await within(row).findByText('Sin datos por ahora')).toBeInTheDocument()
  })

  it('el formulario sigue andando si la API no contesta', async () => {
    localStorage.setItem(RECENT_KEY, '[5]')
    server.use(http.get('*/api/orders/:id', () => HttpResponse.json({ detail: 'Flow 4 is not implemented yet' }, { status: 501 })))
    renderRoute('/seguimiento')

    const row = within(await recents()).getByRole('link', { name: /Pedido #5/ })
    expect(await within(row).findByText('Sin datos por ahora')).toBeInTheDocument()
    expect(numberField()).toBeEnabled()
  })

  it('un pedido hecho recién aparece con el estado que le puso el dueño', async () => {
    const order = mockStore.placeOrder('Ana', [{ code: 624, quantity: 1 }])
    mockStore.cancelOrder(order.id)
    localStorage.setItem(RECENT_KEY, JSON.stringify([order.id]))
    renderRoute('/seguimiento')

    const row = within(await recents()).getByRole('link', { name: /Pedido #7/ })
    expect(await within(row).findByText('Cancelado')).toBeInTheDocument()
  })
})
