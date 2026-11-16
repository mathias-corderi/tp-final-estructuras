import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'
import { visibleProductNames } from './catalog/testing'

const tree = () => within(screen.getByRole('navigation', { name: 'Categorías' }))
const treeLink = (name: string) => tree().getByRole('link', { name })
const includeSubcategories = () => screen.getByRole('checkbox', { name: 'Incluir subcategorías' })

describe('categorías', () => {
  it('/categorias muestra las categorías principales con sus productos activos', async () => {
    renderRoute('/categorias')
    expect(await screen.findByRole('heading', { level: 1, name: 'Categorías' })).toBeInTheDocument()
    const tiles = within(screen.getByRole('list', { name: 'Categorías principales' }))
    expect(tiles.getByRole('link', { name: 'Almacén, 21 productos' })).toHaveAttribute('href', '/categorias/Grocery')
    expect(tiles.getByRole('link', { name: 'Limpieza, 6 productos' })).toHaveAttribute('href', '/categorias/Cleaning')
    expect(tiles.getByRole('link', { name: 'Cuidado personal, 4 productos' })).toHaveAttribute('href', '/categorias/Personal%20Care')
    expect(tiles.getByRole('link', { name: 'Electrónica, 4 productos' })).toHaveAttribute('href', '/categorias/Electronics')
    expect(tiles.getByRole('link', { name: 'Librería, 2 productos' })).toHaveAttribute('href', '/categorias/Stationery')
  })

  it('el árbol muestra el contador de productos activos de cada nodo', async () => {
    renderRoute('/categorias')
    await screen.findByRole('navigation', { name: 'Categorías' })
    // 22 productos en Almacén, uno inactivo.
    expect(treeLink('Almacén, 21 productos')).toBeInTheDocument()
  })

  it('una rama muestra todos sus productos en preorden', async () => {
    renderRoute('/categorias/Grocery/Drinks')
    await screen.findByRole('article', { name: 'Coca-Cola 1.5L' })
    expect(screen.getByRole('heading', { level: 1, name: 'Bebidas' })).toBeInTheDocument()
    expect(screen.getByText('9 productos')).toBeInTheDocument()
    expect(visibleProductNames()).toEqual([
      'Coca-Cola 1.5L',
      'Coca-Cola Zero 1.5L',
      'Sprite 1.5L',
      'Pepsi 1.5L',
      '7Up 1.5L',
      'Villavicencio 2L',
      'Eco de los Andes 1.5L',
      'Cepita Orange Juice 1L',
      'Baggio Multifruit 1L',
    ])
  })

  it('un producto inactivo no aparece en su rama', async () => {
    renderRoute('/categorias/Grocery/Snacks/Chips')
    await screen.findByRole('article', { name: "Lay's Classic 150g" })
    expect(visibleProductNames()).toEqual(["Lay's Classic 150g", 'Pringles Original 124g'])
  })

  it('una categoría con espacios se decodifica bien', async () => {
    renderRoute('/categorias/Personal%20Care')
    expect(await screen.findByRole('heading', { level: 1, name: 'Cuidado personal' })).toBeInTheDocument()
    await screen.findByRole('article', { name: 'Sedal Shampoo 340ml' })
    expect(visibleProductNames()).toEqual(['Sedal Shampoo 340ml', 'Pantene Conditioner 400ml', 'Colgate Total 90g', 'Oral-B Toothbrush'])
  })

  it('una subcategoría de una categoría con espacios también', async () => {
    renderRoute('/categorias/Personal%20Care/Oral')
    await screen.findByRole('article', { name: 'Colgate Total 90g' })
    expect(visibleProductNames()).toEqual(['Colgate Total 90g', 'Oral-B Toothbrush'])
  })

  it('una barra final en la URL es la misma categoría', async () => {
    renderRoute('/categorias/Cleaning/Floors/')
    await screen.findByRole('article', { name: 'Ayudín Bleach 1L' })
    expect(screen.getByRole('heading', { level: 1, name: 'Pisos' })).toBeInTheDocument()
  })

  it('la ruta legible permite subir de nivel', async () => {
    renderRoute('/categorias/Personal%20Care/Hair')
    const trail = within(await screen.findByRole('navigation', { name: 'Ruta de categorías' }))
    expect(trail.getByRole('link', { name: 'Categorías' })).toHaveAttribute('href', '/categorias')
    expect(trail.getByRole('link', { name: 'Cuidado personal' })).toHaveAttribute('href', '/categorias/Personal%20Care')
    expect(trail.queryByRole('link', { name: 'Cabello' })).not.toBeInTheDocument()
    expect(trail.getByText('Cabello')).toHaveAttribute('aria-current', 'page')
  })

  it('"Incluir subcategorías" arranca activado y al sacarlo deja solo los del nodo', async () => {
    const juice = mockStore.products.find((product) => product.code === 328)
    if (!juice) throw new Error('falta el producto en el seed')
    juice.category = 'Grocery/Drinks'

    const { user } = renderRoute('/categorias/Grocery/Drinks')
    await screen.findByRole('article', { name: 'Coca-Cola 1.5L' })
    expect(includeSubcategories()).toBeChecked()

    await user.click(includeSubcategories())
    await waitFor(() => expect(visibleProductNames()).toEqual(['Cepita Orange Juice 1L']))
    expect(screen.getByText('1 producto')).toBeInTheDocument()
  })

  it('una categoría sin productos propios lo explica y ofrece incluir subcategorías', async () => {
    const { user } = renderRoute('/categorias/Grocery/Drinks')
    await screen.findByRole('article', { name: 'Coca-Cola 1.5L' })
    await user.click(includeSubcategories())
    expect(await screen.findByRole('heading', { name: 'No hay productos directamente en Bebidas' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ver los de las subcategorías' }))
    expect(await screen.findByRole('article', { name: 'Coca-Cola 1.5L' })).toBeInTheDocument()
    expect(includeSubcategories()).toBeChecked()
  })

  it('una categoría vacía avisa que no hay productos', async () => {
    mockStore.createCategory('Toys')
    renderRoute('/categorias/Toys')
    expect(await screen.findByRole('heading', { name: 'Todavía no hay productos en Toys' })).toBeInTheDocument()
  })

  it('una ruta inexistente muestra un 404 amable', async () => {
    renderRoute('/categorias/Grocery/Nope')
    expect(await screen.findByRole('heading', { name: 'No encontramos esta categoría' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Ver todas las categorías' })).toHaveAttribute('href', '/categorias')
  })

  it('si la categoría desapareció después de cargar el árbol también es un 404 amable', async () => {
    server.use(http.get('*/api/categories/products', () => HttpResponse.json({ detail: 'Category Cleaning not found' }, { status: 404 })))
    renderRoute('/categorias/Cleaning')
    expect(await screen.findByRole('heading', { name: 'No encontramos esta categoría' })).toBeInTheDocument()
  })

  it('una hoja no ofrece incluir subcategorías porque no tiene', async () => {
    renderRoute('/categorias/Cleaning/Laundry')
    await screen.findByRole('article', { name: 'Skip Powder 800g' })
    expect(screen.queryByRole('checkbox', { name: 'Incluir subcategorías' })).not.toBeInTheDocument()
  })

  it('las rutas distinguen mayúsculas, como la API', async () => {
    renderRoute('/categorias/grocery')
    expect(await screen.findByRole('heading', { name: 'No encontramos esta categoría' })).toBeInTheDocument()
  })

  describe('árbol', () => {
    it('muestra expandida la rama elegida y marca dónde se está', async () => {
      renderRoute('/categorias/Grocery/Drinks/Sodas')
      await screen.findByRole('navigation', { name: 'Categorías' })
      expect(treeLink('Gaseosas, 5 productos')).toHaveAttribute('aria-current', 'page')
      expect(treeLink('Aguas, 2 productos')).toBeInTheDocument()
      expect(tree().queryByRole('link', { name: /^Galletitas/ })).not.toBeInTheDocument()
    })

    it('se expande y se contrae con su botón, sin navegar', async () => {
      const { user, router } = renderRoute('/categorias/Cleaning')
      await screen.findByRole('navigation', { name: 'Categorías' })
      expect(tree().queryByRole('link', { name: /^Bebidas/ })).not.toBeInTheDocument()

      await user.click(tree().getByRole('button', { name: 'Expandir Almacén' }))
      expect(treeLink('Bebidas, 9 productos')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/categorias/Cleaning')

      await user.click(tree().getByRole('button', { name: 'Contraer Almacén' }))
      expect(tree().queryByRole('link', { name: /^Bebidas/ })).not.toBeInTheDocument()
    })

    it('elegir una categoría la abre y muestra sus productos', async () => {
      const { user, router } = renderRoute('/categorias')
      await screen.findByRole('navigation', { name: 'Categorías' })
      await user.click(treeLink('Cuidado personal, 4 productos'))
      await screen.findByRole('article', { name: 'Sedal Shampoo 340ml' })
      expect(router.state.location.pathname).toBe('/categorias/Personal%20Care')
      expect(treeLink('Cabello, 2 productos')).toBeInTheDocument()
    })

    it('las hojas no tienen botón para expandir', async () => {
      renderRoute('/categorias/Stationery')
      await screen.findByRole('navigation', { name: 'Categorías' })
      expect(treeLink('Cuadernos, 2 productos')).toBeInTheDocument()
      expect(tree().queryByRole('button', { name: /Cuadernos/ })).not.toBeInTheDocument()
    })
  })

  it('si el flujo no está implementado avisa que está en construcción', async () => {
    server.use(http.get('*/api/categories', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 3: GET /categories' }, { status: 501 })))
    renderRoute('/categorias')
    expect(await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })).toBeInTheDocument()
    expect(screen.getByText(/Flujo 3/)).toBeInTheDocument()
  })
})
