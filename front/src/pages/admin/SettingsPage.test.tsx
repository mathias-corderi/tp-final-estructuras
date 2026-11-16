import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { adminSession } from '@/api/session'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

const ROUTE = '/admin/configuracion'
const INITIAL = { store_name: 'Almacén Grupo TP', currency: 'ARS', default_min_stock: 5, search_history_size: 10 }

const nameField = () => screen.findByRole('textbox', { name: 'Nombre de la tienda' })
const currencyField = () => screen.findByRole('textbox', { name: 'Moneda' })
const minStockField = () => screen.findByRole('spinbutton', { name: 'Stock mínimo por defecto' })
const historyField = () => screen.findByRole('spinbutton', { name: 'Tamaño del historial' })
const saveButton = () => screen.findByRole('button', { name: 'Guardar cambios' })

/** Registra cada PATCH y deja que lo resuelva el backend simulado. */
function recordPatches() {
  const bodies: unknown[] = []
  server.use(
    http.patch('*/api/admin/settings', async ({ request }) => {
      bodies.push(await request.clone().json())
    }),
  )
  return bodies
}

const replace = async (user: ReturnType<typeof renderRoute>['user'], field: HTMLElement, text: string) => {
  await user.clear(field)
  if (text) await user.type(field, text)
}

describe('formulario', () => {
  it('muestra la configuración actual', async () => {
    renderRoute(ROUTE, { admin: true })

    expect(await nameField()).toHaveValue('Almacén Grupo TP')
    expect(await currencyField()).toHaveValue('ARS')
    expect(await minStockField()).toHaveValue(5)
    expect(await historyField()).toHaveValue(10)
  })

  it('aclara que achicar el historial borra las búsquedas más viejas', async () => {
    renderRoute(ROUTE, { admin: true })
    expect(await historyField()).toHaveAccessibleDescription(/se borran las búsquedas más viejas/i)
  })

  it('aclara que la tienda pública no toma estos datos porque no hay endpoint público', async () => {
    renderRoute(ROUTE, { admin: true })
    const note = await screen.findByRole('note')

    expect(note).toHaveTextContent('config.ts')
    expect(note).toHaveTextContent('GET /admin/settings pide token')
    expect(note).toHaveTextContent('Almacén Grupo TP')
    expect(note).toHaveTextContent('ARS')
  })

  it('sin el endpoint muestra el estado de construcción', async () => {
    server.use(http.get('*/api/admin/settings', () => HttpResponse.json({ detail: 'Not implemented (Flow 5)' }, { status: 501 })))
    renderRoute(ROUTE, { admin: true })

    expect(await screen.findByText('Esta parte todavía está en construcción')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
  })
})

describe('sin cambios', () => {
  it('deshabilita guardar y lo explica', async () => {
    renderRoute(ROUTE, { admin: true })

    expect(await saveButton()).toBeDisabled()
    expect(screen.getByText('No hay cambios para guardar.')).toBeInTheDocument()
  })

  it('no llama a la API al apretar Enter', async () => {
    const bodies = recordPatches()
    const { user } = renderRoute(ROUTE, { admin: true })

    await user.type(await nameField(), '{Enter}')

    await saveButton()
    expect(bodies).toEqual([])
  })

  it('aunque el formulario se envíe igual, nunca manda un body vacío', async () => {
    const bodies = recordPatches()
    renderRoute(ROUTE, { admin: true })
    const form = await screen.findByRole('form', { name: 'Configuración de la tienda' })

    fireEvent.submit(form)

    await saveButton()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(bodies).toEqual([])
    expect(screen.queryByText(/Revisá los datos/)).not.toBeInTheDocument()
  })

  it('volver al valor original deshabilita guardar de nuevo', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const field = await historyField()

    await replace(user, field, '20')
    expect(await saveButton()).toBeEnabled()
    await replace(user, field, '10')
    expect(await saveButton()).toBeDisabled()
  })

  it('escribir la misma moneda en minúsculas no es un cambio', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })

    await replace(user, await currencyField(), 'ars')
    expect(await saveButton()).toBeDisabled()
  })

  it('agregarle espacios al nombre no es un cambio', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })

    await user.type(await nameField(), '  ')
    expect(await saveButton()).toBeDisabled()
  })
})

describe('guardar', () => {
  it('manda solo lo que cambió', async () => {
    const bodies = recordPatches()
    const { user } = renderRoute(ROUTE, { admin: true })

    await replace(user, await minStockField(), '12')
    await user.click(await saveButton())

    await screen.findByText('Guardamos la configuración.')
    expect(bodies).toEqual([{ default_min_stock: 12 }])
    expect(mockStore.settings).toEqual({ ...INITIAL, default_min_stock: 12 })
  })

  it('manda varios cambios juntos', async () => {
    const bodies = recordPatches()
    const { user } = renderRoute(ROUTE, { admin: true })

    await replace(user, await nameField(), 'Kiosco Don Pepe')
    await replace(user, await historyField(), '20')
    await user.click(await saveButton())

    await screen.findByText('Guardamos la configuración.')
    expect(bodies).toEqual([{ store_name: 'Kiosco Don Pepe', search_history_size: 20 }])
  })

  it('manda la moneda en mayúsculas', async () => {
    const bodies = recordPatches()
    const { user } = renderRoute(ROUTE, { admin: true })

    await replace(user, await currencyField(), 'usd')
    await user.click(await saveButton())

    await screen.findByText('Guardamos la configuración.')
    expect(bodies).toEqual([{ currency: 'USD' }])
    expect(mockStore.settings.currency).toBe('USD')
  })

  it('manda el nombre sin espacios en los extremos', async () => {
    const bodies = recordPatches()
    const { user } = renderRoute(ROUTE, { admin: true })

    await replace(user, await nameField(), '  Kiosco  ')
    await user.click(await saveButton())

    await screen.findByText('Guardamos la configuración.')
    expect(bodies).toEqual([{ store_name: 'Kiosco' }])
  })

  it('después de guardar muestra lo guardado y no queda nada pendiente', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })

    await replace(user, await currencyField(), 'usd')
    await user.click(await saveButton())

    await screen.findByText('Guardamos la configuración.')
    expect(await currencyField()).toHaveValue('USD')
    expect(await saveButton()).toBeDisabled()
  })

  it('no parece seguir con cambios mientras se recargan los datos', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const field = await currencyField()
    server.use(http.get('*/api/admin/settings', () => delay(300).then(() => undefined)))

    await replace(user, field, 'USD')
    await user.click(await saveButton())

    await screen.findByText('Guardamos la configuración.')
    expect(await saveButton()).toBeDisabled()
    expect(screen.getByText('No hay cambios para guardar.')).toBeInTheDocument()
  })

  it('acepta 0 como stock mínimo y 1 y 100 como historial', async () => {
    const bodies = recordPatches()
    const { user } = renderRoute(ROUTE, { admin: true })

    await replace(user, await minStockField(), '0')
    await replace(user, await historyField(), '100')
    await user.click(await saveButton())
    await screen.findByText('Guardamos la configuración.')

    await replace(user, await historyField(), '1')
    await user.click(await saveButton())

    await waitFor(() => expect(bodies).toEqual([{ default_min_stock: 0, search_history_size: 100 }, { search_history_size: 1 }]))
  })

  it('el resto del panel toma la moneda nueva', async () => {
    const { user } = renderRoute('/admin', { admin: true })
    await screen.findByText(/^\$\s*24\.960,00/)
    await user.click(screen.getByRole('link', { name: 'Configuración' }))

    await replace(user, await currencyField(), 'USD')
    await user.click(await saveButton())
    await screen.findByText('Guardamos la configuración.')

    await user.click(screen.getByRole('link', { name: 'Resumen' }))
    expect(await screen.findByText(/US\$\s*24\.960,00/)).toBeInTheDocument()
  })
})

describe('después de guardar', () => {
  it('el catálogo exportado toma el nombre nuevo sin esperar a que venza el caché', async () => {
    const { user } = renderRoute('/admin/exportar', { admin: true })
    await screen.findByText(/Almacén Grupo TP — Catalog/)
    await user.click(screen.getByRole('link', { name: 'Configuración' }))

    await replace(user, await nameField(), 'Kiosco')
    await user.click(await saveButton())
    await screen.findByText('Guardamos la configuración.')

    await user.click(screen.getByRole('link', { name: 'Exportar catálogo' }))
    expect(await screen.findByText(/Kiosco — Catalog/)).toBeInTheDocument()
  })

  it('achicar el historial se ve enseguida en el reporte de búsquedas', async () => {
    const { user } = renderRoute('/admin/reportes?seccion=busquedas', { admin: true })
    const recent = await screen.findByRole('list', { name: 'Búsquedas recientes' })
    expect(within(recent).getAllByRole('listitem')).toHaveLength(5)
    await user.click(screen.getByRole('link', { name: 'Configuración' }))

    await replace(user, await historyField(), '2')
    await user.click(await saveButton())
    await screen.findByText('Guardamos la configuración.')

    await user.click(screen.getByRole('link', { name: 'Reportes' }))
    await user.click(await screen.findByRole('tab', { name: 'Búsquedas' }))
    const shrunk = await screen.findByRole('list', { name: 'Búsquedas recientes' })
    expect(within(shrunk).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['cable', 'coca'])
  })
})

describe('validación antes de llamar a la API', () => {
  const cases: [string, () => Promise<HTMLElement>, string, RegExp][] = [
    ['nombre en blanco', nameField, '   ', /escribí el nombre/i],
    ['moneda de 2 letras', currencyField, 'US', /3 letras/i],
    ['moneda con símbolos', currencyField, 'U$D', /3 letras/i],
    ['stock mínimo negativo', minStockField, '-1', /0 o más/i],
    ['stock mínimo con decimales', minStockField, '2.5', /0 o más/i],
    ['stock mínimo vacío', minStockField, '', /0 o más/i],
    ['historial en 0', historyField, '0', /entre 1 y 100/i],
    ['historial en 101', historyField, '101', /entre 1 y 100/i],
    ['historial vacío', historyField, '', /entre 1 y 100/i],
  ]

  it.each(cases)('%s muestra el error en el campo y no llama a la API', async (_, field, text, message) => {
    const bodies = recordPatches()
    const { user } = renderRoute(ROUTE, { admin: true })
    const input = await field()

    await replace(user, input, text)
    await user.click(await saveButton())

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(bodies).toEqual([])
    expect(mockStore.settings).toEqual(INITIAL)
  })

  it('el error se va al corregir ese campo', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const input = await currencyField()

    await replace(user, input, 'US')
    await user.click(await saveButton())
    expect(input).toHaveAttribute('aria-invalid', 'true')

    await user.type(input, 'D')
    expect(input).not.toHaveAttribute('aria-invalid')
  })
})

describe('errores del servidor', () => {
  const rejectWith = (detail: unknown, status = 422) =>
    server.use(http.patch('*/api/admin/settings', () => HttpResponse.json({ detail } as never, { status })))

  it('un 422 con campo muestra el error en ese campo y no cambia nada', async () => {
    rejectWith([{ loc: ['body', 'currency'], msg: 'String should have at most 3 characters' }])
    const { user } = renderRoute(ROUTE, { admin: true })

    await replace(user, await nameField(), 'Kiosco')
    await replace(user, await currencyField(), 'USD')
    await user.click(await saveButton())

    expect(await screen.findByText('String should have at most 3 characters')).toBeInTheDocument()
    expect(await currencyField()).toHaveAttribute('aria-invalid', 'true')
    expect(await nameField()).toHaveValue('Kiosco')
    expect(mockStore.settings).toEqual(INITIAL)
    expect(screen.queryByText('Guardamos la configuración.')).not.toBeInTheDocument()
  })

  it('un 422 de texto se avisa con un toast', async () => {
    rejectWith('currency must be exactly 3 letters')
    const { user } = renderRoute(ROUTE, { admin: true })

    await replace(user, await currencyField(), 'USD')
    await user.click(await saveButton())

    expect(await screen.findByText('Revisá los datos: currency must be exactly 3 letters')).toBeInTheDocument()
    expect(await currencyField()).not.toHaveAttribute('aria-invalid')
    expect(mockStore.settings).toEqual(INITIAL)
  })

  it('un error en un campo que no está en el formulario también se avisa', async () => {
    rejectWith([{ loc: ['body', 'color'], msg: 'Extra inputs are not permitted' }])
    const { user } = renderRoute(ROUTE, { admin: true })

    await replace(user, await currencyField(), 'USD')
    await user.click(await saveButton())

    expect(await screen.findByText('Revisá los datos: Extra inputs are not permitted')).toBeInTheDocument()
  })

  it('un 401 al guardar lleva al ingreso', async () => {
    const { user, router } = renderRoute(ROUTE, { admin: true })
    const field = await currencyField()
    rejectWith('Missing X-Admin-Token header', 401)

    await replace(user, field, 'USD')
    await user.click(await saveButton())

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/ingresar'))
    expect(adminSession.get()).toBeNull()
  })
})

describe('accesibilidad del formulario', () => {
  it('todos los controles tienen etiqueta', async () => {
    renderRoute(ROUTE, { admin: true })
    const form = await screen.findByRole('form', { name: 'Configuración de la tienda' })
    expect(within(form).getAllByRole('textbox')).toHaveLength(2)
    expect(within(form).getAllByRole('spinbutton')).toHaveLength(2)
  })
})
