import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

const NOT_IMPLEMENTED = { detail: 'Not implemented yet: Flow 1: GET /products' }
const namesIn = (section: HTMLElement) => within(section).getAllByRole('article').map((card) => within(card).getByRole('heading').textContent)

describe('portada', () => {
  it('da la bienvenida y lleva a los productos', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver productos' })).toHaveAttribute('href', '/productos')
  })

  it('muestra las categorías principales traducidas, con cantidad y link', async () => {
    renderRoute('/')
    const tiles = within(await screen.findByRole('list', { name: 'Categorías principales' }))
    expect(tiles.getAllByRole('link').map((link) => link.getAttribute('aria-label'))).toEqual([
      'Almacén, 21 productos',
      'Limpieza, 6 productos',
      'Cuidado personal, 4 productos',
      'Electrónica, 4 productos',
      'Librería, 2 productos',
    ])
    expect(tiles.getByRole('link', { name: /^Cuidado personal/ })).toHaveAttribute('href', '/categorias/Personal%20Care')
  })

  it('"Ofertas" lista los productos con descuento y lleva al catálogo filtrado', async () => {
    renderRoute('/')
    const offers = await screen.findByRole('region', { name: 'Ofertas' })
    expect(namesIn(offers)).toEqual([
      'Cepita Orange Juice 1L',
      'Pantene Conditioner 400ml',
      'Pepsi 1.5L',
      'Cocinero Olive Oil 500ml',
      'Terrabusi Variedad 400g',
    ])
    expect(within(offers).getByRole('link', { name: 'Ver todas las ofertas' })).toHaveAttribute('href', '/productos?ofertas=1')
  })

  it('un producto con descuento pero inactivo no entra en ofertas', async () => {
    const doritos = mockStore.products.find((product) => product.code === 962)
    if (!doritos) throw new Error('falta el producto en el seed')
    doritos.discount_percent = 30
    renderRoute('/')
    const offers = await screen.findByRole('region', { name: 'Ofertas' })
    expect(namesIn(offers)).not.toContain('Doritos 77g')
  })

  it('sin ofertas no muestra la sección', async () => {
    for (const product of mockStore.products) product.discount_percent = 0
    renderRoute('/')
    await screen.findByRole('region', { name: 'Elegidos para vos' })
    expect(screen.queryByRole('region', { name: 'Ofertas' })).not.toBeInTheDocument()
  })

  it('la selección trae un producto con stock de cada categoría principal, sin repetir ofertas', async () => {
    mockStore.products.forEach((product) => {
      if (product.code === 102) product.stock = 0
      if (product.code === 200) product.discount_percent = 10
    })
    renderRoute('/')
    const selection = await screen.findByRole('region', { name: 'Elegidos para vos' })
    expect(namesIn(selection)).toEqual([
      'Car Charger Dual USB',
      'Poett Lavender 900ml',
      'Eco de los Andes 1.5L',
      'Sedal Shampoo 340ml',
      'Gloria Notebook 84 Sheets',
    ])
  })

  it('agregar desde la portada actualiza el carrito', async () => {
    const { user } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Agregar Pepsi 1.5L al carrito' }))
    expect(await screen.findByRole('link', { name: /^Carrito, 1 unidad/ })).toBeInTheDocument()
  })

  it('si fallan los productos las categorías se siguen viendo', async () => {
    server.use(http.get('*/api/products', () => HttpResponse.json(NOT_IMPLEMENTED, { status: 501 })))
    renderRoute('/')
    expect(await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: 'Categorías principales' })).toBeInTheDocument()
  })

  it('si fallan las categorías los productos se siguen viendo', async () => {
    server.use(http.get('*/api/categories', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 3: GET /categories' }, { status: 501 })))
    renderRoute('/')
    expect(await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Ofertas' })).toBeInTheDocument()
  })
})
