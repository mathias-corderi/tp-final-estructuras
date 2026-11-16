import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { createQueryClient, Providers } from './App'
import { routes } from './routes'
import './styles/global.css'

async function start(): Promise<void> {
  // Condición literal, no config.demo: así Vite la resuelve al compilar y el simulado no entra en producción.
  if (import.meta.env.MODE === 'mock') {
    const { startDemo } = await import('./mocks/browser')
    await startDemo()
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers client={createQueryClient()}>
        <RouterProvider router={createBrowserRouter(routes)} />
      </Providers>
    </StrictMode>,
  )
}

void start()
