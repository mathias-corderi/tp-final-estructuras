import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { adminSession } from '@/api/session'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

const notImplemented = (path: string) =>
  http.get(`*/api${path}`, () => HttpResponse.json({ detail: 'Not implemented (Flow 5)' }, { status: 501 }))

const block = (name: string) => screen.findByRole('region', { name })

describe('resumen del panel', () => {
  it('muestra facturación, pendientes, ticket promedio y valor del inventario', async () => {
    renderRoute('/admin', { admin: true })
    const stats = await block('Números del negocio')

    expect(await within(stats).findByText(/24\.960,00/)).toBeInTheDocument()
    expect(within(stats).getByText(/8\.320,00/)).toBeInTheDocument()
    expect(within(stats).getByText(/1\.423\.900,00/)).toBeInTheDocument()
    expect(within(stats).getByText('Pedidos pendientes').parentElement?.parentElement).toHaveTextContent('2')
  })

  it('muestra los montos en la moneda configurada por el dueño', async () => {
    mockStore.settings.currency = 'USD'
    renderRoute('/admin', { admin: true })
    expect(await screen.findByText(/US\$\s*24\.960,00/)).toBeInTheDocument()
  })

  it('si la configuración falla, usa la moneda por defecto', async () => {
    server.use(notImplemented('/admin/settings'))
    renderRoute('/admin', { admin: true })
    expect(await screen.findByText(/^\$\s*24\.960,00/)).toBeInTheDocument()
  })

  it('muestra el pedido pendiente más viejo con un enlace a pedidos', async () => {
    renderRoute('/admin', { admin: true })
    const next = await block('Próximo pedido a atender')

    expect(await within(next).findByText(/Pedido #5/)).toBeInTheDocument()
    expect(within(next).getByText(/Valentina/)).toBeInTheDocument()
    expect(within(next).getByRole('link', { name: /pedidos/i })).toHaveAttribute('href', '/admin/pedidos?estado=pending')
  })

  it('avisa cuando no hay pedidos para atender', async () => {
    mockStore.completeNext()
    mockStore.completeNext()
    renderRoute('/admin', { admin: true })
    const next = await block('Próximo pedido a atender')
    expect(await within(next).findByText('No hay pedidos pendientes.')).toBeInTheDocument()
    expect(within(next).queryByText(/Pedido #/)).not.toBeInTheDocument()
  })

  it('lista los primeros 5 productos con stock bajo y enlaza a productos', async () => {
    renderRoute('/admin', { admin: true })
    const lowStock = await block('Stock bajo')

    const items = await within(lowStock).findAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Baggio Multifruit 1L'),
      expect.stringContaining('Lightning Cable 1m'),
      expect.stringContaining('Car Charger Dual USB'),
      expect.stringContaining('Eco de los Andes 1.5L'),
      expect.stringContaining('Skip Powder 800g'),
    ])
    expect(within(lowStock).getByRole('link', { name: /productos/i })).toHaveAttribute('href', '/admin/productos')
  })

  it('lista los 5 más vendidos en orden', async () => {
    renderRoute('/admin', { admin: true })
    const top = await block('Más vendidos')

    const items = await within(top).findAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('Matarazzo Spaghetti 500g')
    expect(items[0]).toHaveTextContent('4 u.')
    expect(items[0]).toHaveTextContent(/6\.400,00/)
    expect(items[1]).toHaveTextContent('Coca-Cola 1.5L')
    expect(items[2]).toHaveTextContent('Oreo 118g')
    expect(within(top).getByRole('link', { name: 'Ver ranking' })).toHaveAttribute('href', '/admin/reportes?seccion=mas-vendidos')
  })

  it('si un endpoint no está implementado, el resto sigue funcionando', async () => {
    server.use(notImplemented('/admin/reports/low-stock'))
    renderRoute('/admin', { admin: true })

    const lowStock = await block('Stock bajo')
    expect(await within(lowStock).findByText('Esta parte todavía está en construcción')).toBeInTheDocument()
    expect(await screen.findByText(/24\.960,00/)).toBeInTheDocument()
    expect(await screen.findByText(/Pedido #5/)).toBeInTheDocument()
    expect(await screen.findByText('Matarazzo Spaghetti 500g')).toBeInTheDocument()
  })

  it('si el token dejó de valer, borra la sesión y lleva al ingreso', async () => {
    server.use(http.get('*/api/admin/reports/summary', () => HttpResponse.json({ detail: 'Missing X-Admin-Token header' }, { status: 401 })))
    const { router } = renderRoute('/admin', { admin: true })

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/ingresar'))
    expect(adminSession.get()).toBeNull()
  })
})
