import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'
import { countCallsTo, visibleProductNames } from './catalog/testing'

const SEED_HISTORY = ['coca', 'oreo', 'detergent', 'coca', 'cable']

const nameField = () => screen.getByRole('searchbox', { name: 'Nombre' })
const brandField = () => screen.getByRole('searchbox', { name: 'Marca' })
const submitButton = () => screen.getByRole('button', { name: 'Buscar productos' })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('búsqueda', () => {
  it('sin criterios invita a buscar y no llama a la API', async () => {
    const searchCalls = countCallsTo('/products/search')
    renderRoute('/buscar')
    expect(await screen.findByRole('heading', { name: '¿Qué estás buscando?' })).toBeInTheDocument()
    expect(searchCalls()).toBe(0)
  })

  it('criterios en blanco en la URL cuentan como sin criterios (la API daría 422)', async () => {
    const searchCalls = countCallsTo('/products/search')
    renderRoute('/buscar?name=%20%20&brand=')
    expect(await screen.findByRole('heading', { name: '¿Qué estás buscando?' })).toBeInTheDocument()
    expect(searchCalls()).toBe(0)
  })

  it('escribir no busca: registra una sola vez, al enviar', async () => {
    const { user, router } = renderRoute('/buscar')
    await user.type(nameField(), 'cola')
    expect(mockStore.history).toEqual(SEED_HISTORY)
    expect(router.state.location.search).toBe('')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()

    await user.click(submitButton())
    await screen.findByRole('article', { name: 'Coca-Cola 1.5L' })
    expect(router.state.location.search).toBe('?name=cola')
    expect(mockStore.history).toEqual([...SEED_HISTORY, 'cola'])
  })

  it('Enter en el campo también envía', async () => {
    const { user } = renderRoute('/buscar')
    await user.type(brandField(), 'unilever{Enter}')
    await screen.findByRole('article', { name: 'Ala Liquid Detergent 3L' })
    expect(visibleProductNames()).toEqual(['Ala Liquid Detergent 3L', 'Skip Powder 800g', 'Sedal Shampoo 340ml'])
  })

  it('con un criterio cuenta los productos revisados y los resultados', async () => {
    renderRoute('/buscar?name=cola')
    expect(await screen.findByText('Revisamos 38 productos para encontrar 2 resultados.')).toBeInTheDocument()
    expect(visibleProductNames()).toEqual(['Coca-Cola 1.5L', 'Coca-Cola Zero 1.5L'])
  })

  it('un solo resultado va en singular', async () => {
    renderRoute('/buscar?name=oreo')
    expect(await screen.findByText('Revisamos 38 productos para encontrar 1 resultado.')).toBeInTheDocument()
  })

  it('con dos criterios explica que la API suma las dos pasadas', async () => {
    const { user } = renderRoute('/buscar')
    await user.type(nameField(), '1.5')
    await user.type(brandField(), 'coca')
    await user.click(submitButton())
    expect(await screen.findByText(/^Hicimos 76 comparaciones para encontrar 3 resultados/)).toBeInTheDocument()
    expect(screen.getByText(/una pasada por nombre y otra por marca/)).toBeInTheDocument()
    expect(visibleProductNames()).toEqual(['Coca-Cola 1.5L', 'Coca-Cola Zero 1.5L', 'Sprite 1.5L'])
    expect(mockStore.history).toEqual([...SEED_HISTORY, '1.5', 'coca'])
  })

  it('sin resultados muestra el estado vacío con lo que se revisó', async () => {
    renderRoute('/buscar?name=heladera')
    expect(await screen.findByRole('heading', { name: 'No encontramos productos con esa búsqueda' })).toBeInTheDocument()
    expect(screen.getByText(/Revisamos 38 productos/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todo el catálogo' })).toHaveAttribute('href', '/productos')
  })

  it('un producto inactivo no aparece aunque coincida', async () => {
    renderRoute('/buscar?name=doritos')
    expect(await screen.findByRole('heading', { name: 'No encontramos productos con esa búsqueda' })).toBeInTheDocument()
    expect(screen.getByText(/Revisamos 38 productos/)).toBeInTheDocument()
  })

  it('el buscador del encabezado llena el formulario y busca una vez', async () => {
    const { user } = renderRoute('/')
    await user.type(await screen.findByRole('searchbox', { name: /buscar productos por nombre/i }), 'oreo{Enter}')
    await screen.findByRole('article', { name: 'Oreo 118g' })
    expect(nameField()).toHaveValue('oreo')
    expect(mockStore.history).toEqual([...SEED_HISTORY, 'oreo'])
  })

  it('el formulario sigue a la URL si se busca desde el encabezado estando en la página', async () => {
    const { user } = renderRoute('/buscar?name=cola&brand=coca')
    await screen.findByRole('article', { name: 'Coca-Cola 1.5L' })
    const header = screen.getByRole('searchbox', { name: /buscar productos por nombre/i })
    await user.clear(header)
    await user.type(header, 'oreo{Enter}')
    await screen.findByRole('article', { name: 'Oreo 118g' })
    expect(nameField()).toHaveValue('oreo')
    expect(brandField()).toHaveValue('')
  })

  it('al vaciar el formulario y enviar vuelve a la invitación sin llamar a la API', async () => {
    const { user, router } = renderRoute('/buscar?name=cola')
    await screen.findByRole('article', { name: 'Coca-Cola 1.5L' })
    await user.clear(nameField())
    await user.type(nameField(), '   ')
    await user.click(submitButton())
    expect(await screen.findByRole('heading', { name: '¿Qué estás buscando?' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('')
    expect(mockStore.history).toEqual([...SEED_HISTORY, 'cola'])
  })

  it('volver a los resultados más tarde no registra otra búsqueda', async () => {
    const { user, router } = renderRoute('/buscar?name=cola')
    await screen.findByRole('article', { name: 'Coca-Cola 1.5L' })
    await user.click(screen.getByRole('link', { name: 'Coca-Cola 1.5L' }))
    await screen.findByRole('heading', { level: 1, name: 'Coca-Cola 1.5L' })

    const later = Date.now() + 60_000
    vi.spyOn(Date, 'now').mockImplementation(() => later)
    await router.navigate(-1)
    await screen.findByRole('article', { name: 'Coca-Cola 1.5L' })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockStore.history).toEqual([...SEED_HISTORY, 'cola'])
  })

  it('si el flujo no está implementado avisa que está en construcción', async () => {
    server.use(http.get('*/api/products/search', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 1: GET /products/search' }, { status: 501 })))
    renderRoute('/buscar?name=cola')
    expect(await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/Flujo 1/)).toBeInTheDocument())
  })
})
