import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

// Usa el navegador del sistema si hay uno compatible con Chromium; si no, `npx playwright install chromium`.
const systemBrowser = [process.env.CHROME_PATH, '/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/brave'].find(
  (candidate) => candidate && existsSync(candidate),
)
// Con API_URL (`npm run e2e:real`) el front pasa por el proxy de Vite hacia FastAPI; sin ella, usa el modo demo.
const realApi = Boolean(process.env.API_URL)
const PORT = realApi ? 5198 : 5199
const MODE = realApi ? 'development' : 'mock'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices['Desktop Chrome'],
    launchOptions: systemBrowser ? { executablePath: systemBrowser } : {},
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npx vite --mode ${MODE} --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !realApi,
  },
})
