import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'
import { countCallsTo } from './catalog/testing'

const codeField = () => screen.getByRole('textbox', { name: 'Código de producto' })
const compareButton = () => screen.getByRole('button', { name: 'Comparar' })
const productSelect = () => screen.findByRole('combobox', { name: 'O elegí un producto' })
const result = () => screen.findByRole('region', { name: 'Resultado de la comparación' })

describe('eficiencia', () => {
  it('explica las dos formas de buscar en lenguaje simple', async () => {
    renderRoute('/eficiencia')
    expect(await screen.findByRole('heading', { level: 1, name: 'Cómo buscamos tus productos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lista: de a uno' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Árbol binario: por descarte' })).toBeInTheDocument()
  })

  it('sin código todavía no compara', async () => {
    renderRoute('/eficiencia')
    await screen.findByRole('heading', { level: 1, name: 'Cómo buscamos tus productos' })
    expect(screen.queryByRole('region', { name: 'Resultado de la comparación' })).not.toBeInTheDocument()
  })

  it('compara un código escrito: 38 pasos en la lista contra 6 en el árbol', async () => {
    const { user, router } = renderRoute('/eficiencia')
    await user.type(codeField(), '421')
    await user.click(compareButton())
    const panel = within(await result())
    expect(panel.getByText('Encontramos el código 421.')).toBeInTheDocument()
    expect(panel.getByRole('meter', { name: 'Lista: 38 comparaciones' })).toHaveAttribute('aria-valuenow', '38')
    expect(panel.getByRole('meter', { name: 'Árbol binario: 6 comparaciones' })).toHaveAttribute('aria-valuenow', '6')
    expect(panel.getByText('El árbol hizo 32 comparaciones menos que la lista.')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?codigo=421')
  })

  it('el código de la URL se compara al entrar', async () => {
    renderRoute('/eficiencia?codigo=205')
    const panel = within(await result())
    expect(panel.getByRole('meter', { name: 'Lista: 7 comparaciones' })).toBeInTheDocument()
    expect(panel.getByRole('meter', { name: 'Árbol binario: 2 comparaciones' })).toBeInTheDocument()
    expect(codeField()).toHaveValue('205')
  })

  it('elegir un producto del selector compara ese producto', async () => {
    const { user } = renderRoute('/eficiencia')
    const select = await productSelect()
    await within(select).findByRole('option', { name: 'Chocolinas 170g (530)' })
    await user.selectOptions(select, 'Chocolinas 170g (530)')
    const panel = within(await result())
    expect(panel.getByRole('meter', { name: 'Lista: 12 comparaciones' })).toBeInTheDocument()
    expect(panel.getByRole('meter', { name: 'Árbol binario: 4 comparaciones' })).toBeInTheDocument()
    expect(codeField()).toHaveValue('530')
  })

  it('un código inexistente explica que la lista tuvo que recorrerse entera', async () => {
    renderRoute('/eficiencia?codigo=999')
    const panel = within(await result())
    expect(panel.getByText('El código 999 no existe en la tienda.')).toBeInTheDocument()
    expect(panel.getByText(/la lista recorrió sus 38 productos hasta el final/)).toBeInTheDocument()
    expect(panel.getByRole('meter', { name: 'Lista: 38 comparaciones' })).toBeInTheDocument()
    expect(panel.getByRole('meter', { name: 'Árbol binario: 6 comparaciones' })).toBeInTheDocument()
  })

  it('un producto inactivo cuenta como encontrado, como dice el contrato', async () => {
    renderRoute('/eficiencia?codigo=962')
    const panel = within(await result())
    expect(panel.getByText('Encontramos el código 962.')).toBeInTheDocument()
    expect(panel.getByRole('meter', { name: 'Lista: 16 comparaciones' })).toBeInTheDocument()
    expect(panel.getByRole('meter', { name: 'Árbol binario: 8 comparaciones' })).toBeInTheDocument()
  })

  it('el primero de la lista es un empate y lo dice', async () => {
    renderRoute('/eficiencia?codigo=221')
    const panel = within(await result())
    expect(panel.getByRole('meter', { name: 'Lista: 1 comparación' })).toBeInTheDocument()
    expect(panel.getByText('Empate: los dos hicieron la misma cantidad de comparaciones.')).toBeInTheDocument()
  })

  it('si el árbol tarda más también lo dice', async () => {
    server.use(http.get('*/api/products/compare-search', () => HttpResponse.json({ code: 7, found: true, list_comparisons: 2, tree_comparisons: 5 })))
    renderRoute('/eficiencia?codigo=7')
    const panel = within(await result())
    expect(panel.getByText('Esta vez la lista hizo 3 comparaciones menos que el árbol.')).toBeInTheDocument()
  })

  it('un texto que no es un código avisa en el campo y no llama a la API', async () => {
    const compareCalls = countCallsTo('/products/compare-search')
    const { user, router } = renderRoute('/eficiencia')
    await user.type(codeField(), 'abc')
    await user.click(compareButton())
    expect(screen.getByText('Ingresá un código numérico, por ejemplo 221.')).toBeInTheDocument()
    expect(codeField()).toBeInvalid()
    expect(router.state.location.search).toBe('')
    expect(compareCalls()).toBe(0)
  })

  it('un código inválido en la URL no llega a la API', async () => {
    const compareCalls = countCallsTo('/products/compare-search')
    renderRoute('/eficiencia?codigo=abc')
    await productSelect()
    expect(screen.queryByText('No pudimos cargar esta información')).not.toBeInTheDocument()
    expect(compareCalls()).toBe(0)
  })

  it('no registra nada en el historial de búsquedas', async () => {
    const before = [...mockStore.history]
    renderRoute('/eficiencia?codigo=421')
    await result()
    expect(mockStore.history).toEqual(before)
  })

  it('si el flujo no está implementado avisa que está en construcción', async () => {
    server.use(http.get('*/api/products/compare-search', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 1: GET /products/compare-search' }, { status: 501 })))
    renderRoute('/eficiencia?codigo=421')
    expect(await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })).toBeInTheDocument()
  })

  it('si no carga la lista de productos se puede comparar igual escribiendo el código', async () => {
    server.use(http.get('*/api/products', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 1: GET /products' }, { status: 501 })))
    const { user } = renderRoute('/eficiencia')
    await user.type(codeField(), '421')
    await user.click(compareButton())
    expect(within(await result()).getByText('Encontramos el código 421.')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'O elegí un producto' })).not.toBeInTheDocument()
  })
})
