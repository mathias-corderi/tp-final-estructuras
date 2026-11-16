// Captura de pantalla de la app en modo demo, para revisar el resultado visual.
//   node scripts/shot.mjs /admin/productos salida.png [--admin] [--cart] [--mobile] [--full]
// Levanta el servidor si no hay uno en el puerto 5199.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chromium } from '@playwright/test'

const [route = '/', output = 'shot.png', ...flags] = process.argv.slice(2)
const has = (flag) => flags.includes(flag)
const PORT = 5199
const base = `http://127.0.0.1:${PORT}`
const browserPath = [process.env.CHROME_PATH, '/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/brave'].find(
  (candidate) => candidate && existsSync(candidate),
)

const isUp = () => fetch(base).then(() => true, () => false)
let server
if (!(await isUp())) {
  server = spawn('npx', ['vite', '--mode', 'mock', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
  for (let attempt = 0; attempt < 100 && !(await isUp()); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 100))
}

const browser = await chromium.launch(browserPath ? { executablePath: browserPath } : {})
try {
  const context = await browser.newContext({
    viewport: has('--mobile') ? { width: 390, height: 844 } : { width: 1366, height: 860 },
    deviceScaleFactor: 1,
  })
  if (has('--admin')) await context.addInitScript(() => sessionStorage.setItem('almacen.admin-token', 'change-me'))
  if (has('--cart')) {
    await context.addInitScript(() =>
      localStorage.setItem('almacen.cart', JSON.stringify([{ code: 624, quantity: 2 }, { code: 736, quantity: 1 }, { code: 715, quantity: 1 }])),
    )
  }
  const page = await context.newPage()
  const problems = []
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text())
  })
  page.on('pageerror', (error) => problems.push(String(error)))
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await page.screenshot({ path: output, fullPage: has('--full') })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  console.log(`captura: ${output}${overflow > 0 ? `  OJO: scroll horizontal de ${overflow}px` : ''}`)
  if (problems.length) console.log('errores de consola:\n' + problems.join('\n'))
} finally {
  await browser.close()
  server?.kill()
}
