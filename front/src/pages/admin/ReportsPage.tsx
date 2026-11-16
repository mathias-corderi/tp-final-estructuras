import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/ui'
import { BestSellersReport } from './business/BestSellersReport'
import { CategoriesReport } from './business/CategoriesReport'
import { LowStockReport } from './business/LowStockReport'
import { SalesReport } from './business/SalesReport'
import { SearchesReport } from './business/SearchesReport'
import { Tabs } from './business/Tabs'

const SALES = { id: 'ventas', label: 'Ventas', Report: SalesReport }

// Solo se monta la sección abierta: cada una pide sus datos recién cuando hace falta.
const SECTIONS = [
  SALES,
  { id: 'mas-vendidos', label: 'Más vendidos', Report: BestSellersReport },
  { id: 'stock-bajo', label: 'Stock bajo', Report: LowStockReport },
  { id: 'categorias', label: 'Categorías y estructuras', Report: CategoriesReport },
  { id: 'busquedas', label: 'Búsquedas', Report: SearchesReport },
]

export function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const active = SECTIONS.find(({ id }) => id === params.get('seccion')) ?? SALES

  return (
    <>
      <PageHeader title="Reportes" description="Ventas, stock, categorías y búsquedas de la tienda." />
      <Tabs label="Secciones de los reportes" tabs={SECTIONS} active={active.id} onChange={(id) => setParams({ seccion: id }, { replace: true })}>
        <active.Report />
      </Tabs>
    </>
  )
}
