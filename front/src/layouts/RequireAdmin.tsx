import { useSyncExternalStore, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { adminSession } from '@/api/session'

export function useAdminToken(): string | null {
  return useSyncExternalStore(adminSession.subscribe, adminSession.get)
}

/** Sin token va al ingreso, y vuelve a la pantalla que se quería ver. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const token = useAdminToken()
  const location = useLocation()
  if (!token) return <Navigate to="/admin/ingresar" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
