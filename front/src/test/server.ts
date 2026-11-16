import { setupServer } from 'msw/node'
import { createHandlers } from '@/mocks/handlers'
import { MockStore } from '@/mocks/store'

/** Estado del backend simulado de cada test. Los tests pueden leerlo o prepararlo directamente. */
export let mockStore = new MockStore()

const delegate = new Proxy({} as MockStore, {
  get: (_, property) => {
    const value = mockStore[property as keyof MockStore]
    return typeof value === 'function' ? value.bind(mockStore) : value
  },
})

export const server = setupServer(...createHandlers(delegate))

export function resetMockStore(): void {
  mockStore = new MockStore()
}
