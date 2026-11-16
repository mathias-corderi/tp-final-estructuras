import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { api, type ProductSort } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { Button, Checkbox, EmptyState, PageHeader, QueryState, SelectField } from '@/ui'
import { productCount } from './catalog/helpers'
import { ProductGrid, ProductGridSkeleton } from './catalog/ProductGrid'
import styles from './CatalogPage.module.css'

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const sort: ProductSort = params.get('orden') === 'name' ? 'name' : 'code'
  const onlyOffers = params.get('ofertas') === '1'
  const onlyInStock = params.get('stock') === '1'

  const query = useQuery({ queryKey: keys.products(sort), queryFn: () => api.products.list(sort) })
  const visible = query.data?.filter((product) => (!onlyOffers || product.discount_percent > 0) && (!onlyInStock || product.stock > 0))

  const setParam = (name: string, value: string | null) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === null) next.delete(name)
        else next.set(name, value)
        return next
      },
      { replace: true },
    )
  }

  const clearFilters = () => {
    setParams(sort === 'name' ? { orden: 'name' } : {}, { replace: true })
  }

  return (
    <>
      <PageHeader title="Productos" description={visible ? productCount(visible.length) : undefined} />
      <div className={styles.toolbar}>
        <div className={styles.sort}>
          <SelectField label="Ordenar por" value={sort} onChange={(event) => setParam('orden', event.target.value === 'name' ? 'name' : null)}>
            <option value="code">Código</option>
            <option value="name">Nombre</option>
          </SelectField>
        </div>
        <div className={styles.filters}>
          <Checkbox label="Solo ofertas" checked={onlyOffers} onChange={(event) => setParam('ofertas', event.target.checked ? '1' : null)} />
          <Checkbox label="Solo con stock" checked={onlyInStock} onChange={(event) => setParam('stock', event.target.checked ? '1' : null)} />
        </div>
      </div>
      <QueryState query={query} loading={<ProductGridSkeleton />}>
        {() =>
          visible?.length ? (
            <ProductGrid products={visible} />
          ) : onlyOffers || onlyInStock ? (
            <EmptyState title="No hay productos con esos filtros" action={<Button variant="secondary" onClick={clearFilters}>Quitar filtros</Button>}>
              Probá sacando alguno para ver más opciones.
            </EmptyState>
          ) : (
            <EmptyState title="Todavía no hay productos">Volvé pronto: estamos cargando el catálogo.</EmptyState>
          )
        }
      </QueryState>
    </>
  )
}
