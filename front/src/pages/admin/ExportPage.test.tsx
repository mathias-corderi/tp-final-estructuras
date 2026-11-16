import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminSession } from '@/api/session'
import { renderRoute } from '@/test/render'
import { mockStore, server } from '@/test/server'

const ROUTE = '/admin/exportar'
const FIRST_LINE = 'Almacén - Grupo 4 — Catalog (37 products)'

const catalog = () => screen.findByRole('region', { name: 'Catálogo exportado' })

/** jsdom no descarga archivos: se capturan el Blob y el enlace que hace la descarga. */
function spyOnDownload() {
  const blobs: Blob[] = []
  const links: { download: string; href: string }[] = []
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob)
    return 'blob:catalogo'
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
    links.push({ download: this.download, href: this.href })
  })
  return { blobs, links }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('exportar catálogo', () => {
  it('muestra el texto que devuelve la API', async () => {
    renderRoute(ROUTE, { admin: true })
    const text = await catalog()

    expect(text.textContent?.split('\n')[0]).toBe(FIRST_LINE)
    expect(text).toHaveTextContent('7Up 1.5L')
  })

  it('el bloque se puede recorrer con el teclado', async () => {
    renderRoute(ROUTE, { admin: true })
    expect(await catalog()).toHaveAttribute('tabindex', '0')
  })

  it('explica qué contiene', async () => {
    renderRoute(ROUTE, { admin: true })
    expect(await screen.findByText(/productos activos ordenados por nombre/i)).toBeInTheDocument()
  })

  it('descarga un .txt en UTF-8 con el mismo texto', async () => {
    const { blobs, links } = spyOnDownload()
    const { user } = renderRoute(ROUTE, { admin: true })
    const text = await catalog()

    await user.click(screen.getByRole('button', { name: 'Descargar .txt' }))

    expect(links).toEqual([{ download: 'catalogo.txt', href: 'blob:catalogo' }])
    expect(blobs).toHaveLength(1)
    expect(blobs[0]?.type).toBe('text/plain;charset=utf-8')
    expect(await blobs[0]?.text()).toBe(text.textContent)
    const bytes = new Uint8Array(await blobs[0]!.arrayBuffer())
    expect([...bytes.slice(5, 7)]).toEqual([0xc3, 0xa9]) // la "é" de "Almacén" en UTF-8
  })

  it('copia el texto al portapapeles y lo avisa', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    const text = await catalog()

    await user.click(screen.getByRole('button', { name: 'Copiar' }))

    expect(await screen.findByText('Copiamos el catálogo.')).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe(text.textContent)
  })

  it('avisa si el navegador rechaza copiar', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    await catalog()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))

    await user.click(screen.getByRole('button', { name: 'Copiar' }))

    expect(await screen.findByText(/No pudimos copiar/)).toBeInTheDocument()
    expect(screen.queryByText('Copiamos el catálogo.')).not.toBeInTheDocument()
  })

  it('avisa si el navegador no tiene portapapeles', async () => {
    const { user } = renderRoute(ROUTE, { admin: true })
    await catalog()
    vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue(undefined as unknown as Clipboard)

    await user.click(screen.getByRole('button', { name: 'Copiar' }))

    expect(await screen.findByText(/No pudimos copiar/)).toBeInTheDocument()
  })

  it('refleja los datos de la tienda', async () => {
    mockStore.settings.store_name = 'Kiosco'
    renderRoute(ROUTE, { admin: true })
    expect((await catalog()).textContent?.split('\n')[0]).toBe('Kiosco — Catalog (37 products)')
  })

  it('sin el endpoint no ofrece descargar ni copiar', async () => {
    server.use(http.get('*/api/admin/export/catalog', () => HttpResponse.json({ detail: 'Not implemented (Flow 5)' }, { status: 501 })))
    renderRoute(ROUTE, { admin: true })

    expect(await screen.findByText('Esta parte todavía está en construcción')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Descargar .txt' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copiar' })).not.toBeInTheDocument()
  })

  it('un 401 lleva al ingreso', async () => {
    server.use(http.get('*/api/admin/export/catalog', () => HttpResponse.json({ detail: 'Missing X-Admin-Token header' }, { status: 401 })))
    const { router } = renderRoute(ROUTE, { admin: true })

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/ingresar'))
    expect(adminSession.get()).toBeNull()
  })
})
