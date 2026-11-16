import { expect, type Page } from '@playwright/test'

export const ADMIN_TOKEN = 'change-me'

export async function loginAsOwner(page: Page): Promise<void> {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/ingresar/)
  await page.getByLabel('Token de acceso').fill(ADMIN_TOKEN)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('navigation', { name: 'Administración' })).toBeVisible()
}

/** Falla el test si la página tira errores de JavaScript. */
export function watchPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  return errors
}
