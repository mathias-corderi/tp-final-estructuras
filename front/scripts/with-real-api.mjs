// Levanta FastAPI con una copia limpia del seed, corre el comando indicado y al terminar apaga la API.
//   node scripts/with-real-api.mjs npx vitest run --project contract
//   API_REPO=/otra/ruta node scripts/with-real-api.mjs npx playwright test
// El comando recibe la dirección en CONTRACT_API_URL y API_URL.
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const apiRepo = path.resolve(root, process.env.API_REPO ?? '..')
const venvPython = path.join(apiRepo, '.venv/bin/python')
const python = process.env.API_PYTHON ?? (existsSync(venvPython) ? venvPython : 'python3')
const port = process.env.REAL_API_PORT ?? '8765'
const url = `http://127.0.0.1:${port}`
const [command, ...args] = process.argv.slice(2)

if (!command) {
  console.error('Falta el comando a correr.')
  process.exit(2)
}

const dataDir = mkdtempSync(path.join(tmpdir(), 'store-real-api-'))
const dataFile = path.join(dataDir, 'store.json')
copyFileSync(path.join(apiRepo, 'data/seed.json'), dataFile)

const api = spawn(python, ['-m', 'uvicorn', 'store.api.app:app', '--port', port, '--log-level', 'warning'], {
  cwd: apiRepo,
  env: { ...process.env, STORE_DATA_PATH: dataFile, STORE_ADMIN_TOKEN: 'change-me' },
  stdio: 'inherit',
})

async function waitForApi() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      if ((await fetch(`${url}/openapi.json`)).ok) return
    } catch {
      // Todavía no levantó.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`La API no respondió en ${url}`)
}

let status = 1
try {
  await waitForApi()
  const run = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, CONTRACT_API_URL: url, API_URL: url },
    stdio: 'inherit',
  })
  status = run.status ?? 1
} finally {
  api.kill()
  rmSync(dataDir, { recursive: true, force: true })
}
process.exit(status)
