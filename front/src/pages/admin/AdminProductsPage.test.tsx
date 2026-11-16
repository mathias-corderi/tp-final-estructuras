import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

type User = ReturnType<typeof renderRoute>['user']

const PRODUCTS_URL = '*/api/admin/products'

const row = (name: string | RegExp) => screen.findByRole('row', { name })
const dataRows = () => screen.getAllByRole('row').slice(1)
const table = () => screen.findByRole('table', { name: 'Productos del catálogo' })

async function openPage() {
  const view = renderRoute('/admin/productos', { admin: true })
  await table()
  return view
}

describe('listado de productos', () => {
  it('muestra todos los productos, también el inactivo 962', async () => {
    await openPage()
    expect(dataRows()).toHaveLength(38)
    const doritos = await row(/Doritos 77g/)
    expect(doritos).toHaveTextContent('962')
    expect(doritos).toHaveTextContent('Inactivo')
    expect(screen.getByText('38 productos')).toBeInTheDocument()
  })

  it('muestra código, marca, categoría real, precios y stock de cada producto', async () => {
    await openPage()
    const pepsi = within(await row(/Pepsi 1\.5L/))
    expect(pepsi.getByText('624')).toBeInTheDocument()
    expect(pepsi.getByText('PepsiCo')).toBeInTheDocument()
    expect(pepsi.getByText('Grocery/Drinks/Sodas')).toBeInTheDocument()
    expect(pepsi.getByText('$ 2.200,00')).toBeInTheDocument()
    expect(pepsi.getByText('10 %')).toBeInTheDocument()
    expect(pepsi.getByText('$ 1.980,00')).toBeInTheDocument()
    expect(pepsi.getByText('25')).toBeInTheDocument()
    expect(pepsi.getByText('Activo')).toBeInTheDocument()
  })

  it('marca stock bajo cuando el stock llega al mínimo, inclusive', async () => {
    await openPage()
    expect(await row(/Sprite 1\.5L/)).toHaveTextContent('Stock bajo')
    expect(await row(/Lucchetti Parboiled Rice 1kg/)).toHaveTextContent('Stock bajo') // stock 5, mínimo 5
    expect(await row(/Colgate Total 90g/)).not.toHaveTextContent('Stock bajo')
  })

  it('un producto sin stock se ve agotado y no además con stock bajo', async () => {
    await openPage()
    const baggio = await row(/Baggio Multifruit 1L/)
    expect(baggio).toHaveTextContent('Agotado')
    expect(baggio).not.toHaveTextContent('Stock bajo')
  })

  it('la columna de acciones tiene nombre aunque no se vea', async () => {
    await openPage()
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument()
  })

  it('pide el orden a la API', async () => {
    const sorts: (string | null)[] = []
    server.use(
      http.get(PRODUCTS_URL, ({ request }) => {
        sorts.push(new URL(request.url).searchParams.get('sort'))
      }),
    )
    const { user } = await openPage()
    expect(dataRows()[0]).toHaveTextContent('Mr. Músculo Kitchen 500ml') // código 102, el más bajo
    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'Nombre')
    await waitFor(() => expect(dataRows()[0]).toHaveTextContent('7Up 1.5L'))
    expect(sorts).toEqual(['code', 'name'])
  })

  it('filtra localmente por nombre, marca o código sin distinguir acentos', async () => {
    const { user } = await openPage()
    const filter = screen.getByLabelText('Filtrar')

    await user.type(filter, 'pepsi')
    expect(dataRows()).toHaveLength(4) // Pepsi 1.5L y la marca PepsiCo: 7Up, Lay's y Doritos
    expect(screen.getByText('4 de 38 productos')).toBeInTheDocument()

    await user.clear(filter)
    await user.type(filter, 'musculo')
    expect(dataRows()).toHaveLength(1)
    expect(dataRows()[0]).toHaveTextContent('Mr. Músculo Kitchen 500ml')

    await user.clear(filter)
    await user.type(filter, '962')
    expect(dataRows()).toHaveLength(1)
    expect(dataRows()[0]).toHaveTextContent('Doritos 77g')
  })

  it('filtra por estado', async () => {
    const { user } = await openPage()
    const status = screen.getByLabelText('Estado')

    await user.selectOptions(status, 'Inactivos')
    expect(dataRows()).toHaveLength(1)
    expect(dataRows()[0]).toHaveTextContent('Doritos 77g')

    await user.selectOptions(status, 'Activos')
    expect(dataRows()).toHaveLength(37)

    // Igual que el reporte de stock bajo: solo activos, así que Doritos no entra.
    await user.selectOptions(status, 'Stock bajo')
    expect(dataRows()).toHaveLength(9)
    expect(screen.queryByRole('row', { name: /Doritos/ })).not.toBeInTheDocument()
  })

  it('avisa cuando el filtro no encuentra nada y permite limpiarlo', async () => {
    const { user } = await openPage()
    await user.type(screen.getByLabelText('Filtrar'), 'no-existe')
    expect(await screen.findByText('Ningún producto coincide con el filtro')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(dataRows()).toHaveLength(38)
  })

  it('con el flujo sin implementar (501) muestra la pantalla en construcción', async () => {
    server.use(http.get(PRODUCTS_URL, () => HttpResponse.json({ detail: 'Not implemented yet: Flow 2: GET /admin/products' }, { status: 501 })))
    renderRoute('/admin/productos', { admin: true })
    expect(await screen.findByText('Esta parte todavía está en construcción')).toBeInTheDocument()
    expect(screen.getByText(/Flujo 2/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuevo producto' })).not.toBeInTheDocument()
  })
})

/** Guarda el body y deja seguir al backend simulado. */
function captureBodies(method: 'post' | 'patch', url: string) {
  const bodies: Record<string, unknown>[] = []
  server.use(
    http[method](url, async ({ request }) => {
      bodies.push((await request.clone().json()) as Record<string, unknown>)
    }),
  )
  return bodies
}

const dialog = (name: string | RegExp) => screen.findByRole('dialog', { name })

async function openCreate(user: User) {
  await user.click(screen.getByRole('button', { name: 'Nuevo producto' }))
  const form = within(await dialog('Nuevo producto'))
  await form.findByRole('option', { name: 'Grocery/Snacks/Cookies' })
  return form
}

async function fillRequired(user: User, form: ReturnType<typeof within>, code = '999') {
  await user.type(form.getByLabelText('Código'), code)
  await user.type(form.getByLabelText('Nombre'), 'Mantecol 110g')
  await user.type(form.getByLabelText('Marca'), 'Mondelez')
  await user.type(form.getByLabelText('Precio'), '1250.50')
  await user.selectOptions(form.getByLabelText('Categoría'), 'Grocery/Snacks/Cookies')
}

async function openEdit(user: User, name: string) {
  await user.click(await screen.findByRole('button', { name: `Editar ${name}` }))
  const form = within(await dialog(`Editar ${name}`))
  await form.findByRole('option', { name: 'Grocery/Snacks/Cookies' })
  return form
}

const inStore = (code: number) => mockStore.products.find((product) => product.code === code)

describe('alta de producto', () => {
  it('crea el producto, cierra el panel y lo muestra en la tabla', async () => {
    const { user } = await openPage()
    const form = await openCreate(user)
    await fillRequired(user, form)
    await user.clear(form.getByLabelText('Stock inicial'))
    await user.type(form.getByLabelText('Stock inicial'), '12')
    await user.clear(form.getByLabelText('Descuento (%)'))
    await user.type(form.getByLabelText('Descuento (%)'), '15')
    await user.click(form.getByRole('button', { name: 'Crear producto' }))

    expect(await screen.findByText('Agregaste Mantecol 110g')).toBeInTheDocument()
    expect(inStore(999)).toEqual({
      code: 999,
      name: 'Mantecol 110g',
      brand: 'Mondelez',
      price: 1250.5,
      stock: 12,
      category: 'Grocery/Snacks/Cookies',
      min_stock: 5,
      discount_percent: 15,
      active: true,
    })
    await waitFor(async () => expect(await row(/Mantecol 110g/)).toHaveTextContent('999'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ofrece las categorías con su ruta real y sangría por profundidad', async () => {
    const { user } = await openPage()
    const form = await openCreate(user)
    expect(form.getByRole('option', { name: 'Grocery' }).textContent).toBe('Grocery')
    expect(form.getByRole('option', { name: 'Grocery/Drinks' }).textContent).toBe('   Grocery/Drinks')
    expect(form.getByRole('option', { name: 'Grocery/Drinks/Sodas' }).textContent).toBe('      Grocery/Drinks/Sodas')
  })

  it('con el stock mínimo vacío usa el default de la tienda y no manda el campo', async () => {
    mockStore.settings.default_min_stock = 7
    const bodies = captureBodies('post', PRODUCTS_URL)
    const { user } = await openPage()
    const form = await openCreate(user)
    expect(await form.findByText('Si lo dejás vacío se usa el de la tienda (7).')).toBeInTheDocument()
    await fillRequired(user, form)
    await user.click(form.getByRole('button', { name: 'Crear producto' }))

    await screen.findByText('Agregaste Mantecol 110g')
    expect(bodies[0]).not.toHaveProperty('min_stock')
    expect(inStore(999)?.min_stock).toBe(7)
  })

  it('respeta el stock mínimo cuando se completa, aunque sea 0', async () => {
    const { user } = await openPage()
    const form = await openCreate(user)
    await fillRequired(user, form)
    await user.type(form.getByLabelText('Stock mínimo'), '0')
    await user.click(form.getByRole('button', { name: 'Crear producto' }))
    await screen.findByText('Agregaste Mantecol 110g')
    expect(inStore(999)?.min_stock).toBe(0)
  })

  it('si no carga la configuración igual explica el stock mínimo vacío', async () => {
    server.use(http.get('*/api/admin/settings', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 5' }, { status: 501 })))
    const { user } = await openPage()
    const form = await openCreate(user)
    expect(await form.findByText('Si lo dejás vacío se usa el de la tienda.')).toBeInTheDocument()
  })

  it('valida en el navegador y no llama a la API', async () => {
    const bodies = captureBodies('post', PRODUCTS_URL)
    const { user } = await openPage()
    const form = await openCreate(user)
    await user.clear(form.getByLabelText('Stock inicial'))
    await user.clear(form.getByLabelText('Descuento (%)'))
    await user.click(form.getByRole('button', { name: 'Crear producto' }))

    expect(form.getByLabelText('Código')).toHaveAccessibleDescription('Ingresá un código entero mayor a 0')
    expect(form.getByLabelText('Nombre')).toHaveAccessibleDescription('Ingresá el nombre')
    expect(form.getByLabelText('Marca')).toHaveAccessibleDescription('Ingresá la marca')
    expect(form.getByLabelText('Precio')).toHaveAccessibleDescription('Ingresá un precio mayor a 0')
    expect(form.getByLabelText('Stock inicial')).toHaveAccessibleDescription('Ingresá un entero, 0 o más')
    expect(form.getByLabelText('Categoría')).toHaveAccessibleDescription('Elegí una categoría')
    expect(form.getByLabelText('Descuento (%)')).toHaveAccessibleDescription('Ingresá un porcentaje de 0 a 90')
    expect(bodies).toEqual([])
  })

  it.each([
    ['Código', '0', 'Ingresá un código entero mayor a 0'],
    ['Código', '1.5', 'Ingresá un código entero mayor a 0'],
    ['Precio', '0', 'Ingresá un precio mayor a 0'],
    ['Stock inicial', '-1', 'Ingresá un entero, 0 o más'],
    ['Stock mínimo', '-1', 'Ingresá un entero, 0 o más'],
    ['Descuento (%)', '95', 'Ingresá un porcentaje de 0 a 90'],
  ])('rechaza %s = %s', async (label, value, message) => {
    const { user } = await openPage()
    const form = await openCreate(user)
    await fillRequired(user, form)
    await user.clear(form.getByLabelText(label))
    await user.type(form.getByLabelText(label), value)
    await user.click(form.getByRole('button', { name: 'Crear producto' }))
    expect(form.getByLabelText(label)).toHaveAccessibleDescription(message)
    expect(inStore(999)).toBeUndefined()
  })

  it('el código duplicado (409) se marca en el campo código', async () => {
    const { user } = await openPage()
    const form = await openCreate(user)
    await fillRequired(user, form, '221')
    await user.click(form.getByRole('button', { name: 'Crear producto' }))

    await waitFor(() => expect(form.getByLabelText('Código')).toHaveAccessibleDescription('Ya existe un producto con el código 221'))
    expect(inStore(221)?.name).toBe('Coca-Cola 1.5L')
    expect(mockStore.products).toHaveLength(38)
  })

  it('la categoría borrada mientras se completaba el alta (404) se marca en el campo categoría', async () => {
    mockStore.createCategory('Toys')
    const { user } = await openPage()
    const form = await openCreate(user)
    await fillRequired(user, form)
    await user.selectOptions(form.getByLabelText('Categoría'), 'Toys')
    mockStore.deleteCategory('Toys')
    await user.click(form.getByRole('button', { name: 'Crear producto' }))

    await waitFor(() => expect(form.getByLabelText('Categoría')).toHaveAccessibleDescription('Esa categoría ya no existe. Elegí otra.'))
    expect(inStore(999)).toBeUndefined()
  })

  it('muestra en cada campo los errores del schema (ApiError.fields)', async () => {
    server.use(
      http.post(PRODUCTS_URL, () =>
        HttpResponse.json({ detail: [{ type: 'greater_than', loc: ['body', 'price'], msg: 'Input should be greater than 0' }] }, { status: 422 }),
      ),
    )
    const { user } = await openPage()
    const form = await openCreate(user)
    await fillRequired(user, form)
    await user.click(form.getByRole('button', { name: 'Crear producto' }))
    await waitFor(() => expect(form.getByLabelText('Precio')).toHaveAccessibleDescription('Input should be greater than 0'))
  })

  it('un 422 sin campo se muestra dentro del panel', async () => {
    server.use(http.post(PRODUCTS_URL, () => HttpResponse.json({ detail: 'name cannot be blank' }, { status: 422 })))
    const { user } = await openPage()
    const form = await openCreate(user)
    await fillRequired(user, form)
    await user.click(form.getByRole('button', { name: 'Crear producto' }))
    expect(await form.findByRole('alert')).toHaveTextContent('Revisá los datos: name cannot be blank')
  })
})

describe('edición de producto', () => {
  it('arranca con los valores actuales y no ofrece cambiar código ni stock', async () => {
    const { user } = await openPage()
    const form = await openEdit(user, 'Pepsi 1.5L')
    expect(form.getByLabelText('Nombre')).toHaveValue('Pepsi 1.5L')
    expect(form.getByLabelText('Marca')).toHaveValue('PepsiCo')
    expect(form.getByLabelText('Precio')).toHaveValue(2200)
    expect(form.getByLabelText('Categoría')).toHaveValue('Grocery/Drinks/Sodas')
    expect(form.getByLabelText('Stock mínimo')).toHaveValue(5)
    expect(form.getByLabelText('Descuento (%)')).toHaveValue(10)
    expect(form.getByRole('checkbox', { name: /Activo/ })).toBeChecked()
    expect(form.queryByLabelText('Código')).not.toBeInTheDocument()
    expect(form.queryByLabelText('Stock inicial')).not.toBeInTheDocument()
  })

  it('manda solo los campos que cambiaron', async () => {
    const bodies = captureBodies('patch', `${PRODUCTS_URL}/:code`)
    const { user } = await openPage()
    const form = await openEdit(user, 'Pepsi 1.5L')
    await user.clear(form.getByLabelText('Precio'))
    await user.type(form.getByLabelText('Precio'), '2400')
    await user.click(form.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Guardaste los cambios de Pepsi 1.5L')).toBeInTheDocument()
    expect(bodies).toEqual([{ price: 2400 }])
    expect(inStore(624)?.price).toBe(2400)
    await waitFor(async () => expect(await row(/Pepsi 1\.5L/)).toHaveTextContent('$ 2.160,00')) // 2400 con 10 % de descuento
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('puede cambiar categoría, descuento, mínimo y desactivar el producto a la vez', async () => {
    const bodies = captureBodies('patch', `${PRODUCTS_URL}/:code`)
    const { user } = await openPage()
    const form = await openEdit(user, 'Pepsi 1.5L')
    await user.selectOptions(form.getByLabelText('Categoría'), 'Grocery/Drinks/Water')
    await user.clear(form.getByLabelText('Descuento (%)'))
    await user.type(form.getByLabelText('Descuento (%)'), '20')
    await user.clear(form.getByLabelText('Stock mínimo'))
    await user.type(form.getByLabelText('Stock mínimo'), '8')
    await user.click(form.getByRole('checkbox', { name: /Activo/ }))
    await user.click(form.getByRole('button', { name: 'Guardar cambios' }))

    await screen.findByText('Guardaste los cambios de Pepsi 1.5L')
    expect(bodies).toEqual([{ category: 'Grocery/Drinks/Water', min_stock: 8, discount_percent: 20, active: false }])
    await waitFor(async () => expect(await row(/Pepsi 1\.5L/)).toHaveTextContent('Inactivo'))
  })

  it('si no cambió nada no llama a la API y cierra avisando', async () => {
    const bodies = captureBodies('patch', `${PRODUCTS_URL}/:code`)
    const { user } = await openPage()
    const form = await openEdit(user, 'Pepsi 1.5L')
    await user.type(form.getByLabelText('Nombre'), '  ')
    await user.click(form.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('No había cambios para guardar')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(bodies).toEqual([])
  })

  it('cancelar no cambia nada', async () => {
    const bodies = captureBodies('patch', `${PRODUCTS_URL}/:code`)
    const { user } = await openPage()
    const form = await openEdit(user, 'Pepsi 1.5L')
    await user.clear(form.getByLabelText('Nombre'))
    await user.type(form.getByLabelText('Nombre'), 'Otro nombre')
    await user.click(form.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(bodies).toEqual([])
    expect(inStore(624)?.name).toBe('Pepsi 1.5L')
    expect(mockStore.undoHistory()).toEqual([])
  })

  it('al editar el stock mínimo es obligatorio: la API no acepta null', async () => {
    const bodies = captureBodies('patch', `${PRODUCTS_URL}/:code`)
    const { user } = await openPage()
    const form = await openEdit(user, 'Pepsi 1.5L')
    await user.clear(form.getByLabelText('Stock mínimo'))
    await user.click(form.getByRole('button', { name: 'Guardar cambios' }))

    expect(form.getByLabelText('Stock mínimo')).toHaveAccessibleDescription('Ingresá un entero, 0 o más')
    expect(bodies).toEqual([])
  })

  it('la categoría que dejó de existir (404) se marca en el campo', async () => {
    mockStore.createCategory('Toys')
    const { user } = await openPage()
    const form = await openEdit(user, 'Pepsi 1.5L')
    await user.selectOptions(form.getByLabelText('Categoría'), 'Toys')
    mockStore.deleteCategory('Toys')
    await user.click(form.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(form.getByLabelText('Categoría')).toHaveAccessibleDescription('Esa categoría ya no existe. Elegí otra.'))
  })

  it('si el producto dejó de existir (404) lo dice dentro del panel', async () => {
    const { user } = await openPage()
    const form = await openEdit(user, 'Pepsi 1.5L')
    mockStore.deleteProduct(624)
    await user.clear(form.getByLabelText('Precio'))
    await user.type(form.getByLabelText('Precio'), '2400')
    await user.click(form.getByRole('button', { name: 'Guardar cambios' }))
    expect(await form.findByRole('alert')).toHaveTextContent('Este producto ya no existe')
  })

  it('si la lista de categorías falla conserva la categoría actual del producto', async () => {
    server.use(http.get('*/api/categories', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 3' }, { status: 501 })))
    const bodies = captureBodies('patch', `${PRODUCTS_URL}/:code`)
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Editar Pepsi 1.5L' }))
    const form = within(await dialog('Editar Pepsi 1.5L'))
    expect(await form.findByText('Esta función todavía no está disponible (Flujo 3).')).toBeInTheDocument()
    expect(form.getByLabelText('Categoría')).toHaveValue('Grocery/Drinks/Sodas')
    await user.clear(form.getByLabelText('Precio'))
    await user.type(form.getByLabelText('Precio'), '2400')
    await user.click(form.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Guardaste los cambios de Pepsi 1.5L')
    expect(bodies).toEqual([{ price: 2400 }])
  })
})

/** Valor mostrado junto a un rótulo de la ficha de stock. */
const fact = (modal: ReturnType<typeof within>, label: string) => modal.getByText(label).nextElementSibling

async function openRestock(user: User, name: string) {
  await user.click(await screen.findByRole('button', { name: `Reponer stock de ${name}` }))
  return within(await dialog(`Reponer stock de ${name}`))
}

async function openAdjust(user: User, name: string) {
  await user.click(await screen.findByRole('button', { name: `Ajustar stock de ${name}` }))
  return within(await dialog(`Ajustar stock de ${name}`))
}

describe('reponer stock', () => {
  it('muestra el stock actual y el resultado, y repone', async () => {
    const { user } = await openPage()
    const modal = await openRestock(user, 'Sprite 1.5L')
    expect(fact(modal, 'Stock actual')).toHaveTextContent('3')
    expect(fact(modal, 'Después de reponer')).toHaveTextContent('—')

    await user.type(modal.getByLabelText('Cantidad a reponer'), '10')
    expect(fact(modal, 'Después de reponer')).toHaveTextContent('13')
    await user.click(modal.getByRole('button', { name: 'Reponer' }))

    expect(await screen.findByText('Repusiste Sprite 1.5L: ahora hay 13 unidades')).toBeInTheDocument()
    expect(inStore(614)?.stock).toBe(13)
    await waitFor(async () => expect(await row(/Sprite 1\.5L/)).not.toHaveTextContent('Stock bajo'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['', '0', '-1', '1.5'])('no acepta la cantidad "%s"', async (quantity) => {
    const bodies = captureBodies('post', `${PRODUCTS_URL}/:code/restock`)
    const { user } = await openPage()
    const modal = await openRestock(user, 'Sprite 1.5L')
    if (quantity) await user.type(modal.getByLabelText('Cantidad a reponer'), quantity)
    await user.click(modal.getByRole('button', { name: 'Reponer' }))
    expect(modal.getByLabelText('Cantidad a reponer')).toHaveAccessibleDescription('Ingresá una cantidad entera mayor a 0')
    expect(bodies).toEqual([])
  })

  it('si el producto ya no existe (404) lo dice en el modal', async () => {
    const { user } = await openPage()
    const modal = await openRestock(user, 'Sprite 1.5L')
    mockStore.deleteProduct(614)
    await user.type(modal.getByLabelText('Cantidad a reponer'), '10')
    await user.click(modal.getByRole('button', { name: 'Reponer' }))
    expect(await modal.findByRole('alert')).toHaveTextContent('Este producto ya no existe')
  })
})

describe('ajustar stock', () => {
  it('aplica una diferencia negativa con su motivo', async () => {
    const bodies = captureBodies('post', `${PRODUCTS_URL}/:code/stock-adjustment`)
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Sprite 1.5L')
    expect(fact(modal, 'Stock actual')).toHaveTextContent('3')

    await user.type(modal.getByLabelText('Unidades a sumar o restar'), '-2')
    expect(fact(modal, 'Después del ajuste')).toHaveTextContent('1')
    await user.type(modal.getByLabelText('Motivo'), '  Rotura en el depósito  ')
    await user.click(modal.getByRole('button', { name: 'Ajustar stock' }))

    expect(await screen.findByText('Ajustaste Sprite 1.5L: ahora hay 1 unidad')).toBeInTheDocument()
    expect(bodies).toEqual([{ delta: -2, reason: 'Rotura en el depósito' }])
    expect(inStore(614)?.stock).toBe(1)
  })

  it('también acepta sumar unidades', async () => {
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Sprite 1.5L')
    await user.type(modal.getByLabelText('Unidades a sumar o restar'), '4')
    await user.type(modal.getByLabelText('Motivo'), 'Conteo de inventario')
    await user.click(modal.getByRole('button', { name: 'Ajustar stock' }))
    await screen.findByText('Ajustaste Sprite 1.5L: ahora hay 7 unidades')
    expect(inStore(614)?.stock).toBe(7)
  })

  it('exige un entero distinto de 0 y un motivo', async () => {
    const bodies = captureBodies('post', `${PRODUCTS_URL}/:code/stock-adjustment`)
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Sprite 1.5L')
    await user.type(modal.getByLabelText('Unidades a sumar o restar'), '0')
    await user.type(modal.getByLabelText('Motivo'), '   ')
    await user.click(modal.getByRole('button', { name: 'Ajustar stock' }))

    expect(modal.getByLabelText('Unidades a sumar o restar')).toHaveAccessibleDescription('Ingresá un entero distinto de 0')
    expect(modal.getByLabelText('Motivo')).toHaveAccessibleDescription('Contá por qué se ajusta')
    expect(bodies).toEqual([])
  })

  it('si quedaría negativo (409) lo explica en el modal y no cambia nada', async () => {
    const { user } = await openPage()
    const modal = await openAdjust(user, 'Sprite 1.5L')
    await user.type(modal.getByLabelText('Unidades a sumar o restar'), '-4')
    expect(fact(modal, 'Después del ajuste')).toHaveTextContent('-1')
    await user.type(modal.getByLabelText('Motivo'), 'Rotura')
    await user.click(modal.getByRole('button', { name: 'Ajustar stock' }))

    expect(await modal.findByRole('alert')).toHaveTextContent('No alcanza el stock: el ajuste lo dejaría en negativo.')
    expect(inStore(614)?.stock).toBe(3)
    expect(mockStore.undoHistory()).toEqual([])
  })
})

async function confirmDelete(user: User, name: string) {
  await user.click(await screen.findByRole('button', { name: `Eliminar ${name}` }))
  const modal = within(await dialog(`Eliminar ${name}`))
  await user.click(modal.getByRole('button', { name: 'Eliminar producto' }))
}

describe('eliminar producto', () => {
  it('pide confirmación aclarando que se puede deshacer, y cancelar no borra', async () => {
    const { user } = await openPage()
    await user.click(await screen.findByRole('button', { name: 'Eliminar Pepsi 1.5L' }))
    const modal = await dialog('Eliminar Pepsi 1.5L')
    expect(modal).toHaveTextContent('Se puede deshacer')
    await user.click(within(modal).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(inStore(624)).toBeDefined()
  })

  it('elimina el producto y deshacer lo restaura completo', async () => {
    const { user } = await openPage()
    const original = structuredClone(inStore(624))
    await confirmDelete(user, 'Pepsi 1.5L')

    expect(await screen.findByText('Eliminaste Pepsi 1.5L')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('row', { name: /Pepsi 1\.5L/ })).not.toBeInTheDocument())
    expect(inStore(624)).toBeUndefined()

    await user.click(await screen.findByRole('button', { name: 'Deshacer' }))
    expect(await screen.findByText('Deshecho: Se eliminó el producto 624')).toBeInTheDocument()
    expect(await row(/Pepsi 1\.5L/)).toHaveTextContent('624')
    expect(inStore(624)).toEqual(original)
  })

  it('si falla lo dice en el diálogo', async () => {
    const { user } = await openPage()
    mockStore.deleteProduct(624)
    await confirmDelete(user, 'Pepsi 1.5L')
    expect(await screen.findByRole('alert')).toHaveTextContent('Este producto ya no existe')
  })
})

describe('deshacer', () => {
  const undoButton = () => screen.findByRole('button', { name: 'Deshacer' })
  const expectLastOperation = async (text: string) =>
    waitFor(async () => expect(await undoButton()).toHaveAccessibleDescription(expect.stringContaining(text)))

  const stackThreeOperations = () => {
    mockStore.restock(614, 5)
    mockStore.updateProduct(614, { price: 3000 })
    mockStore.addProduct({ code: 999, name: 'Mantecol 110g', brand: 'Mondelez', price: 1250, stock: 1, category: 'Grocery/Snacks/Cookies' })
  }

  const historyItems = async (user: User) => {
    await user.click(await screen.findByText(/^Historial/))
    return within(await screen.findByRole('list', { name: 'Operaciones que se pueden deshacer' })).getAllByRole('listitem')
  }

  it('con el historial vacío está deshabilitado', async () => {
    await openPage()
    expect(await undoButton()).toBeDisabled()
    expect(screen.getByText('Todavía no hay operaciones para deshacer.')).toBeInTheDocument()
  })

  it('aclara qué cosas no se deshacen', async () => {
    await openPage()
    expect(await screen.findByText(/Los pedidos, las categorías, los ajustes masivos de precios y la configuración no se deshacen/)).toBeInTheDocument()
  })

  it('muestra cuál es la última operación', async () => {
    stackThreeOperations()
    await openPage()
    await expectLastOperation('Alta')
    await expectLastOperation('Se agregó el producto 999')
    await expectLastOperation('Mantecol 110g')
  })

  it('lista el historial de lo más reciente a lo más viejo, con el tipo traducido', async () => {
    stackThreeOperations()
    mockStore.adjustStock(221, -2, 'broken bottles')
    mockStore.deleteProduct(205)
    const { user } = await openPage()
    const items = await historyItems(user)

    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('Baja')
    expect(items[0]).toHaveTextContent('Se eliminó el producto 205')
    expect(items[0]).toHaveTextContent('Se deshace primero')
    expect(items[1]).toHaveTextContent('Stock')
    expect(items[1]).toHaveTextContent('Se ajustó en -2 el stock del producto 221: broken bottles')
    expect(items[2]).toHaveTextContent('Alta')
    expect(items[3]).toHaveTextContent('Modificación')
    expect(items[3]).toHaveTextContent('Se modificó el producto 614')
    expect(items[4]).toHaveTextContent('Se repusieron 5 unidades del producto 614')
    expect(items[1]).not.toHaveTextContent('Se deshace primero')
  })

  it('deshace en orden LIFO', async () => {
    stackThreeOperations()
    const { user } = await openPage()
    await waitFor(async () => expect(await undoButton()).toBeEnabled())

    await user.click(await undoButton())
    expect(await screen.findByText('Deshecho: Se agregó el producto 999')).toBeInTheDocument()
    expect(inStore(999)).toBeUndefined()
    expect(inStore(614)).toMatchObject({ price: 3000, stock: 8 })
    await expectLastOperation('Se modificó el producto 614')

    await user.click(await undoButton())
    expect(await screen.findByText('Deshecho: Se modificó el producto 614')).toBeInTheDocument()
    expect(inStore(614)).toMatchObject({ price: 2300, stock: 8 })
    await expectLastOperation('Se repusieron 5 unidades del producto 614')

    await user.click(await undoButton())
    expect(await screen.findByText('Deshecho: Se repusieron 5 unidades del producto 614')).toBeInTheDocument()
    expect(inStore(614)?.stock).toBe(3)
    await waitFor(async () => expect(await undoButton()).toBeDisabled())
  })

  it('una operación hecha en pantalla aparece como la última', async () => {
    const { user } = await openPage()
    const modal = await openRestock(user, 'Sprite 1.5L')
    await user.type(modal.getByLabelText('Cantidad a reponer'), '1')
    await user.click(modal.getByRole('button', { name: 'Reponer' }))
    await expectLastOperation('Se repuso 1 unidad del producto 614')
    expect(await undoButton()).toBeEnabled()
  })

  it('si no se puede deshacer (409) muestra el motivo y conserva la operación', async () => {
    mockStore.restock(614, 5)
    mockStore.placeOrder('Ana', [{ code: 614, quantity: 8 }]) // ya no quedan las 5 unidades repuestas
    const { user } = await openPage()
    await waitFor(async () => expect(await undoButton()).toBeEnabled())
    await user.click(await undoButton())

    expect(await screen.findByText('No se pudo deshacer: Cannot undo: not enough stock for product 614')).toBeInTheDocument()
    expect(inStore(614)?.stock).toBe(0)
    expect(mockStore.undoHistory()).toHaveLength(1)
  })

  it('una descripción desconocida se muestra tal cual la manda la API', async () => {
    server.use(http.get('*/api/admin/undo/history', () => HttpResponse.json([{ kind: 'stock', code: 614, description: 'Inventory count on product 614' }])))
    await openPage()
    await expectLastOperation('Inventory count on product 614')
  })

  it('si la categoría del producto ya no existe (404) lo explica', async () => {
    mockStore.deleteProduct(614)
    server.use(http.post('*/api/admin/undo', () => HttpResponse.json({ detail: 'Category Grocery/Drinks/Sodas not found' }, { status: 404 })))
    const { user } = await openPage()
    await waitFor(async () => expect(await undoButton()).toBeEnabled())
    await user.click(await undoButton())
    expect(await screen.findByText('No se pudo deshacer: el producto o su categoría ya no existen.')).toBeInTheDocument()
  })

  it('si el historial no carga lo avisa y no ofrece deshacer', async () => {
    server.use(http.get('*/api/admin/undo/history', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 2: GET /admin/undo/history' }, { status: 501 })))
    await openPage()
    expect(await screen.findByText('Esta función todavía no está disponible (Flujo 2).')).toBeInTheDocument()
    expect(await undoButton()).toBeDisabled()
  })
})
