// Copia el contrato real de la API (OpenAPI) y regenera los tipos de TypeScript.
// Si el contrato cambia, este script más `npm run typecheck` señalan qué pantallas hay que tocar.
//   npm run contract:sync                     (usa la API de la carpeta de arriba)
//   API_REPO=/otra/ruta npm run contract:sync
import { execFileSync } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const apiRepo = path.resolve(root, process.env.API_REPO ?? '..')
const venvPython = path.join(apiRepo, '.venv/bin/python')
const python = existsSync(venvPython) ? venvPython : 'python3'

const dump = 'import json; from store.api.app import app; print(json.dumps(app.openapi(), ensure_ascii=False, indent=2))'
const spec = execFileSync(python, ['-c', dump], { cwd: apiRepo, encoding: 'utf-8' })
writeFileSync(path.join(root, 'contract/openapi.json'), spec)

execFileSync('npx', ['openapi-typescript', 'contract/openapi.json', '-o', 'src/api/schema.d.ts'], {
  cwd: root,
  stdio: 'inherit',
})
