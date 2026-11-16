import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { adminSession } from '@/api/session'
import { createQueryClient, Providers } from '@/App'
import { MOCK_ADMIN_TOKEN } from '@/mocks/handlers'
import { routes } from '@/routes'

interface RenderOptions {
  /** Entra con la sesión del dueño ya iniciada. */
  admin?: boolean
}

/** Monta la app real en `path`, contra el backend simulado de src/test/server.ts. */
export function renderRoute(path: string, { admin = false }: RenderOptions = {}) {
  if (admin) adminSession.set(MOCK_ADMIN_TOKEN)
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  const view = render(
    <Providers client={createQueryClient()}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...view, user, router }
}
