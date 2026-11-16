import { expect, test } from '@playwright/test'
import { loginAsOwner, watchPageErrors } from './helpers'

test('un cliente compra, el dueño atiende el pedido y el cliente lo ve entregado', async ({ page }) => {
  const errors = watchPageErrors(page)

  await test.step('busca y agrega al carrito', async () => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: /buscar/i }).fill('oreo')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/buscar\?name=oreo/)
    await page.getByRole('button', { name: 'Agregar Oreo 118g al carrito' }).click()
    await expect(page.getByRole('link', { name: 'Carrito, 1 unidad' })).toBeVisible()
  })

  await test.step('agrega un producto con descuento desde su categoría', async () => {
    await page.goto('/categorias/Grocery/Drinks/Sodas')
    await page.getByRole('button', { name: 'Agregar Pepsi 1.5L al carrito' }).click()
    await expect(page.getByRole('link', { name: 'Carrito, 2 unidades' })).toBeVisible()
  })

  const orderUrl = await test.step('cotiza y confirma', async () => {
    await page.getByRole('link', { name: 'Carrito, 2 unidades' }).click()
    await page.getByRole('group', { name: /Cantidad de Pepsi/ }).getByRole('button', { name: 'Sumar uno' }).click()
    // Oreo 1500 + 2 Pepsi a 1980 = 5460
    await expect(page.getByText('5.460,00').first()).toBeVisible()
    await page.getByLabel('Tu nombre').fill('Ana')
    await page.getByRole('button', { name: 'Confirmar pedido' }).click()
    await expect(page.getByRole('heading', { name: '¡Gracias! Recibimos tu pedido' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Carrito vacío' })).toBeVisible()
    return page.url().replace(/\?.*$/, '')
  })

  await test.step('el dueño atiende la cola en orden hasta llegar a ese pedido', async () => {
    const orderId = Number(orderUrl.split('/').pop())
    await loginAsOwner(page)
    await page.getByRole('navigation', { name: 'Administración' }).getByRole('link', { name: 'Pedidos' }).click()
    const attend = page.getByRole('button', { name: 'Atender siguiente' })
    for (let attended = 0; attended < 20; attended += 1) {
      await attend.click()
      const toast = page.getByText(/^Atendiste el pedido #\d+/).last()
      await expect(toast).toBeVisible()
      if ((await toast.textContent())?.includes(`#${orderId} `)) break
      await page.getByRole('button', { name: 'Cerrar aviso' }).first().click()
    }
    await expect(page.getByText(`Atendiste el pedido #${orderId} de Ana.`)).toBeVisible()
  })

  await test.step('el cliente ve su pedido entregado', async () => {
    await page.goto(orderUrl)
    await expect(page.getByRole('heading', { name: /^Pedido #\d+$/ })).toBeVisible()
    await expect(page.getByText('Entregado').first()).toBeVisible()
  })

  expect(errors).toEqual([])
})

test('un producto agotado no se puede comprar', async ({ page }) => {
  await page.goto('/productos?orden=name')
  await expect(page.getByRole('heading', { name: 'Baggio Multifruit 1L' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar Baggio Multifruit 1L al carrito' })).toHaveCount(0)
})

test('el carrito sobrevive a recargar la página', async ({ page }) => {
  await page.goto('/productos/736')
  await page.getByRole('button', { name: /Agregar/ }).first().click()
  await expect(page.getByRole('link', { name: 'Carrito, 1 unidad' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: 'Carrito, 1 unidad' })).toBeVisible()
})
