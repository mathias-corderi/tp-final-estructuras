import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { api, type Product, type ProductSort } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { Button, EmptyState, PageHeader, QueryState, SelectField, TextField } from '@/ui'
import { DeleteProductDialog } from './catalog/DeleteProductDialog'
import { filterProducts, STATUS_FILTERS, type StatusFilter } from './catalog/productFilters'
import { ProductFormModal } from './catalog/ProductFormModal'
import { ProductsTable, type ProductAction } from './catalog/ProductsTable'
import { AdjustStockModal, RestockModal } from './catalog/StockModals'
import { UndoPanel } from './catalog/UndoPanel'
import styles from './AdminProductsPage.module.css'

type OpenDialog = { action: 'create' } | { action: ProductAction; product: Product } | null

const plural = (count: number) => (count === 1 ? 'producto' : 'productos')

export function AdminProductsPage() {
  const [sort, setSort] = useState<ProductSort>('code')
  const [text, setText] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [dialog, setDialog] = useState<OpenDialog>(null)

  const products = useQuery({
    queryKey: keys.admin.products(sort),
    queryFn: () => api.admin.products.list(sort),
    placeholderData: keepPreviousData,
  })

  const closeDialog = () => setDialog(null)

  const clearFilters = () => {
    setText('')
    setStatus('all')
  }

  const renderList = (all: Product[]) => {
    const visible = filterProducts(all, text, status)
    return (
      <>
        <UndoPanel products={all} />
        <div className={styles.filters}>
          <div className={styles.search}>
            <TextField label="Filtrar" type="search" placeholder="Nombre, marca o código" value={text} onChange={(event) => setText(event.target.value)} />
          </div>
          <SelectField label="Estado" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
            {STATUS_FILTERS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <SelectField label="Ordenar por" value={sort} onChange={(event) => setSort(event.target.value as ProductSort)}>
            <option value="code">Código</option>
            <option value="name">Nombre</option>
          </SelectField>
        </div>
        <p className={styles.count}>
          {visible.length === all.length ? `${all.length} ${plural(all.length)}` : `${visible.length} de ${all.length} ${plural(all.length)}`}
        </p>
        {visible.length > 0 ? (
          <ProductsTable products={visible} onAction={(action, product) => setDialog({ action, product })} />
        ) : (
          <EmptyState
            title="Ningún producto coincide con el filtro"
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            }
          />
        )}
      </>
    )
  }

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Todo el catálogo, inactivos incluidos."
        actions={
          products.isSuccess ? (
            <Button icon={<Plus size={18} aria-hidden />} onClick={() => setDialog({ action: 'create' })}>
              Nuevo producto
            </Button>
          ) : null
        }
      />
      <QueryState query={products}>{renderList}</QueryState>
      {dialog?.action === 'create' ? <ProductFormModal onClose={closeDialog} /> : null}
      {dialog?.action === 'edit' ? <ProductFormModal product={dialog.product} onClose={closeDialog} /> : null}
      {dialog?.action === 'restock' ? <RestockModal product={dialog.product} onClose={closeDialog} /> : null}
      {dialog?.action === 'adjust' ? <AdjustStockModal product={dialog.product} onClose={closeDialog} /> : null}
      {dialog?.action === 'delete' ? <DeleteProductDialog product={dialog.product} onClose={closeDialog} /> : null}
    </div>
  )
}
