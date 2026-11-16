import { expect, test } from '@playwright/test'
import { ADMIN_TOKEN, watchPageErrors } from './helpers'

const STORE = ['/', '/productos', '/productos/624', '/productos/999999', '/buscar?name=cola', '/buscar', '/categorias', '/categorias/Personal%20Care/Hair', '/eficiencia', '/carrito', '/seguimiento', '/pedidos/1', '/pedidos/999', '/no-existe']
const ADMIN = ['/admin', '/admin/productos', '/admin/categorias', '/admin/pedidos', '/admin/reportes', '/admin/reportes?seccion=categorias', '/admin/exportar', '/admin/configuracion']

for (const width of [360, 768, 1366]) {
  test.describe(`${width} px de ancho`, () => {
    test.use({ viewport: { width, height: 800 } })

    test('ninguna pantalla se desborda ni tira errores', async ({ page }) => {
      const errors = watchPageErrors(page)
      await page.addInitScript((token) => {
        sessionStorage.setItem('almacen.admin-token', token)
        localStorage.setItem('almacen.cart', JSON.stringify([{ code: 624, quantity: 2 }, { code: 715, quantity: 1 }]))
      }, ADMIN_TOKEN)

      for (const route of [...STORE, ...ADMIN]) {
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `scroll horizontal en ${route}`).toBeLessThanOrEqual(0)
        await expect(page.getByRole('heading').first(), `sin título en ${route}`).toBeVisible()
      }
      expect(errors).toEqual([])
    })
  })
}
