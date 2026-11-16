import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { server } from '@/test/server'
import { visibleProductNames } from './catalog/testing'

const title = (name: string) => screen.findByRole('heading', { level: 1, name })

describe('detalle de producto', () => {
  it('muestra los datos del producto con su descuento', async () => {
    renderRoute('/productos/624')
    await title('Pepsi 1.5L')
    expect(screen.getByText('PepsiCo')).toBeInTheDocument()
    expect(screen.getByText('-10%')).toBeInTheDocument()
    expect(screen.getByText(/1\.980,00/)).toBeInTheDocument()
    expect(screen.getByText(/2\.200,00/)).toBeInTheDocument()
    expect(screen.getByText('Código 624')).toBeInTheDocument()
    expect(document.title).toContain('Pepsi 1.5L')
  })

  it('la ruta de categoría tiene un link por nivel', async () => {
    renderRoute('/productos/624')
    const trail = within(await screen.findByRole('navigation', { name: 'Ruta de categorías' }))
    expect(trail.getByRole('link', { name: 'Almacén' })).toHaveAttribute('href', '/categorias/Grocery')
    expect(trail.getByRole('link', { name: 'Bebidas' })).toHaveAttribute('href', '/categorias/Grocery/Drinks')
    expect(trail.getByRole('link', { name: 'Gaseosas' })).toHaveAttribute('href', '/categorias/Grocery/Drinks/Sodas')
  })

  it('codifica las categorías con espacios en los links', async () => {
    renderRoute('/productos/213')
    const trail = within(await screen.findByRole('navigation', { name: 'Ruta de categorías' }))
    expect(trail.getByRole('link', { name: 'Cuidado personal' })).toHaveAttribute('href', '/categorias/Personal%20Care')
  })

  it.each([
    ['con stock de sobra', 221, 'En stock'],
    ['con stock igual al mínimo', 602, 'Últimas unidades'],
    ['con stock bajo el mínimo', 614, 'Últimas unidades'],
    ['sin stock', 715, 'Agotado'],
  ])('disponibilidad %s', async (_, code, label) => {
    renderRoute(`/productos/${code}`)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('agrega la cantidad elegida al carrito y avisa', async () => {
    const { user } = renderRoute('/productos/624')
    await title('Pepsi 1.5L')
    await user.click(screen.getByRole('button', { name: 'Sumar uno' }))
    await user.click(screen.getByRole('button', { name: 'Sumar uno' }))
    await user.click(screen.getByRole('button', { name: 'Agregar al carrito' }))
    expect(await screen.findByRole('link', { name: 'Carrito, 3 unidades' })).toBeInTheDocument()
    expect(screen.getByText('Agregamos 3 unidades de Pepsi 1.5L al carrito')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Cantidad de Pepsi 1.5L' })).toHaveValue(1)
  })

  it('la cantidad no puede pasar el stock', async () => {
    const { user } = renderRoute('/productos/614')
    await title('Sprite 1.5L')
    const more = screen.getByRole('button', { name: 'Sumar uno' })
    await user.click(more)
    await user.click(more)
    expect(screen.getByRole('spinbutton', { name: 'Cantidad de Sprite 1.5L' })).toHaveValue(3)
    expect(more).toBeDisabled()
  })

  it('descuenta del límite lo que ya está en el carrito', async () => {
    localStorage.setItem('almacen.cart', JSON.stringify([{ code: 614, quantity: 2 }]))
    renderRoute('/productos/614')
    await title('Sprite 1.5L')
    expect(screen.getByRole('button', { name: 'Sumar uno' })).toBeDisabled()
  })

  it('si ya tiene todo el stock en el carrito no ofrece agregar más', async () => {
    localStorage.setItem('almacen.cart', JSON.stringify([{ code: 614, quantity: 3 }]))
    renderRoute('/productos/614')
    await title('Sprite 1.5L')
    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeDisabled()
    expect(screen.getByText('Ya tenés en el carrito todas las unidades disponibles.')).toBeInTheDocument()
  })

  it('agotado: no se puede agregar', async () => {
    renderRoute('/productos/715')
    await title('Baggio Multifruit 1L')
    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeDisabled()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('sugiere los otros productos de la categoría, sin repetir el actual', async () => {
    renderRoute('/productos/624')
    expect(await screen.findByRole('heading', { name: 'También te puede interesar' })).toBeInTheDocument()
    await screen.findByRole('article', { name: 'Sprite 1.5L' })
    expect(visibleProductNames()).toEqual(['Coca-Cola 1.5L', 'Coca-Cola Zero 1.5L', 'Sprite 1.5L', '7Up 1.5L'])
  })

  it('sin otros productos en la categoría no muestra la sección', async () => {
    server.use(http.get('*/api/categories/products', () => HttpResponse.json([])))
    renderRoute('/productos/624')
    await title('Pepsi 1.5L')
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Cargando…' })).not.toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'También te puede interesar' })).not.toBeInTheDocument()
  })

  it('si falla lo relacionado el producto se sigue viendo', async () => {
    server.use(http.get('*/api/categories/products', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 3: x' }, { status: 501 })))
    renderRoute('/productos/624')
    await title('Pepsi 1.5L')
    expect(await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeEnabled()
  })

  it.each([
    ['que no existe', '/productos/99999'],
    ['inactivo', '/productos/962'],
  ])('producto %s: estado amable con salida al catálogo', async (_, path) => {
    renderRoute(path)
    expect(await screen.findByRole('heading', { name: 'No encontramos este producto' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el catálogo' })).toHaveAttribute('href', '/productos')
  })

  it.each(['abc', '12.5', '-3', '1e3', '99999999999999999999'])('código "%s" en la URL: ni siquiera llama a la API', async (code) => {
    // La API real contesta 422 a un código no numérico: si se llamara, se vería un error y no el estado amable.
    server.use(http.get('*/api/products/:code', () => HttpResponse.json({ detail: 'Input should be a valid integer' }, { status: 422 })))
    renderRoute(`/productos/${code}`)
    expect(await screen.findByRole('heading', { name: 'No encontramos este producto' })).toBeInTheDocument()
  })

  it('si el flujo no está implementado avisa que está en construcción', async () => {
    server.use(http.get('*/api/products/:code', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 1: GET /products/{code}' }, { status: 501 })))
    renderRoute('/productos/624')
    expect(await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })).toBeInTheDocument()
  })
})
