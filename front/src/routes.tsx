import type { RouteObject } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { RequireAdmin } from '@/layouts/RequireAdmin'
import { RouteError } from '@/layouts/RouteError'
import { StoreLayout } from '@/layouts/StoreLayout'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { AdminProductsPage } from '@/pages/admin/AdminProductsPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { ExportPage } from '@/pages/admin/ExportPage'
import { ReportsPage } from '@/pages/admin/ReportsPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { CartPage } from '@/pages/store/CartPage'
import { CatalogPage } from '@/pages/store/CatalogPage'
import { CategoriesPage } from '@/pages/store/CategoriesPage'
import { EfficiencyPage } from '@/pages/store/EfficiencyPage'
import { HomePage } from '@/pages/store/HomePage'
import { OrderPage } from '@/pages/store/OrderPage'
import { ProductPage } from '@/pages/store/ProductPage'
import { SearchPage } from '@/pages/store/SearchPage'
import { TrackOrderPage } from '@/pages/store/TrackOrderPage'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <StoreLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'productos', element: <CatalogPage /> },
      { path: 'productos/:code', element: <ProductPage /> },
      { path: 'buscar', element: <SearchPage /> },
      { path: 'categorias', element: <CategoriesPage /> },
      { path: 'categorias/*', element: <CategoriesPage /> },
      { path: 'eficiencia', element: <EfficiencyPage /> },
      { path: 'carrito', element: <CartPage /> },
      { path: 'seguimiento', element: <TrackOrderPage /> },
      { path: 'pedidos/:id', element: <OrderPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/admin/ingresar', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'productos', element: <AdminProductsPage /> },
      { path: 'categorias', element: <AdminCategoriesPage /> },
      { path: 'pedidos', element: <AdminOrdersPage /> },
      { path: 'reportes', element: <ReportsPage /> },
      { path: 'exportar', element: <ExportPage /> },
      { path: 'configuracion', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
