import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { adminSession } from '@/api/session'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

const ROUTE = '/admin/reportes'

const openTab = (name: string) => screen.findByRole('tab', { name })
const activePanel = () => screen.findByRole('tabpanel')
const notImplemented = (path: string) =>
  http.get(`*/api${path}`, () => HttpResponse.json({ detail: 'Not implemented (Flow 5)' }, { status: 501 }))

describe('pestañas', () => {
  it('muestra las cinco secciones con Ventas abierta', async () => {
    renderRoute(ROUTE, { admin: true })
    const tablist = await screen.findByRole('tablist', { name: 'Secciones de los reportes' })

    expect(within(tablist).getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Ventas',
      'Más vendidos',
      'Stock bajo',
      'Categorías y estructuras',
      'Búsquedas',
    ])
    expect(await openTab('Ventas')).toHaveAttribute('aria-selected', 'true')
    expect(await activePanel()).toHaveAccessibleName('Ventas')
  })

  it('cambia de sección con un clic y lo deja en la URL', async () => {
    const { user, router } = renderRoute(ROUTE, { admin: true })

    await user.click(await openTab('Búsquedas'))

    expect(await openTab('Búsquedas')).toHaveAttribute('aria-selected', 'true')
    expect(await openTab('Ventas')).toHaveAttribute('aria-selected', 'false')
    expect(await activePanel()).toHaveAccessibleName('Búsquedas')
    expect(router.state.location.search).toBe('?seccion=busquedas')
  })

  it('entra directo a una sección desde la URL', async () => {
    renderRoute(`${ROUTE}?seccion=stock-bajo`, { admin: true })
    expect(await activePanel()).toHaveAccessibleName('Stock bajo')
  })

  it('una sección desconocida en la URL abre Ventas', async () => {
    renderRoute(`${ROUTE}?seccion=nada`, { admin: true })
    expect(await activePanel()).toHaveAccessibleName('Ventas')
  })

  it('se recorre con las flechas, Inicio y Fin, y solo la pestaña activa recibe el foco con Tab', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const first = await openTab('Ventas')
    first.focus()
    expect(first).toHaveAttribute('tabindex', '0')
    expect(await openTab('Más vendidos')).toHaveAttribute('tabindex', '-1')

    await user.keyboard('{ArrowRight}')
    expect(await openTab('Más vendidos')).toHaveFocus()
    expect(await openTab('Más vendidos')).toHaveAttribute('aria-selected', 'true')
    expect(await openTab('Más vendidos')).toHaveAttribute('tabindex', '0')

    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(await openTab('Búsquedas')).toHaveFocus()

    await user.keyboard('{Home}')
    expect(await openTab('Ventas')).toHaveFocus()

    await user.keyboard('{End}')
    expect(await openTab('Búsquedas')).toHaveFocus()
  })

  it('una sección que falla no impide usar las demás', async () => {
    server.use(notImplemented('/admin/reports/summary'))
    const { user } = renderRoute(ROUTE, { admin: true })
    expect(await within(await activePanel()).findByText('Esta parte todavía está en construcción')).toBeInTheDocument()

    await user.click(await openTab('Stock bajo'))

    expect(await screen.findByRole('row', { name: /^715 / })).toBeInTheDocument()
  })

  it('un 401 durante el uso lleva al ingreso', async () => {
    const { user, router } = renderRoute(ROUTE, { admin: true })
    await screen.findByText(/24\.960,00/)
    server.use(
      http.get('*/api/admin/reports/searches', () => HttpResponse.json({ detail: 'Missing X-Admin-Token header' }, { status: 401 })),
    )

    await user.click(await openTab('Búsquedas'))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/ingresar'))
    expect(adminSession.get()).toBeNull()
  })
})

describe('ventas', () => {
  const stat = async (label: string) => (await within(await activePanel()).findByText(label)).closest('div')?.parentElement

  it('muestra facturación, ticket promedio, valor del inventario y cantidad de productos', async () => {
    renderRoute(ROUTE, { admin: true })

    expect(await stat('Facturación')).toHaveTextContent(/24\.960,00/)
    expect(await stat('Ticket promedio')).toHaveTextContent(/8\.320,00/)
    expect(await stat('Valor del inventario')).toHaveTextContent(/1\.423\.900,00/)
    expect(await stat('Productos')).toHaveTextContent('38')
  })

  it('aclara qué cuenta cada número', async () => {
    renderRoute(ROUTE, { admin: true })

    expect(await stat('Facturación')).toHaveTextContent(/solo pedidos entregados/i)
    expect(await stat('Valor del inventario')).toHaveTextContent(/precio de lista por stock, inactivos incluidos/i)
    expect(await stat('Productos')).toHaveTextContent(/inactivos incluidos/i)
  })

  it('muestra los pedidos por estado', async () => {
    renderRoute(ROUTE, { admin: true })
    const byStatus = await screen.findByRole('list', { name: 'Pedidos por estado' })
    const rows = within(byStatus).getAllByRole('listitem')

    expect(rows[0]).toHaveTextContent('Pendiente')
    expect(rows[0]).toHaveTextContent('2')
    expect(rows[1]).toHaveTextContent('Entregado')
    expect(rows[1]).toHaveTextContent('3')
    expect(rows[2]).toHaveTextContent('Cancelado')
    expect(rows[2]).toHaveTextContent('1')
  })

  it('usa la moneda configurada', async () => {
    mockStore.settings.currency = 'USD'
    renderRoute(ROUTE, { admin: true })
    expect(await screen.findByText(/US\$\s*24\.960,00/)).toBeInTheDocument()
  })
})

describe('más vendidos', () => {
  const SECTION = `${ROUTE}?seccion=mas-vendidos`
  const ranking = async () => within(await screen.findByRole('list', { name: 'Ranking de más vendidos' })).getAllByRole('listitem')

  /** Entrega todos los pendientes, más un pedido nuevo: quedan 11 productos con ventas. */
  const sellElevenProducts = () => {
    mockStore.placeOrder('Ana', [
      { code: 394, quantity: 1 },
      { code: 660, quantity: 1 },
      { code: 602, quantity: 1 },
    ])
    mockStore.completeNext()
    mockStore.completeNext()
    mockStore.completeNext()
  }

  it('muestra el ranking con unidades y facturación', async () => {
    renderRoute(SECTION, { admin: true })
    const rows = await ranking()

    expect(rows[0]).toHaveTextContent('Matarazzo Spaghetti 500g')
    expect(rows[0]).toHaveTextContent('4 u.')
    expect(rows[0]).toHaveTextContent(/6\.400,00/)
    expect(rows[1]).toHaveTextContent('Coca-Cola 1.5L')
    expect(rows[1]).toHaveTextContent('3 u.')
    expect(rows[1]).toHaveTextContent(/7\.500,00/)
    expect(rows[2]).toHaveTextContent('Oreo 118g')
    expect(rows[2]).toHaveTextContent('3 u.')
    expect(rows[2]).toHaveTextContent(/4\.500,00/)
  })

  it('aclara que solo cuenta pedidos entregados', async () => {
    renderRoute(SECTION, { admin: true })
    expect(await within(await activePanel()).findByText(/solo pedidos entregados/i)).toBeInTheDocument()
  })

  it('dibuja las barras en proporción a las unidades', async () => {
    renderRoute(SECTION, { admin: true })
    const rows = await ranking()

    expect(rows[0]?.querySelector('[style]')).toHaveStyle({ width: '100%' })
    expect(rows[1]?.querySelector('[style]')).toHaveStyle({ width: '75%' })
  })

  it('cambia la cantidad con el selector, de 10 por defecto a 5 y a 20', async () => {
    sellElevenProducts()
    const { user } = renderRoute(SECTION, { admin: true })
    const select = await screen.findByRole('combobox', { name: 'Cantidad' })
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['5', '10', '20'])
    expect(select).toHaveValue('10')
    expect(await ranking()).toHaveLength(10)

    await user.selectOptions(select, '5')
    await waitFor(async () => expect(await ranking()).toHaveLength(5))

    await user.selectOptions(select, '20')
    await waitFor(async () => expect(await ranking()).toHaveLength(11))
  })

  it('avisa si todavía no hay ventas', async () => {
    mockStore.orders = []
    renderRoute(SECTION, { admin: true })
    expect(await screen.findByRole('heading', { name: 'Todavía no hay ventas' })).toBeInTheDocument()
  })
})

describe('stock bajo', () => {
  const SECTION = `${ROUTE}?seccion=stock-bajo`

  it('muestra los productos en el orden en que los devuelve la API', async () => {
    renderRoute(SECTION, { admin: true })
    await screen.findByRole('row', { name: /^715 / })

    const codes = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => Number(within(row).getAllByRole('cell')[0]?.textContent))
    expect(codes).toEqual([715, 801, 111, 205, 551, 614, 394, 660, 602])
  })

  it('muestra el stock contra el mínimo de cada producto', async () => {
    renderRoute(SECTION, { admin: true })
    const row = await screen.findByRole('row', { name: /^602 / })

    expect(within(row).getByRole('cell', { name: 'Lucchetti Parboiled Rice 1kg' })).toBeInTheDocument()
    expect(within(row).getAllByRole('cell', { name: '5' })).toHaveLength(2)
  })

  it('enlaza a productos para reponer', async () => {
    renderRoute(SECTION, { admin: true })
    const link = await within(await activePanel()).findByRole('link', { name: /productos/i })
    expect(link).toHaveAttribute('href', '/admin/productos')
  })

  it('avisa si no hay nada por reponer', async () => {
    mockStore.products.forEach((product) => {
      product.stock = 100
    })
    renderRoute(SECTION, { admin: true })
    expect(await screen.findByRole('heading', { name: 'No hay productos con stock bajo' })).toBeInTheDocument()
  })
})

describe('categorías y estructuras', () => {
  const SECTION = `${ROUTE}?seccion=categorias`
  const heights = () => screen.findByRole('list', { name: 'Estructuras del catálogo' })

  it('muestra la profundidad del árbol y las alturas de los BST', async () => {
    renderRoute(SECTION, { admin: true })
    const rows = within(await heights()).getAllByRole('listitem')

    expect(rows[0]).toHaveTextContent('Profundidad del árbol de categorías')
    expect(rows[0]).toHaveTextContent('3')
    expect(rows[1]).toHaveTextContent('BST por código')
    expect(rows[1]).toHaveTextContent('11')
    expect(rows[2]).toHaveTextContent('BST por nombre')
    expect(rows[2]).toHaveTextContent('11')
  })

  it('compara la altura con el mínimo teórico calculado con la cantidad de productos', async () => {
    renderRoute(SECTION, { admin: true })
    const rows = within(await heights()).getAllByRole('listitem')

    // 38 productos: ⌈log2(39)⌉ = 6
    expect(await within(rows[1]!).findByText(/⌈log2\(38 \+ 1\)⌉ = 6/)).toBeInTheDocument()
    expect(await within(rows[2]!).findByText(/⌈log2\(38 \+ 1\)⌉ = 6/)).toBeInTheDocument()
  })

  it('sin el resumen muestra las alturas igual, sin inventar el mínimo', async () => {
    server.use(notImplemented('/admin/reports/summary'))
    renderRoute(SECTION, { admin: true })
    const list = await heights()
    await waitFor(() => expect(within(list).getAllByText(/mínimo teórico no disponible/i)).toHaveLength(2))
    expect(within(list).queryByText(/⌈log2/)).not.toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')[1]).toHaveTextContent('11')
  })

  it('lista cada ruta en preorden con productos y valor de stock', async () => {
    renderRoute(SECTION, { admin: true })
    const grocery = await screen.findByRole('row', { name: /^Grocery 22/ })

    expect(within(grocery).getByRole('cell', { name: /754\.900,00/ })).toBeInTheDocument()

    const paths = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0]?.textContent)
    expect(paths).toHaveLength(25)
    expect(paths.slice(0, 4)).toEqual(['Grocery', 'Grocery/Drinks', 'Grocery/Drinks/Sodas', 'Grocery/Drinks/Water'])

    const sodas = screen.getByRole('row', { name: /^Grocery\/Drinks\/Sodas 5/ })
    expect(within(sodas).getByRole('cell', { name: /232\.100,00/ })).toBeInTheDocument()
  })

  it('aplica sangría según el nivel de cada ruta', async () => {
    renderRoute(SECTION, { admin: true })
    await screen.findByRole('row', { name: /^Grocery 22/ })

    const indent = (path: string) => (screen.getByRole('cell', { name: path }).firstElementChild as HTMLElement).style.paddingLeft
    expect(indent('Grocery')).toBe('0px')
    expect(indent('Grocery/Drinks')).toBe('16px')
    expect(indent('Grocery/Drinks/Sodas')).toBe('32px')
  })
})

describe('búsquedas', () => {
  const SECTION = `${ROUTE}?seccion=busquedas`

  it('muestra las recientes de la más nueva a la más vieja', async () => {
    renderRoute(SECTION, { admin: true })
    const recent = await screen.findByRole('list', { name: 'Búsquedas recientes' })

    expect(within(recent).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['cable', 'coca', 'detergent', 'oreo', 'coca'])
  })

  it('muestra los términos más buscados con su conteo', async () => {
    renderRoute(SECTION, { admin: true })
    const top = await screen.findByRole('list', { name: 'Términos más buscados' })
    const rows = within(top).getAllByRole('listitem')

    expect(rows).toHaveLength(4)
    expect(rows[0]).toHaveTextContent('coca')
    expect(rows[0]).toHaveTextContent('2')
    expect(rows[1]).toHaveTextContent('cable')
    expect(rows[1]).toHaveTextContent('1')
  })

  it('muestra un estado vacío si no hay búsquedas', async () => {
    mockStore.history = []
    renderRoute(SECTION, { admin: true })

    expect(await screen.findByRole('heading', { name: 'Todavía no hay búsquedas' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Búsquedas recientes' })).not.toBeInTheDocument()
  })
})
