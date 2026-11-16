import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'
import { visibleProductNames } from './catalog/testing'

const cardOf = (name: string) => screen.getByRole('article', { name })

describe('catálogo', () => {
  it('lista los 37 productos activos por código y esconde el inactivo', async () => {
    renderRoute('/productos')
    await screen.findByRole('article', { name: 'Mr. Músculo Kitchen 500ml' })
    expect(screen.getByText('37 productos')).toBeInTheDocument()
    expect(visibleProductNames().slice(0, 3)).toEqual(['Mr. Músculo Kitchen 500ml', 'Car Charger Dual USB', 'Poett Lavender 900ml'])
    expect(visibleProductNames()).not.toContain('Doritos 77g')
  })

  it('con ?orden=name usa el orden por nombre que da la API', async () => {
    renderRoute('/productos?orden=name')
    await screen.findByRole('article', { name: '7Up 1.5L' })
    expect(visibleProductNames().slice(0, 4)).toEqual(['7Up 1.5L', 'Ala Liquid Detergent 3L', 'Ayudín Bleach 1L', 'Baggio Multifruit 1L'])
  })

  it('ordenar deja el criterio en la URL y pide ese recorrido a la API', async () => {
    const { user, router } = renderRoute('/productos')
    await screen.findByRole('article', { name: 'Mr. Músculo Kitchen 500ml' })
    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'Nombre')
    expect(router.state.location.search).toBe('?orden=name')
    await waitFor(() => expect(visibleProductNames()[0]).toBe('7Up 1.5L'))
  })

  it('un orden inventado en la URL no llega a la API: queda por código', async () => {
    renderRoute('/productos?orden=precio')
    expect(await screen.findByRole('article', { name: 'Mr. Músculo Kitchen 500ml' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('code')
  })

  it('"Solo ofertas" deja las 5 ofertas y queda en la URL', async () => {
    const { user, router } = renderRoute('/productos')
    await screen.findByRole('article', { name: 'Mr. Músculo Kitchen 500ml' })
    await user.click(screen.getByRole('checkbox', { name: 'Solo ofertas' }))
    expect(router.state.location.search).toBe('?ofertas=1')
    expect(visibleProductNames()).toEqual([
      'Cepita Orange Juice 1L',
      'Pantene Conditioner 400ml',
      'Pepsi 1.5L',
      'Cocinero Olive Oil 500ml',
      'Terrabusi Variedad 400g',
    ])
    expect(screen.getByText('5 productos')).toBeInTheDocument()
  })

  it('"Solo con stock" saca los dos agotados', async () => {
    renderRoute('/productos?stock=1')
    await screen.findByRole('article', { name: 'Mr. Músculo Kitchen 500ml' })
    expect(screen.getByRole('checkbox', { name: 'Solo con stock' })).toBeChecked()
    expect(screen.getByText('35 productos')).toBeInTheDocument()
    expect(visibleProductNames()).not.toContain('Baggio Multifruit 1L')
    expect(visibleProductNames()).not.toContain('Lightning Cable 1m')
  })

  it('los filtros se pueden sacar y el orden se conserva', async () => {
    const { user, router } = renderRoute('/productos?orden=name&ofertas=1')
    await screen.findByRole('article', { name: 'Cepita Orange Juice 1L' })
    await user.click(screen.getByRole('checkbox', { name: 'Solo ofertas' }))
    expect(router.state.location.search).toBe('?orden=name')
    expect(screen.getByText('37 productos')).toBeInTheDocument()
  })

  it('si los filtros no dejan nada muestra un estado vacío que permite sacarlos', async () => {
    for (const product of mockStore.products) if (product.discount_percent > 0) product.stock = 0
    const { user, router } = renderRoute('/productos?ofertas=1&stock=1')
    expect(await screen.findByRole('heading', { name: 'No hay productos con esos filtros' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(router.state.location.search).toBe('')
    expect(await screen.findByText('37 productos')).toBeInTheDocument()
  })

  it('agregar suma al contador del carrito y avisa', async () => {
    const { user } = renderRoute('/productos')
    await screen.findByRole('article', { name: 'Pepsi 1.5L' })
    await user.click(within(cardOf('Pepsi 1.5L')).getByRole('button', { name: 'Agregar Pepsi 1.5L al carrito' }))
    expect(await screen.findByRole('link', { name: /^Carrito, 1 unidad/ })).toBeInTheDocument()
    expect(screen.getByText('Agregamos Pepsi 1.5L al carrito')).toBeInTheDocument()
  })

  it('un producto agotado no se puede agregar', async () => {
    renderRoute('/productos')
    const card = await screen.findByRole('article', { name: 'Baggio Multifruit 1L' })
    expect(within(card).getByRole('button', { name: 'Agotado' })).toBeDisabled()
  })

  it('no deja agregar más unidades de las que hay en stock', async () => {
    const { user } = renderRoute('/productos')
    const card = await screen.findByRole('article', { name: 'Car Charger Dual USB' })
    await user.click(within(card).getByRole('button', { name: 'Agregar Car Charger Dual USB al carrito' }))
    expect(within(card).getByRole('button', { name: 'En tu carrito' })).toBeDisabled()
    expect(await screen.findByRole('link', { name: /^Carrito, 1 unidad/ })).toBeInTheDocument()
  })

  it('la tarjeta muestra precio con descuento, marca y lleva al producto', async () => {
    renderRoute('/productos')
    const card = await screen.findByRole('article', { name: 'Pepsi 1.5L' })
    expect(within(card).getByText('-10%')).toBeInTheDocument()
    expect(within(card).getByText('PepsiCo')).toBeInTheDocument()
    expect(within(card).getByText(/1\.980,00/)).toBeInTheDocument()
    expect(within(card).getByText(/2\.200,00/)).toBeInTheDocument()
    expect(within(card).getByRole('link', { name: 'Pepsi 1.5L' })).toHaveAttribute('href', '/productos/624')
  })

  it('un producto sin descuento no muestra insignia', async () => {
    renderRoute('/productos')
    const card = await screen.findByRole('article', { name: 'Oreo 118g' })
    expect(within(card).queryByText(/%/)).not.toBeInTheDocument()
  })

  it('si el flujo no está implementado avisa que está en construcción', async () => {
    server.use(http.get('*/api/products', () => HttpResponse.json({ detail: 'Not implemented yet: Flow 1: GET /products' }, { status: 501 })))
    renderRoute('/productos')
    expect(await screen.findByRole('heading', { name: 'Esta parte todavía está en construcción' })).toBeInTheDocument()
    expect(screen.getByText(/Flujo 1/)).toBeInTheDocument()
  })
})
