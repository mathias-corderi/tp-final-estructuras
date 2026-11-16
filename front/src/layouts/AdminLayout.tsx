import { useQuery } from '@tanstack/react-query'
import { BarChart3, FileText, FolderTree, LayoutDashboard, LogOut, Package, Settings, ShoppingBag, Store } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { api } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { adminSession } from '@/api/session'
import { config } from '@/config'
import styles from './AdminLayout.module.css'

const NAV = [
  { to: '/admin', label: 'Resumen', Icon: LayoutDashboard, end: true },
  { to: '/admin/productos', label: 'Productos', Icon: Package },
  { to: '/admin/categorias', label: 'Categorías', Icon: FolderTree },
  { to: '/admin/pedidos', label: 'Pedidos', Icon: ShoppingBag },
  { to: '/admin/reportes', label: 'Reportes', Icon: BarChart3 },
  { to: '/admin/exportar', label: 'Exportar catálogo', Icon: FileText },
  { to: '/admin/configuracion', label: 'Configuración', Icon: Settings },
]

export function AdminLayout() {
  const navigate = useNavigate()
  // El dueño sí puede leer la configuración; mientras no llega, o si falla, queda el nombre de config.ts.
  const settings = useQuery({ queryKey: keys.admin.settings(), queryFn: () => api.admin.settings.get() })

  // Primero se sale del panel: si el token se borrara antes, RequireAdmin mandaría al ingreso.
  const logout = async () => {
    await navigate('/')
    adminSession.clear()
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link to="/admin" className={styles.brand}>
          {settings.data?.store_name ?? config.storeName}
          <span>Panel del dueño</span>
        </Link>
        <nav aria-label="Administración">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? styles.active : undefined)}>
              <Icon size={19} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.bottom}>
          <Link to="/">
            <Store size={19} aria-hidden />
            Ver la tienda
          </Link>
          <button type="button" onClick={() => void logout()}>
            <LogOut size={19} aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
