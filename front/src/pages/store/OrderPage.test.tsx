import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

const timeline = () => screen.findByRole('list', { name: 'Estado del pedido' })
const step = (list: HTMLElement, name: string) => within(list).getByText(name).closest('li')

describe('OrderPage: datos del pedido', () => {
  it('muestra número, fecha, cliente, ítems y total', async () => {
    renderRoute('/pedidos/5')

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido #5' })).toBeInTheDocument()
    expect(await screen.findByText('Valentina')).toBeInTheDocument()
    expect(screen.getByText('09/10/2026, 17:20')).toBeInTheDocument()

    const colgate = screen.getByText('Colgate Total 90g').closest('li')!
    expect(within(colgate).getByText('2 × $ 2.900,00')).toBeInTheDocument()
    expect(within(colgate).getByText('$ 5.800,00')).toBeInTheDocument()
    const cable = screen.getByText('USB-C Cable 1m').closest('li')!
    expect(within(cable).getByText('1 × $ 4.200,00')).toBeInTheDocument()
    expect(screen.getByText('$ 10.000,00')).toBeInTheDocument()
  })

  it('los precios son los de la compra aunque el catálogo haya cambiado', async () => {
    mockStore.updateProduct(936, { price: 9999, name: 'Colgate Nuevo' })
    renderRoute('/pedidos/5')

    expect(await screen.findByText('2 × $ 2.900,00')).toBeInTheDocument()
    expect(screen.getByText('Colgate Total 90g')).toBeInTheDocument()
    expect(screen.getByText('$ 10.000,00')).toBeInTheDocument()
  })
})

describe('OrderPage: estado', () => {
  it('pendiente: está en Recibido, falta Entregado y explica la cola', async () => {
    renderRoute('/pedidos/5')

    const list = await timeline()
    expect(step(list, 'Recibido')).toHaveAttribute('aria-current', 'step')
    expect(step(list, 'Entregado')).not.toHaveAttribute('aria-current')
    expect(screen.getByText(/por orden de llegada/)).toBeInTheDocument()
  })

  it('entregado: llegó a Entregado y ya no habla de la cola', async () => {
    renderRoute('/pedidos/1')

    const list = await timeline()
    expect(step(list, 'Entregado')).toHaveAttribute('aria-current', 'step')
    expect(step(list, 'Recibido')).not.toHaveAttribute('aria-current')
    expect(screen.queryByText(/por orden de llegada/)).not.toBeInTheDocument()
  })

  it('cancelado: termina en Cancelado y no promete la entrega', async () => {
    renderRoute('/pedidos/3')

    const list = await timeline()
    expect(step(list, 'Cancelado')).toHaveAttribute('aria-current', 'step')
    expect(within(list).queryByText('Entregado')).not.toBeInTheDocument()
    expect(screen.queryByText(/por orden de llegada/)).not.toBeInTheDocument()
  })

  it.each([
    [5, 'Pendiente'],
    [1, 'Entregado'],
    [3, 'Cancelado'],
  ])('el pedido %i muestra el badge %s', async (id, label) => {
    renderRoute(`/pedidos/${id}`)

    const heading = await screen.findByRole('heading', { name: 'Estado' })
    expect(within(heading.parentElement!).getByText(label)).toBeInTheDocument()
  })

  it('el botón trae el estado nuevo', async () => {
    const { user } = renderRoute('/pedidos/5')
    const list = await timeline()
    mockStore.completeNext()

    await user.click(screen.getByRole('button', { name: 'Actualizar estado' }))

    expect(await screen.findByText('Tu pedido ya fue entregado.')).toBeInTheDocument()
    expect(step(list, 'Entregado')).toHaveAttribute('aria-current', 'step')
  })
})

describe('OrderPage: pedido recién hecho', () => {
  it('con ?nuevo=1 agradece y recuerda guardar el número', async () => {
    renderRoute('/pedidos/5?nuevo=1')

    expect(await screen.findByRole('heading', { name: '¡Gracias! Recibimos tu pedido' })).toBeInTheDocument()
    expect(screen.getByText(/Guardá el número #5/)).toBeInTheDocument()
  })

  it('sin el parámetro no agradece', async () => {
    renderRoute('/pedidos/5')
    await timeline()

    expect(screen.queryByRole('heading', { name: '¡Gracias! Recibimos tu pedido' })).not.toBeInTheDocument()
  })
})

describe('OrderPage: pedidos que no se pueden mostrar', () => {
  it('404: estado amable con salida a seguimiento', async () => {
    renderRoute('/pedidos/999')

    expect(await screen.findByRole('heading', { name: 'No encontramos ese pedido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buscar otro pedido' })).toHaveAttribute('href', '/seguimiento')
  })

  it.each(['abc', '0', '-1', '1.5', '1e3', '99999999999999999999'])('un id inválido (%s) no llega a la API', async (id) => {
    let requests = 0
    server.use(
      http.get('*/api/orders/:id', () => {
        requests += 1
        return HttpResponse.json({ detail: 'Order not found' }, { status: 404 })
      }),
    )
    renderRoute(`/pedidos/${id}`)

    expect(await screen.findByRole('heading', { name: 'Ese número de pedido no es válido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Buscar otro pedido' })).toHaveAttribute('href', '/seguimiento')
    expect(requests).toBe(0)
  })

  it('con 501 muestra el aviso común', async () => {
    server.use(http.get('*/api/orders/:id', () => HttpResponse.json({ detail: 'Flow 4 is not implemented yet' }, { status: 501 })))
    renderRoute('/pedidos/5')

    expect(await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })).toBeInTheDocument()
  })
})
