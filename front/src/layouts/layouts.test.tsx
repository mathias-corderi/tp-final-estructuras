import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { adminSession } from '@/api/session'
import { renderRoute } from '@/test/render'
import { mockStore } from '@/test/server'

describe('encabezado de la tienda', () => {
  it('muestra las unidades del carrito', async () => {
    localStorage.setItem('almacen.cart', JSON.stringify([{ code: 221, quantity: 3 }]))
    renderRoute('/')
    expect(await screen.findByRole('link', { name: 'Carrito, 3 unidades' })).toBeInTheDocument()
  })

  it('usa el singular con una sola unidad', async () => {
    localStorage.setItem('almacen.cart', JSON.stringify([{ code: 221, quantity: 1 }]))
    renderRoute('/')
    expect(await screen.findByRole('link', { name: 'Carrito, 1 unidad' })).toBeInTheDocument()
  })

  it('busca recién al confirmar, nunca mientras se escribe', async () => {
    const { user, router } = renderRoute('/')
    await user.type(await screen.findByRole('searchbox', { name: /buscar/i }), 'cola')
    expect(router.state.location.pathname).toBe('/')
    await user.keyboard('{Enter}')
    expect(router.state.location.pathname).toBe('/buscar')
    expect(router.state.location.search).toBe('?name=cola')
  })

  it('ignora una búsqueda en blanco', async () => {
    const { user, router } = renderRoute('/')
    await user.type(await screen.findByRole('searchbox', { name: /buscar/i }), '   {Enter}')
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('acceso al panel del dueño', () => {
  it('sin sesión lleva al ingreso', async () => {
    const { router } = renderRoute('/admin/pedidos')
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/ingresar'))
    expect(router.state.location.state).toEqual({ from: '/admin/pedidos' })
  })

  it('con sesión muestra el panel', async () => {
    renderRoute('/admin', { admin: true })
    expect(await screen.findByRole('navigation', { name: 'Administración' })).toBeInTheDocument()
  })

  it('muestra el nombre de la tienda guardado en la configuración', async () => {
    mockStore.settings.store_name = 'Kiosco Don Pepe'
    renderRoute('/admin', { admin: true })
    expect(await screen.findByRole('link', { name: /Kiosco Don Pepe/ })).toBeInTheDocument()
  })

  it('cerrar sesión borra el token y vuelve a la tienda', async () => {
    const { user, router } = renderRoute('/admin', { admin: true })
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    expect(adminSession.get()).toBeNull()
    expect(router.state.location.pathname).toBe('/')
  })
})

describe('rutas', () => {
  it('una dirección desconocida muestra una página amable', async () => {
    renderRoute('/no-existe')
    expect(await screen.findByRole('heading', { name: 'No encontramos esta página' })).toBeInTheDocument()
  })
})
