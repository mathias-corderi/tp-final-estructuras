import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

type User = ReturnType<typeof renderRoute>['user']

const CATEGORIES_URL = '*/api/admin/categories'
const PRICE_URL = `${CATEGORIES_URL}/price-adjustment`

const node = (path: string) => screen.findByRole('group', { name: path })
const dialog = (name: string | RegExp) => screen.findByRole('dialog', { name })
const priceOf = (code: number) => mockStore.products.find((product) => product.code === code)?.price
const categoryOf = (code: number) => mockStore.products.find((product) => product.code === code)?.category

async function openPage() {
  const view = renderRoute('/admin/categorias', { admin: true })
  await node('Grocery')
  return view
}

/** Cuenta los pedidos y deja seguir al backend simulado. */
function countCalls(method: 'post' | 'patch' | 'delete', url: string) {
  const calls: unknown[] = []
  server.use(
    http[method](url, async ({ request }) => {
      calls.push(method === 'delete' ? new URL(request.url).search : await request.clone().json())
    }),
  )
  return calls
}

describe('árbol de categorías', () => {
  it('muestra el árbol completo con el nombre real y la traducción', async () => {
    await openPage()
    const drinks = await node('Grocery/Drinks')
    expect(drinks).toHaveTextContent('Drinks')
    expect(drinks).toHaveTextContent('Bebidas')
    expect(await node('Grocery/Drinks/Sodas')).toHaveTextContent('Gaseosas')
    expect(await node('Stationery/Notebooks')).toHaveTextContent('Cuadernos')
  })

  it('no repite el nombre cuando la traducción es igual', async () => {
    await openPage()
    const snacks = await node('Grocery/Snacks')
    expect(within(snacks).getAllByText('Snacks')).toHaveLength(1)
  })

  it('el rótulo aclara que cuenta solo productos activos', async () => {
    await openPage()
    expect(await node('Grocery')).toHaveTextContent('21 productos activos')
    expect(await node('Cleaning')).toHaveTextContent('6 productos activos')
    expect(await node('Grocery/Snacks/Chips')).toHaveTextContent('2 productos activos') // Doritos está inactivo
  })

  it('usa el singular y también muestra el cero', async () => {
    mockStore.createCategory('Toys')
    mockStore.addProduct({ code: 991, name: 'Pelota', brand: 'Genérica', price: 500, stock: 1, category: 'Toys' })
    mockStore.createCategory('Empty')
    await openPage()
    expect(await node('Toys')).toHaveTextContent('1 producto activo')
    expect(await node('Empty')).toHaveTextContent('0 productos activos')
  })

  it('se expande y se contrae', async () => {
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Contraer Grocery/Drinks' }))
    expect(screen.queryByRole('group', { name: 'Grocery/Drinks/Sodas' })).not.toBeInTheDocument()
    expect(await node('Grocery/Snacks')).toBeInTheDocument()

    const expand = await screen.findByRole('button', { name: 'Expandir Grocery/Drinks' })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    await user.click(expand)
    expect(await node('Grocery/Drinks/Sodas')).toBeInTheDocument()
  })

  it('una hoja no tiene botón de expandir', async () => {
    await openPage()
    expect(screen.queryByRole('button', { name: 'Expandir Grocery/Drinks/Sodas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Contraer Grocery/Drinks/Sodas' })).not.toBeInTheDocument()
  })

  it('aclara que los cambios de categorías no se deshacen', async () => {
    await openPage()
    expect(await screen.findByText(/Los cambios de categorías no se pueden deshacer/)).toBeInTheDocument()
  })

  it('con el flujo sin implementar (501) muestra la pantalla en construcción', async () => {
    server.use(http.get('*/api/categories', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 3: GET /categories' }, { status: 501 })))
    renderRoute('/admin/categorias', { admin: true })
    expect(await screen.findByText('Esta parte todavía está en construcción')).toBeInTheDocument()
    expect(screen.getByText(/Flujo 3/)).toBeInTheDocument()
  })
})

describe('crear categoría', () => {
  async function createFromRoot(user: User, path: string) {
    await user.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    const modal = within(await dialog('Nueva categoría'))
    if (path) await user.type(modal.getByLabelText('Ruta'), path)
    await user.click(modal.getByRole('button', { name: 'Crear categoría' }))
    return modal
  }

  it('crea una subcategoría colgando de su padre', async () => {
    const calls = countCalls('post', CATEGORIES_URL)
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Agregar subcategoría a Electronics/Accessories' }))
    const modal = within(await dialog('Nueva subcategoría en Electronics/Accessories'))
    await user.type(modal.getByLabelText('Nombre'), 'Fundas')
    await user.click(modal.getByRole('button', { name: 'Crear categoría' }))

    expect(await screen.findByText('Creaste Electronics/Accessories/Fundas')).toBeInTheDocument()
    expect(calls).toEqual([{ path: 'Electronics/Accessories/Fundas' }])
    expect(await node('Electronics/Accessories/Fundas')).toHaveTextContent('0 productos activos')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('en la raíz acepta una ruta y crea los padres que falten', async () => {
    const { user } = await openPage()
    await createFromRoot(user, 'Mascotas/Perros/Alimento')

    await screen.findByText('Creaste Mascotas/Perros/Alimento')
    expect(mockStore.paths()).toEqual(expect.arrayContaining(['Mascotas', 'Mascotas/Perros', 'Mascotas/Perros/Alimento']))
    expect(await node('Mascotas/Perros/Alimento')).toBeInTheDocument()
  })

  it('abre la rama para que se vea lo que se acaba de crear', async () => {
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Contraer Grocery' }))
    await createFromRoot(user, 'Grocery/Drinks/Energy')
    expect(await node('Grocery/Drinks/Energy')).toBeInTheDocument()
  })

  it('si ya existe (409) lo marca en el campo', async () => {
    const { user } = await openPage()
    const modal = await createFromRoot(user, 'Grocery/Drinks')
    await waitFor(() => expect(modal.getByLabelText('Ruta')).toHaveAccessibleDescription('Ya existe esa categoría'))
  })

  it.each([
    ['', 'Escribí un nombre'],
    ['   ', 'Escribí un nombre'],
    ['A//B', 'Cada parte de la ruta tiene que tener un nombre'],
    ['/A', 'Cada parte de la ruta tiene que tener un nombre'],
    ['A/', 'Cada parte de la ruta tiene que tener un nombre'],
    ['A/ /B', 'Cada parte de la ruta tiene que tener un nombre'],
  ])('rechaza la ruta "%s" sin llamar a la API', async (path, message) => {
    const calls = countCalls('post', CATEGORIES_URL)
    const { user } = await openPage()
    const modal = await createFromRoot(user, path)
    expect(modal.getByLabelText('Ruta')).toHaveAccessibleDescription(message)
    expect(calls).toEqual([])
  })

  it('un error del servidor sin campo se ve en el modal', async () => {
    server.use(http.post(CATEGORIES_URL, () => HttpResponse.json({ detail: 'Invalid category path' }, { status: 422 })))
    const { user } = await openPage()
    const modal = await createFromRoot(user, 'Valida')
    expect(await modal.findByRole('alert')).toHaveTextContent('Revisá los datos: Invalid category path')
  })
})

describe('renombrar categoría', () => {
  async function openRename(user: User, path: string, name: string) {
    await user.click(await screen.findByRole('button', { name: `Renombrar ${path}` }))
    return within(await dialog(`Renombrar ${name}`))
  }

  async function rename(user: User, modal: ReturnType<typeof within>, next: string) {
    await user.clear(modal.getByLabelText('Nuevo nombre'))
    if (next) await user.type(modal.getByLabelText('Nuevo nombre'), next)
    await user.click(modal.getByRole('button', { name: 'Renombrar' }))
  }

  it('edita solo el último segmento y avisa que actualiza la rama', async () => {
    const { user } = await openPage()
    const modal = await openRename(user, 'Grocery/Snacks', 'Snacks')
    expect(modal.getByLabelText('Nuevo nombre')).toHaveValue('Snacks')
    expect(modal.getByText(/Actualiza la categoría de todos los productos de la rama/)).toBeInTheDocument()
  })

  it('renombra y actualiza los productos de toda la rama', async () => {
    const calls = countCalls('patch', CATEGORIES_URL)
    const { user } = await openPage()
    const modal = await openRename(user, 'Grocery/Snacks', 'Snacks')
    await rename(user, modal, 'Treats')

    expect(await screen.findByText('Renombraste Grocery/Snacks a Grocery/Treats')).toBeInTheDocument()
    expect(calls).toEqual([{ path: 'Grocery/Snacks', new_name: 'Treats' }])
    expect(categoryOf(736)).toBe('Grocery/Treats/Cookies')
    expect(categoryOf(962)).toBe('Grocery/Treats/Chips') // inactivo
    expect(await node('Grocery/Treats/Cookies')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Grocery/Snacks' })).not.toBeInTheDocument()
  })

  it('si un hermano se llama igual (409) lo marca en el campo y no cambia nada', async () => {
    const { user } = await openPage()
    const modal = await openRename(user, 'Grocery/Snacks', 'Snacks')
    await rename(user, modal, 'Drinks')

    await waitFor(() => expect(modal.getByLabelText('Nuevo nombre')).toHaveAccessibleDescription('Ya hay una categoría llamada Drinks en este nivel'))
    expect(categoryOf(736)).toBe('Grocery/Snacks/Cookies')
  })

  it('si el nombre no cambió cierra sin llamar a la API', async () => {
    const calls = countCalls('patch', CATEGORIES_URL)
    const { user } = await openPage()
    const modal = await openRename(user, 'Grocery/Snacks', 'Snacks')
    await user.click(modal.getByRole('button', { name: 'Renombrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls).toEqual([])
  })

  it.each([
    ['', 'Escribí un nombre'],
    ['A/B', 'El nombre no puede tener /. Para mover una rama, creá la ruta nueva.'],
  ])('rechaza el nombre "%s"', async (next, message) => {
    const calls = countCalls('patch', CATEGORIES_URL)
    const { user } = await openPage()
    const modal = await openRename(user, 'Grocery/Snacks', 'Snacks')
    await rename(user, modal, next)
    expect(modal.getByLabelText('Nuevo nombre')).toHaveAccessibleDescription(message)
    expect(calls).toEqual([])
  })
})

describe('eliminar categoría', () => {
  const addCategory = (path: string) => mockStore.createCategory(path)

  it('elimina una categoría vacía después de confirmar', async () => {
    addCategory('Toys')
    const calls = countCalls('delete', CATEGORIES_URL)
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Eliminar Toys' }))
    const modal = within(await dialog('Eliminar Toys'))
    await user.click(modal.getByRole('button', { name: 'Eliminar categoría' }))

    expect(await screen.findByText('Eliminaste Toys')).toBeInTheDocument()
    expect(calls).toEqual(['?path=Toys'])
    expect(mockStore.paths()).not.toContain('Toys')
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Toys' })).not.toBeInTheDocument())
  })

  it('no promete que se pueda deshacer', async () => {
    addCategory('Toys')
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Eliminar Toys' }))
    expect(await dialog('Eliminar Toys')).toHaveTextContent('No se puede deshacer')
  })

  it('cancelar no elimina', async () => {
    addCategory('Toys')
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Eliminar Toys' }))
    await user.click(within(await dialog('Eliminar Toys')).getByRole('button', { name: 'Cancelar' }))
    expect(mockStore.paths()).toContain('Toys')
  })

  it('con productos (409) explica por qué no se pudo', async () => {
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Eliminar Cleaning/Floors' }))
    const modal = within(await dialog('Eliminar Floors'))
    await user.click(modal.getByRole('button', { name: 'Eliminar categoría' }))

    const alert = await modal.findByRole('alert')
    expect(alert).toHaveTextContent('No se puede eliminar: todavía tiene productos o subcategorías.')
    expect(alert).toHaveTextContent('Los productos inactivos también cuentan.')
    expect(mockStore.paths()).toContain('Cleaning/Floors')
  })

  it('una categoría con 0 activos avisa que los inactivos también cuentan antes de pedirlo', async () => {
    addCategory('Toys')
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Eliminar Toys' }))
    expect(await dialog('Eliminar Toys')).toHaveTextContent('Si tiene productos inactivos no se va a poder eliminar.')
  })

  it('con subcategorías avisa antes y no llama a la API', async () => {
    const calls = countCalls('delete', CATEGORIES_URL)
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Eliminar Grocery/Drinks' }))
    const modal = await dialog('Eliminar Drinks')
    expect(modal).toHaveTextContent('Tiene 3 subcategorías')
    expect(within(modal).queryByRole('button', { name: 'Eliminar categoría' })).not.toBeInTheDocument()
    await user.click(within(modal).getByRole('button', { name: 'Entendido' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(calls).toEqual([])
  })
})

describe('ajuste de precios', () => {
  async function openAdjust(user: User, path: string, name: string) {
    await user.click(await screen.findByRole('button', { name: `Ajustar precios de ${path}` }))
    return within(await dialog(`Ajustar precios de ${name}`))
  }

  it('describe el cambio mientras se escribe y advierte que no se puede deshacer', async () => {
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Grocery/Drinks', 'Drinks')
    expect(modal.getByText(/No se puede deshacer/)).toBeInTheDocument()

    await user.type(modal.getByLabelText('Porcentaje'), '10')
    expect(modal.getByText('Sube 10 % todos los precios de Bebidas y sus subcategorías, inactivos incluidos.')).toBeInTheDocument()

    await user.clear(modal.getByLabelText('Porcentaje'))
    await user.type(modal.getByLabelText('Porcentaje'), '-2.5')
    expect(modal.getByText('Baja 2,5 % todos los precios de Bebidas y sus subcategorías, inactivos incluidos.')).toBeInTheDocument()
  })

  it('una categoría sin subcategorías no las menciona', async () => {
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Cleaning/Floors', 'Floors')
    await user.type(modal.getByLabelText('Porcentaje'), '10')
    expect(modal.getByText('Sube 10 % todos los precios de Pisos, inactivos incluidos.')).toBeInTheDocument()
  })

  it('sube los precios de la rama y cuenta los productos actualizados', async () => {
    const calls = countCalls('post', PRICE_URL)
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Grocery/Drinks', 'Drinks')
    await user.type(modal.getByLabelText('Porcentaje'), '10')
    await user.click(modal.getByRole('button', { name: 'Aplicar ajuste' }))

    expect(await screen.findByText('Se actualizaron 9 productos')).toBeInTheDocument()
    expect(calls).toEqual([{ path: 'Grocery/Drinks', percent: 10 }])
    expect(priceOf(221)).toBe(2750) // Sodas
    expect(priceOf(980)).toBe(1320) // Water
    expect(priceOf(736)).toBe(1500) // Cookies queda afuera
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('incluye a los inactivos', async () => {
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Grocery/Snacks/Chips', 'Chips')
    await user.type(modal.getByLabelText('Porcentaje'), '10')
    await user.click(modal.getByRole('button', { name: 'Aplicar ajuste' }))
    await screen.findByText('Se actualizaron 3 productos')
    expect(priceOf(962)).toBe(1980)
  })

  it('baja precios y usa el singular con un solo producto', async () => {
    mockStore.createCategory('Toys')
    mockStore.addProduct({ code: 991, name: 'Pelota', brand: 'Genérica', price: 1000, stock: 1, category: 'Toys' })
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Toys', 'Toys')
    await user.type(modal.getByLabelText('Porcentaje'), '-15')
    await user.click(modal.getByRole('button', { name: 'Aplicar ajuste' }))
    await screen.findByText('Se actualizó 1 producto')
    expect(priceOf(991)).toBe(850)
  })

  it('avisa si la rama no tenía productos', async () => {
    mockStore.createCategory('Toys')
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Toys', 'Toys')
    await user.type(modal.getByLabelText('Porcentaje'), '10')
    await user.click(modal.getByRole('button', { name: 'Aplicar ajuste' }))
    expect(await screen.findByText('Esa categoría no tenía productos para actualizar')).toBeInTheDocument()
  })

  it.each([
    ['', 'Ingresá un porcentaje entre -90 y 500, distinto de 0'],
    ['0', 'Ingresá un porcentaje entre -90 y 500, distinto de 0'],
    ['-91', 'Ingresá un porcentaje entre -90 y 500, distinto de 0'],
    ['501', 'Ingresá un porcentaje entre -90 y 500, distinto de 0'],
  ])('no envía el porcentaje "%s"', async (percent, message) => {
    const calls = countCalls('post', PRICE_URL)
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Cleaning', 'Cleaning')
    if (percent) await user.type(modal.getByLabelText('Porcentaje'), percent)
    await user.click(modal.getByRole('button', { name: 'Aplicar ajuste' }))
    expect(modal.getByLabelText('Porcentaje')).toHaveAccessibleDescription(message)
    expect(calls).toEqual([])
    expect(priceOf(700)).toBe(8900)
  })

  it.each(['-90', '500'])('acepta el límite %s', async (percent) => {
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Cleaning/Floors', 'Floors')
    await user.type(modal.getByLabelText('Porcentaje'), percent)
    await user.click(modal.getByRole('button', { name: 'Aplicar ajuste' }))
    await screen.findByText('Se actualizaron 2 productos')
  })

  it('si la API no lo implementa (501) lo dice en el modal', async () => {
    server.use(http.post(PRICE_URL, () => HttpResponse.json({ detail: 'Not implemented yet: Flow 3' }, { status: 501 })))
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Cleaning', 'Cleaning')
    await user.type(modal.getByLabelText('Porcentaje'), '10')
    await user.click(modal.getByRole('button', { name: 'Aplicar ajuste' }))
    expect(await modal.findByRole('alert')).toHaveTextContent('Esta función todavía no está disponible (Flujo 3).')
  })
})
