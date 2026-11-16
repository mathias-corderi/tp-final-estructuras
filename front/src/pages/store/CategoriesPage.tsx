import { useQuery } from '@tanstack/react-query'
import { FolderSearch } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { api, type CategoryNode } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { categoryLabel } from '@/lib/categories'
import { useTitle } from '@/lib/useTitle'
import { Button, Checkbox, EmptyState, LinkButton, PageHeader, QueryState } from '@/ui'
import { CategoryBreadcrumb } from './catalog/CategoryBreadcrumb'
import { CategoryTiles } from './catalog/CategoryTiles'
import { CategoryTree } from './catalog/CategoryTree'
import { findCategory, productCount } from './catalog/helpers'
import { ProductGrid, ProductGridSkeleton } from './catalog/ProductGrid'
import styles from './CategoriesPage.module.css'

function CategoryNotFound() {
  useTitle('Categoría no encontrada')
  return (
    <EmptyState
      icon={<FolderSearch size={28} aria-hidden />}
      title="No encontramos esta categoría"
      action={<LinkButton to="/categorias">Ver todas las categorías</LinkButton>}
    >
      Puede que haya cambiado de nombre o que el enlace tenga un error.
    </EmptyState>
  )
}

function CategoryBranch({ node }: { node: CategoryNode }) {
  const [includeSubcategories, setIncludeSubcategories] = useState(true)
  const query = useQuery({
    queryKey: keys.categoryProducts(node.path, includeSubcategories),
    queryFn: () => api.categories.products(node.path, includeSubcategories),
  })
  const hasChildren = node.children.length > 0
  const label = categoryLabel(node.name)

  if (query.error instanceof ApiError && query.error.status === 404) return <CategoryNotFound />

  return (
    <>
      <div className={styles.trail}>
        <CategoryBreadcrumb path={node.path} browsing />
      </div>
      <PageHeader title={label} description={query.data ? productCount(query.data.length) : undefined} />
      {hasChildren ? (
        <div className={styles.options}>
          <Checkbox label="Incluir subcategorías" checked={includeSubcategories} onChange={(event) => setIncludeSubcategories(event.target.checked)} />
        </div>
      ) : null}
      <QueryState query={query} loading={<ProductGridSkeleton count={6} />}>
        {(products) => {
          if (products.length > 0) return <ProductGrid products={products} />
          if (hasChildren && !includeSubcategories) {
            return (
              <EmptyState
                title={`No hay productos directamente en ${label}`}
                action={<Button variant="secondary" onClick={() => setIncludeSubcategories(true)}>Ver los de las subcategorías</Button>}
              >
                Sus productos están dentro de las subcategorías.
              </EmptyState>
            )
          }
          return <EmptyState title={`Todavía no hay productos en ${label}`}>Mirá las otras categorías mientras tanto.</EmptyState>
        }}
      </QueryState>
    </>
  )
}

function CategoriesView({ root, path }: { root: CategoryNode; path: string }) {
  const node = path ? findCategory(root, path) : root
  if (!node) return <CategoryNotFound />
  return (
    <div className={styles.layout}>
      <CategoryTree root={root} selected={path} />
      <div className={styles.content}>
        {path ? (
          <CategoryBranch key={node.path} node={node} />
        ) : (
          <>
            <PageHeader title="Categorías" description="Elegí una categoría para ver sus productos." />
            <CategoryTiles categories={root.children} />
          </>
        )}
      </div>
    </div>
  )
}

export function CategoriesPage() {
  const params = useParams()
  const path = (params['*'] ?? '').replace(/\/+$/, '')
  const query = useQuery({ queryKey: keys.categoryTree(), queryFn: () => api.categories.tree() })
  return <QueryState query={query}>{(root) => <CategoriesView root={root} path={path} />}</QueryState>
}
