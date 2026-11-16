import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

const CART_KEY = 'almacen.cart'

const setCart = (lines: { code: number; quantity: number }[]) => localStorage.setItem(CART_KEY, JSON.stringify(lines))
const savedCart = () => JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as unknown
const summary = () => screen.getByRole('region', { name: 'Resumen' })
const confirmButton = () => screen.getByRole('button', { name: 'Confirmar pedido' })
const nameField = () => screen.getByRole('textbox', { name: 'Tu nombre' })
const orderCount = () => mockStore.listOrders(null).length

/** La próxima cotización tarda hasta que se llame a `release`: sirve para mirar la pantalla en el medio. */
function holdNextQuote() {
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.post(
      '*/api/cart/quote',
      async () => {
        await held
      },
      { once: true },
    ),
  )
  return release
}

/** Los pedidos quedan en espera hasta `release`; después siguen al backend simulado. */
function holdOrders() {
  let release = () => {}
  let requests = 0
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.post('*/api/orders', async () => {
      requests += 1
      await held
    }),
  )
  return { release: () => release(), requests: () => requests }
}

describe('CartPage: líneas y total', () => {
  it('con el carrito vacío invita a ver los productos', async () => {
    renderRoute('/carrito')

    expect(await screen.findByRole('heading', { name: 'Tu carrito está vacío' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver productos' })).toHaveAttribute('href', '/productos')
  })

  it('cotiza con el descuento: 2 Pepsi a 1980 son 3960', async () => {
    setCart([{ code: 624, quantity: 2 }])
    renderRoute('/carrito')

    const name = await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    expect(name).toHaveAttribute('href', '/productos/624')
    const line = name.closest('li')!
    expect(within(line).getByText('$ 1.980,00')).toBeInTheDocument()
    expect(await within(line).findByText('$ 2.200,00')).toBeInTheDocument()
    expect(within(line).getByText('$ 3.960,00')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Resumen' })).getByText('$ 3.960,00')).toBeInTheDocument()
  })

  it('suma varios productos en el total', async () => {
    setCart([
      { code: 624, quantity: 1 },
      { code: 795, quantity: 2 },
    ])
    renderRoute('/carrito')

    const summary = await screen.findByRole('region', { name: 'Resumen' })
    // 1980 + 2 × 2700
    expect(await within(summary).findByText('$ 7.380,00')).toBeInTheDocument()
  })
})

describe('CartPage: cambiar el carrito', () => {
  it('al cambiar la cantidad recotiza sin tocar el stock', async () => {
    setCart([{ code: 624, quantity: 2 }])
    const { user } = renderRoute('/carrito')
    const stepper = await screen.findByRole('group', { name: 'Cantidad de Pepsi 1.5L' })

    await user.click(within(stepper).getByRole('button', { name: 'Sumar uno' }))

    // 3 × 1980
    expect(await within(summary()).findByText('$ 5.940,00')).toBeInTheDocument()
    expect(savedCart()).toEqual([{ code: 624, quantity: 3 }])
    expect(mockStore.getProduct(624).stock).toBe(25)
  })

  it('mientras recotiza deja la pantalla a la vista, con el total anterior', async () => {
    setCart([{ code: 624, quantity: 2 }])
    const { user } = renderRoute('/carrito')
    const stepper = await screen.findByRole('group', { name: 'Cantidad de Pepsi 1.5L' })
    const release = holdNextQuote()

    await user.click(within(stepper).getByRole('button', { name: 'Sumar uno' }))

    expect(screen.queryByRole('status', { name: 'Cargando…' })).not.toBeInTheDocument()
    expect(within(summary()).getByText('$ 3.960,00')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Cantidad de Pepsi 1.5L' })).toHaveValue(3)

    release()
    expect(await within(summary()).findByText('$ 5.940,00')).toBeInTheDocument()
  })

  it('el stepper no pasa del stock del producto', async () => {
    setCart([{ code: 795, quantity: 18 }])
    const { user } = renderRoute('/carrito')
    const stepper = await screen.findByRole('group', { name: 'Cantidad de Rivadavia Notebook 48 Sheets' })
    const plus = within(stepper).getByRole('button', { name: 'Sumar uno' })
    await waitFor(() => expect(within(stepper).getByRole('spinbutton')).toHaveAttribute('max', '19'))

    await user.click(plus)

    expect(savedCart()).toEqual([{ code: 795, quantity: 19 }])
    expect(plus).toBeDisabled()
  })

  it('quitar una línea la saca enseguida y recotiza', async () => {
    setCart([
      { code: 624, quantity: 1 },
      { code: 795, quantity: 2 },
    ])
    const { user } = renderRoute('/carrito')
    const remove = await screen.findByRole('button', { name: 'Quitar Pepsi 1.5L del carrito' })
    const release = holdNextQuote()

    await user.click(remove)

    expect(screen.queryByRole('link', { name: 'Pepsi 1.5L' })).not.toBeInTheDocument()
    release()
    expect(await within(summary()).findByText('$ 5.400,00')).toBeInTheDocument()
    expect(savedCart()).toEqual([{ code: 795, quantity: 2 }])
  })

  it('quitar la última línea deja el carrito vacío', async () => {
    setCart([{ code: 624, quantity: 1 }])
    const { user } = renderRoute('/carrito')

    await user.click(await screen.findByRole('button', { name: 'Quitar Pepsi 1.5L del carrito' }))

    expect(await screen.findByRole('heading', { name: 'Tu carrito está vacío' })).toBeInTheDocument()
  })
})

describe('CartPage: cotización al día', () => {
  it('al volver al carrito cotiza de nuevo aunque las líneas sean las mismas', async () => {
    setCart([{ code: 624, quantity: 2 }])
    const { user } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })

    await user.click(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: 'Seguí tu pedido' }))
    await screen.findByRole('textbox', { name: 'Número de pedido' })
    mockStore.adjustStock(624, -24, 'se vendió en el local')
    await user.click(screen.getByRole('link', { name: 'Carrito, 2 unidades' }))

    const section = within(await screen.findByRole('region', { name: 'Hay que revisar estos productos' }))
    expect(section.getByText('Queda 1')).toBeInTheDocument()
  })
})

describe('CartPage: productos no disponibles', () => {
  const unavailable = () => screen.findByRole('region', { name: 'Hay que revisar estos productos' })

  it('con stock insuficiente dice cuánto queda y permite ajustar', async () => {
    setCart([{ code: 795, quantity: 25 }])
    const { user } = renderRoute('/carrito')

    const section = within(await unavailable())
    expect(await section.findByText('Rivadavia Notebook 48 Sheets')).toBeInTheDocument()
    expect(section.getByText('Quedan 19')).toBeInTheDocument()
    expect(section.getByText('Pediste 25')).toBeInTheDocument()

    await user.click(section.getByRole('button', { name: 'Ajustar a 19' }))

    // 19 × 2700
    expect(await within(summary()).findByText('$ 51.300,00')).toBeInTheDocument()
    expect(savedCart()).toEqual([{ code: 795, quantity: 19 }])
    expect(screen.queryByRole('region', { name: 'Hay que revisar estos productos' })).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Cantidad de Rivadavia Notebook 48 Sheets' })).toHaveValue(19)
  })

  it('si queda una sola unidad lo dice en singular', async () => {
    setCart([{ code: 111, quantity: 2 }])
    renderRoute('/carrito')

    const section = within(await unavailable())
    expect(section.getByText('Queda 1')).toBeInTheDocument()
    expect(section.getByRole('button', { name: 'Ajustar a 1' })).toBeInTheDocument()
  })

  it('sin stock solo se puede quitar', async () => {
    setCart([{ code: 715, quantity: 1 }])
    const { user } = renderRoute('/carrito')

    const section = within(await unavailable())
    expect(section.getByText('Sin stock por ahora')).toBeInTheDocument()
    expect(section.queryByRole('button', { name: /Ajustar/ })).not.toBeInTheDocument()

    await user.click(await section.findByRole('button', { name: 'Quitar Baggio Multifruit 1L del carrito' }))

    expect(await screen.findByRole('heading', { name: 'Tu carrito está vacío' })).toBeInTheDocument()
  })

  it('un producto inactivo no figura en el catálogo: se muestra por su código', async () => {
    setCart([{ code: 962, quantity: 1 }])
    const { user } = renderRoute('/carrito')

    const section = within(await unavailable())
    expect(section.getByText('Producto 962')).toBeInTheDocument()
    expect(section.getByText('Ya no está disponible')).toBeInTheDocument()
    expect(section.queryByRole('button', { name: /Ajustar/ })).not.toBeInTheDocument()

    await user.click(section.getByRole('button', { name: 'Quitar Producto 962 del carrito' }))

    expect(savedCart()).toEqual([])
  })

  it('un código que no existe también se puede quitar', async () => {
    setCart([{ code: 99999, quantity: 1 }])
    renderRoute('/carrito')

    const section = within(await unavailable())
    expect(section.getByText('Ya no está disponible')).toBeInTheDocument()
    expect(section.getByRole('button', { name: 'Quitar Producto 99999 del carrito' })).toBeInTheDocument()
  })

  it('una línea quitada desaparece enseguida, sin esperar la cotización', async () => {
    setCart([
      { code: 624, quantity: 1 },
      { code: 962, quantity: 1 },
    ])
    const { user } = renderRoute('/carrito')
    const section = within(await unavailable())
    const release = holdNextQuote()

    await user.click(section.getByRole('button', { name: 'Quitar Producto 962 del carrito' }))

    expect(screen.queryByText('Producto 962')).not.toBeInTheDocument()
    release()
  })

  it('el total no cuenta las líneas no disponibles y lo aclara', async () => {
    setCart([
      { code: 624, quantity: 2 },
      { code: 715, quantity: 1 },
    ])
    renderRoute('/carrito')

    await unavailable()
    expect(within(summary()).getByText('$ 3.960,00')).toBeInTheDocument()
    expect(within(summary()).getByText(/No incluye los productos a revisar/)).toBeInTheDocument()
  })
})

describe('CartPage: confirmar el pedido', () => {
  /** El seed trae 6 pedidos: el próximo es el 7. */
  const SEED_ORDERS = 6

  it('compra: reserva el stock, vacía el carrito y lleva al pedido', async () => {
    setCart([{ code: 624, quantity: 2 }])
    const { user, router } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })

    await user.type(nameField(), '  Ana  ')
    await user.click(confirmButton())

    await waitFor(() => expect(router.state.location.pathname).toBe('/pedidos/7'))
    expect(router.state.location.search).toBe('?nuevo=1')
    expect(mockStore.getProduct(624).stock).toBe(23)
    expect(mockStore.getOrder(7)).toMatchObject({ customer_name: 'Ana', status: 'pending', total: 3960 })
    expect(savedCart()).toEqual([])
    expect(localStorage.getItem('almacen.recent-orders')).toBe('[7]')
    expect(screen.getByRole('link', { name: 'Carrito vacío' })).toBeInTheDocument()
    expect(await screen.findByText('Pedido #7 confirmado')).toBeInTheDocument()
  })

  it('al comprar no llega a mostrar el carrito vacío', async () => {
    setCart([{ code: 624, quantity: 1 }])
    const { user, router } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    await user.type(nameField(), 'Ana')
    let sawEmpty = false
    const observer = new MutationObserver(() => {
      sawEmpty ||= document.body.textContent.includes('Tu carrito está vacío')
    })
    observer.observe(document.body, { childList: true, subtree: true })

    await user.click(confirmButton())

    await waitFor(() => expect(router.state.location.pathname).toBe('/pedidos/7'))
    await screen.findByRole('heading', { name: '¡Gracias! Recibimos tu pedido' })
    observer.disconnect()
    expect(sawEmpty).toBe(false)
  })

  it('el nombre en blanco no llama a la API y muestra el error en el campo', async () => {
    setCart([{ code: 624, quantity: 1 }])
    const { user, router } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })

    await user.type(nameField(), '   ')
    await user.click(confirmButton())

    expect(await screen.findByText('Escribí tu nombre para confirmar el pedido.')).toBeInTheDocument()
    expect(nameField()).toBeInvalid()
    expect(nameField()).toHaveFocus()
    expect(orderCount()).toBe(SEED_ORDERS)
    expect(router.state.location.pathname).toBe('/carrito')
  })

  it('el error del nombre se va al escribir', async () => {
    setCart([{ code: 624, quantity: 1 }])
    const { user } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    await user.click(confirmButton())
    expect(await screen.findByText('Escribí tu nombre para confirmar el pedido.')).toBeInTheDocument()

    await user.type(nameField(), 'A')

    expect(screen.queryByText('Escribí tu nombre para confirmar el pedido.')).not.toBeInTheDocument()
  })

  it('con líneas no disponibles no se puede confirmar hasta resolverlas, y lo explica', async () => {
    setCart([
      { code: 624, quantity: 1 },
      { code: 715, quantity: 1 },
    ])
    const { user } = renderRoute('/carrito')

    const notice = await screen.findByText(/la tienda rechaza el pedido completo/)
    expect(notice).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()

    await user.click(await screen.findByRole('button', { name: 'Quitar Baggio Multifruit 1L del carrito' }))

    await waitFor(() => expect(confirmButton()).toBeEnabled())
    expect(screen.queryByText(/la tienda rechaza el pedido completo/)).not.toBeInTheDocument()
  })

  it('sin ninguna línea disponible no se puede confirmar', async () => {
    setCart([{ code: 962, quantity: 1 }])
    renderRoute('/carrito')

    await screen.findByRole('region', { name: 'Hay que revisar estos productos' })
    expect(confirmButton()).toBeDisabled()
  })

  it('no deja confirmar mientras se recalcula el total', async () => {
    setCart([{ code: 624, quantity: 2 }])
    const { user } = renderRoute('/carrito')
    const stepper = await screen.findByRole('group', { name: 'Cantidad de Pepsi 1.5L' })
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    const release = holdNextQuote()

    await user.click(within(stepper).getByRole('button', { name: 'Sumar uno' }))

    expect(confirmButton()).toBeDisabled()
    release()
    await waitFor(() => expect(confirmButton()).toBeEnabled())
  })

  it('dos clics seguidos crean un solo pedido', async () => {
    setCart([{ code: 624, quantity: 1 }])
    const placing = holdOrders()
    const { user, router } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    await user.type(nameField(), 'Ana')
    await waitFor(() => expect(confirmButton()).toBeEnabled())

    // En el mismo tick: todavía no hubo render que deshabilite el botón.
    const button = confirmButton()
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(placing.requests()).toBeGreaterThan(0))
    placing.release()

    await waitFor(() => expect(router.state.location.pathname).toBe('/pedidos/7'))
    expect(placing.requests()).toBe(1)
    expect(orderCount()).toBe(SEED_ORDERS + 1)
    expect(mockStore.getProduct(624).stock).toBe(24)
  })

  it('mientras se envía el pedido no deja tocar las líneas', async () => {
    setCart([{ code: 624, quantity: 1 }])
    const placing = holdOrders()
    const { user, router } = renderRoute('/carrito')
    const stepper = await screen.findByRole('spinbutton', { name: 'Cantidad de Pepsi 1.5L' })
    await user.type(nameField(), 'Ana')

    await user.click(confirmButton())

    await waitFor(() => expect(confirmButton()).toBeDisabled())
    expect(stepper.closest('[inert]')).not.toBeNull()
    placing.release()
    await waitFor(() => expect(router.state.location.pathname).toBe('/pedidos/7'))
  })

  it('409: conserva carrito y nombre, avisa y actualiza la cotización', async () => {
    setCart([{ code: 624, quantity: 2 }])
    const { user, router } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    await user.type(nameField(), 'Ana')
    mockStore.adjustStock(624, -24, 'se vendió en el local')

    await user.click(confirmButton())

    expect(await screen.findByText(/No alcanzó el stock de algún producto/)).toBeInTheDocument()
    const section = within(await screen.findByRole('region', { name: 'Hay que revisar estos productos' }))
    expect(section.getByText('Queda 1')).toBeInTheDocument()
    expect(savedCart()).toEqual([{ code: 624, quantity: 2 }])
    expect(nameField()).toHaveValue('Ana')
    expect(router.state.location.pathname).toBe('/carrito')
    expect(orderCount()).toBe(SEED_ORDERS)
  })

  it('el nombre sobrevive aunque también falle la cotización', async () => {
    setCart([{ code: 624, quantity: 2 }])
    const { user } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    await user.type(nameField(), 'Ana')
    server.use(
      http.post('*/api/orders', () => HttpResponse.json({ detail: 'Not enough stock' }, { status: 409 })),
      http.post('*/api/cart/quote', () => HttpResponse.json({ detail: 'Flow 4 is not implemented yet' }, { status: 501 })),
    )

    await user.click(confirmButton())
    await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })
    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    expect(nameField()).toHaveValue('Ana')
  })

  it('404: conserva carrito y nombre, avisa y actualiza la cotización', async () => {
    setCart([{ code: 624, quantity: 2 }])
    const { user } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    await user.type(nameField(), 'Ana')
    mockStore.updateProduct(624, { active: false })

    await user.click(confirmButton())

    expect(await screen.findByText(/Un producto de tu carrito ya no está disponible/)).toBeInTheDocument()
    const section = within(await screen.findByRole('region', { name: 'Hay que revisar estos productos' }))
    expect(section.getByText('Ya no está disponible')).toBeInTheDocument()
    expect(savedCart()).toEqual([{ code: 624, quantity: 2 }])
    expect(nameField()).toHaveValue('Ana')
  })

  it('si la API rechaza el nombre, lo marca en el campo', async () => {
    setCart([{ code: 624, quantity: 1 }])
    server.use(
      http.post('*/api/orders', () =>
        HttpResponse.json({ detail: [{ type: 'value_error', loc: ['body', 'customer_name'], msg: 'String should have at most 80 characters' }] }, { status: 422 }),
      ),
    )
    const { user } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    await user.type(nameField(), 'Ana')

    await user.click(confirmButton())

    expect(await screen.findByText('Revisá el nombre: la tienda no lo aceptó.')).toBeInTheDocument()
    expect(nameField()).toBeInvalid()
    expect(savedCart()).toEqual([{ code: 624, quantity: 1 }])
  })

  it('si la compra falla porque falta el flujo, avisa y conserva el carrito', async () => {
    setCart([{ code: 624, quantity: 1 }])
    server.use(http.post('*/api/orders', () => HttpResponse.json({ detail: 'Flow 4 is not implemented yet' }, { status: 501 })))
    const { user } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    await user.type(nameField(), 'Ana')

    await user.click(confirmButton())

    expect(await screen.findByText('Esta función todavía no está disponible (Flujo 4).')).toBeInTheDocument()
    expect(savedCart()).toEqual([{ code: 624, quantity: 1 }])
    expect(nameField()).toHaveValue('Ana')
  })
})

describe('CartPage: reintentar la compra', () => {
  it('después de un error se puede volver a confirmar', async () => {
    setCart([{ code: 624, quantity: 1 }])
    server.use(http.post('*/api/orders', () => HttpResponse.json({ detail: 'Flow 4 is not implemented yet' }, { status: 501 }), { once: true }))
    const { user, router } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })
    await user.type(nameField(), 'Ana')

    await user.click(confirmButton())
    await screen.findByText('Esta función todavía no está disponible (Flujo 4).')
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())

    await waitFor(() => expect(router.state.location.pathname).toBe('/pedidos/7'))
    expect(mockStore.getOrder(7).customer_name).toBe('Ana')
  })
})

describe('CartPage: la API no responde', () => {
  it('con 501 muestra el aviso y conserva el carrito local', async () => {
    setCart([{ code: 624, quantity: 2 }])
    server.use(http.post('*/api/cart/quote', () => HttpResponse.json({ detail: 'Flow 4 is not implemented yet' }, { status: 501 })))
    renderRoute('/carrito')

    expect(await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })).toBeInTheDocument()
    expect(screen.getByText(/Flujo 4/)).toBeInTheDocument()
    expect(savedCart()).toEqual([{ code: 624, quantity: 2 }])
    expect(screen.getByRole('link', { name: 'Carrito, 2 unidades' })).toBeInTheDocument()
  })

  it('con la API caída muestra el aviso, conserva el carrito y se puede reintentar', async () => {
    setCart([{ code: 624, quantity: 2 }])
    server.use(http.post('*/api/cart/quote', () => HttpResponse.error()))
    const { user } = renderRoute('/carrito')

    expect(await screen.findByRole('heading', { name: 'No pudimos conectarnos con la tienda' }, { timeout: 4000 })).toBeInTheDocument()
    expect(savedCart()).toEqual([{ code: 624, quantity: 2 }])

    server.resetHandlers()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('link', { name: 'Pepsi 1.5L' })).toBeInTheDocument()
  })

  it('si solo falla el catálogo, igual se puede comprar', async () => {
    setCart([{ code: 624, quantity: 1 }])
    server.use(http.get('*/api/products', () => HttpResponse.json({ detail: 'Flow 1 is not implemented yet' }, { status: 501 })))
    const { user, router } = renderRoute('/carrito')
    await screen.findByRole('link', { name: 'Pepsi 1.5L' })

    await user.type(nameField(), 'Ana')
    await user.click(confirmButton())

    await waitFor(() => expect(router.state.location.pathname).toBe('/pedidos/7'))
  })
})
