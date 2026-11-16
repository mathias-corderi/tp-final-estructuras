import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { adminSession } from '@/api/session'
import { renderRoute } from '@/test/render'
import { server } from '@/test/server'

const SETTINGS = '*/api/admin/settings'

async function enterToken(user: ReturnType<typeof renderRoute>['user'], token: string) {
  await user.type(await screen.findByLabelText('Token de acceso'), token)
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('ingreso del dueño', () => {
  it('muestra el nombre de la tienda, un campo oculto y el camino de vuelta', async () => {
    renderRoute('/admin/ingresar')
    expect(await screen.findByText('Almacén Grupo TP')).toBeInTheDocument()
    expect(screen.getByLabelText('Token de acceso')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('link', { name: 'Volver a la tienda' })).toHaveAttribute('href', '/')
  })

  it('con el token correcto guarda la sesión y entra al panel', async () => {
    const { user, router } = renderRoute('/admin/ingresar')
    await enterToken(user, 'change-me')
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
    expect(adminSession.get()).toBe('change-me')
  })

  it('con el token incorrecto lo avisa en el campo y no guarda nada', async () => {
    const { user, router } = renderRoute('/admin/ingresar')
    await enterToken(user, 'otro-token')
    expect(await screen.findByText('Token incorrecto')).toBeInTheDocument()
    expect(screen.getByLabelText('Token de acceso')).toHaveAttribute('aria-invalid', 'true')
    expect(adminSession.get()).toBeNull()
    expect(router.state.location.pathname).toBe('/admin/ingresar')
  })

  it('trata el 401 igual que un token incorrecto', async () => {
    server.use(http.get(SETTINGS, () => HttpResponse.json({ detail: 'Missing X-Admin-Token header' }, { status: 401 })))
    const { user } = renderRoute('/admin/ingresar')
    await enterToken(user, 'cualquiera')
    expect(await screen.findByText('Token incorrecto')).toBeInTheDocument()
    expect(adminSession.get()).toBeNull()
  })

  it('un 501 deja entrar: FastAPI valida el token antes de armar el Container', async () => {
    server.use(http.get(SETTINGS, () => HttpResponse.json({ detail: 'Not implemented yet: Flow 5' }, { status: 501 })))
    const { user, router } = renderRoute('/admin/ingresar')
    await enterToken(user, 'change-me')
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
    expect(adminSession.get()).toBe('change-me')
  })

  it('un 501 sin detail no vino de FastAPI, así que no prueba nada y no deja entrar', async () => {
    server.use(http.get(SETTINGS, () => new HttpResponse('Not Implemented', { status: 501 })))
    const { user } = renderRoute('/admin/ingresar')
    await enterToken(user, 'change-me')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectarnos con la tienda')
    expect(adminSession.get()).toBeNull()
  })

  it('con la API caída lo explica y no guarda nada', async () => {
    server.use(http.get(SETTINGS, () => HttpResponse.error()))
    const { user, router } = renderRoute('/admin/ingresar')
    await enterToken(user, 'change-me')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectarnos con la tienda')
    expect(screen.queryByText('Token incorrecto')).not.toBeInTheDocument()
    expect(adminSession.get()).toBeNull()
    expect(router.state.location.pathname).toBe('/admin/ingresar')
  })

  it('un 500 del proxy (API apagada) cuenta como API caída', async () => {
    server.use(http.get(SETTINGS, () => new HttpResponse('Bad gateway', { status: 500 })))
    const { user } = renderRoute('/admin/ingresar')
    await enterToken(user, 'change-me')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectarnos con la tienda')
    expect(adminSession.get()).toBeNull()
  })

  it('vuelve a la pantalla que se había pedido', async () => {
    const { user, router } = renderRoute('/admin/categorias')
    await enterToken(user, 'change-me')
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/categorias'))
  })

  it('con sesión iniciada va directo al panel', async () => {
    const { router } = renderRoute('/admin/ingresar', { admin: true })
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })

  it('sin token no llama a la API', async () => {
    let calls = 0
    server.use(
      http.get(SETTINGS, () => {
        calls += 1
      }),
    )
    const { user } = renderRoute('/admin/ingresar')
    await user.click(await screen.findByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByText('Ingresá el token')).toBeInTheDocument()
    expect(calls).toBe(0)
  })

  it('un token con caracteres no ASCII es incorrecto y no se manda: en el header rompería como si la API estuviera caída', async () => {
    let calls = 0
    server.use(
      http.get(SETTINGS, () => {
        calls += 1
      }),
    )
    const { user } = renderRoute('/admin/ingresar')
    await enterToken(user, 'contraseña€')
    expect(await screen.findByText('Token incorrecto')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(calls).toBe(0)
  })
})
