/** Enciende el backend simulado en el navegador (`npm run dev:mock`). Los cambios sobreviven a recargar. */
import { setupWorker } from 'msw/browser'
import { createHandlers } from './handlers'
import { MockStore, type StoreSnapshot } from './store'

const KEY = 'almacen.demo-state'

function loadStore(): MockStore {
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? new MockStore(JSON.parse(saved) as StoreSnapshot) : new MockStore()
  } catch {
    return new MockStore()
  }
}

function save(store: MockStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store.snapshot()))
  } catch {
    // Sin almacenamiento la demo funciona igual hasta recargar.
  }
}

export async function startDemo(): Promise<void> {
  const worker = setupWorker(...createHandlers(loadStore(), { latency: 180, onChange: save }))
  await worker.start({ onUnhandledFrame: 'bypass' })
}

export function resetDemo(): void {
  localStorage.removeItem(KEY)
  window.location.reload()
}
