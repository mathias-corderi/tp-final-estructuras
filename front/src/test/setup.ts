import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { server, resetMockStore } from './server'

// jsdom no trae <dialog> completo: alcanza con abrir y cerrar sin el top layer.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.removeAttribute('open')
}
window.scrollTo = () => {}
URL.createObjectURL ??= () => 'blob:mock'
URL.revokeObjectURL ??= () => {}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  resetMockStore()
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())
