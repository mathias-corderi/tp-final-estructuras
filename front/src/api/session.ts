/** Token del dueño. Vive en sessionStorage: se borra al cerrar la pestaña y nunca se guarda en el código. */
const KEY = 'almacen.admin-token'

type Listener = () => void
const listeners = new Set<Listener>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export const adminSession = {
  get(): string | null {
    return sessionStorage.getItem(KEY)
  },
  set(token: string): void {
    sessionStorage.setItem(KEY, token)
    notify()
  },
  clear(): void {
    if (sessionStorage.getItem(KEY) === null) return
    sessionStorage.removeItem(KEY)
    notify()
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
