import { expect, test } from '@playwright/test'
import { loginAsOwner, watchPageErrors } from './helpers'

const adminNav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Administración' })

test('el dueño da de alta un producto, le cambia el stock, lo borra y deshace', async ({ page }) => {
  const errors = watchPageErrors(page)
  const code = String(9000 + Math.floor(Math.random() * 900))
  const name = `Yerba de prueba ${code}`
  await loginAsOwner(page)
  await adminNav(page).getByRole('link', { name: 'Productos' }).click()

  await test.step('alta', async () => {
    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    const form = page.getByRole('dialog', { name: 'Nuevo producto' })
    await form.getByLabel('Código').fill(code)
    await form.getByLabel('Nombre').fill(name)
    await form.getByLabel('Marca').fill('Marolio')
    await form.getByLabel('Precio').fill('1500')
    await form.getByLabel('Stock inicial').fill('10')
    await form.getByLabel('Categoría').selectOption('Grocery/Pantry')
    await form.getByRole('button', { name: /Crear|Guardar/ }).click()
    await expect(form).toBeHidden()
    await expect(page.getByRole('rowheader', { name: new RegExp(name) })).toBeVisible()
  })

  await test.step('el cliente lo ve en la tienda', async () => {
    const shop = await page.context().newPage()
    await shop.goto(`/productos/${code}`)
    await expect(shop.getByRole('heading', { name })).toBeVisible()
    await shop.close()
  })

  await test.step('repone stock', async () => {
    await page.getByRole('button', { name: `Reponer stock de ${name}` }).click()
    const form = page.getByRole('dialog', { name: `Reponer stock de ${name}` })
    await form.getByLabel('Cantidad a reponer').fill('5')
    await form.getByRole('button', { name: 'Reponer' }).click()
    await expect(form).toBeHidden()
  })

  await test.step('no deja stock negativo y explica por qué', async () => {
    await page.getByRole('button', { name: `Ajustar stock de ${name}` }).click()
    const form = page.getByRole('dialog', { name: `Ajustar stock de ${name}` })
    await form.getByLabel('Unidades a sumar o restar').fill('-99')
    await form.getByLabel('Motivo').fill('conteo')
    await form.getByRole('button', { name: 'Ajustar stock' }).click()
    await expect(form.getByRole('alert')).toBeVisible()
    await form.getByLabel('Unidades a sumar o restar').fill('-2')
    await form.getByRole('button', { name: 'Ajustar stock' }).click()
    await expect(form).toBeHidden()
  })

  await test.step('elimina y deshace', async () => {
    await page.getByRole('button', { name: `Eliminar ${name}` }).click()
    await page.getByRole('dialog', { name: `Eliminar ${name}` }).getByRole('button', { name: /Eliminar/ }).click()
    await expect(page.getByRole('rowheader', { name: new RegExp(name) })).toHaveCount(0)
    await page.getByRole('button', { name: 'Deshacer', exact: true }).click()
    await expect(page.getByRole('rowheader', { name: new RegExp(name) })).toBeVisible()
    await expect(page.getByRole('row', { name: new RegExp(name) }).getByText('13', { exact: true })).toBeVisible()
  })

  expect(errors).toEqual([])
})

test('el dueño administra categorías y ajusta precios de una rama', async ({ page }) => {
  const errors = watchPageErrors(page)
  const name = `Prueba${Math.floor(Math.random() * 100000)}`
  await loginAsOwner(page)
  await adminNav(page).getByRole('link', { name: 'Categorías' }).click()

  await page.getByRole('button', { name: 'Nueva categoría' }).click()
  const create = page.getByRole('dialog', { name: 'Nueva categoría' })
  await create.getByLabel('Ruta').fill(`${name}/Sub`)
  await create.getByRole('button', { name: 'Crear categoría' }).click()
  await expect(create).toBeHidden()
  await expect(page.getByRole('group', { name, exact: true })).toBeVisible()

  await page.getByRole('button', { name: `Renombrar ${name}`, exact: true }).click()
  const rename = page.getByRole('dialog', { name: `Renombrar ${name}` })
  await rename.getByLabel('Nuevo nombre').fill(`${name}X`)
  await rename.getByRole('button', { name: 'Renombrar' }).click()
  await expect(rename).toBeHidden()
  await expect(page.getByRole('group', { name: `${name}X`, exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Ajustar precios de Stationery', exact: true }).click()
  const adjust = page.getByRole('dialog', { name: 'Ajustar precios de Stationery' })
  await adjust.getByLabel('Porcentaje').fill('10')
  await adjust.getByRole('button', { name: 'Aplicar ajuste' }).click()
  await expect(adjust).toBeHidden()
  await expect(page.getByText(/2 productos/).first()).toBeVisible()

  expect(errors).toEqual([])
})

test('el dueño cambia la configuración, mira reportes y exporta', async ({ page }) => {
  const errors = watchPageErrors(page)
  await loginAsOwner(page)

  await adminNav(page).getByRole('link', { name: 'Configuración' }).click()
  await page.getByLabel('Nombre de la tienda').fill('Kiosco Don Pepe')
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('link', { name: /Kiosco Don Pepe/ })).toBeVisible()

  await adminNav(page).getByRole('link', { name: 'Reportes' }).click()
  await expect(page.getByRole('tab').first()).toBeVisible()
  for (const tab of await page.getByRole('tab').all()) {
    await tab.click()
    await expect(page.getByRole('tabpanel')).toBeVisible()
  }

  await adminNav(page).getByRole('link', { name: 'Exportar catálogo' }).click()
  await expect(page.getByText('Kiosco Don Pepe — Catalog')).toBeVisible()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Descargar .txt' }).click()])
  expect(download.suggestedFilename()).toBe('catalogo.txt')

  expect(errors).toEqual([])
})
