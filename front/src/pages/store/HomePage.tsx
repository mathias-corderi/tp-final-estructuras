import { useQuery } from '@tanstack/react-query'
import { ShoppingBasket } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, type Product } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { useTitle } from '@/lib/useTitle'
import { LinkButton, QueryState } from '@/ui'
import { CategoryTiles } from './catalog/CategoryTiles'
import { ProductGrid, ProductGridSkeleton } from './catalog/ProductGrid'
import styles from './HomePage.module.css'

const hasDiscount = (product: Product) => product.discount_percent > 0

/** Un producto con stock por cada categoría principal, para mostrar la variedad del almacén. */
function pickSelection(products: Product[]): Product[] {
  const seen = new Set<string>()
  return products.filter((product) => {
    const mainCategory = product.category.split('/')[0] ?? ''
    if (hasDiscount(product) || product.stock === 0 || seen.has(mainCategory)) return false
    seen.add(mainCategory)
    return true
  })
}

function HomeSection({ title, link, children }: { title: string; link?: ReactNode; children: ReactNode }) {
  const titleId = useId()
  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <div className={styles.sectionHeader}>
        <h2 id={titleId}>{title}</h2>
        {link}
      </div>
      {children}
    </section>
  )
}

export function HomePage() {
  useTitle()
  const categories = useQuery({ queryKey: keys.categoryTree(), queryFn: () => api.categories.tree() })
  const products = useQuery({ queryKey: keys.products('code'), queryFn: () => api.products.list('code') })

  return (
    <>
      <section className={styles.welcome}>
        <ShoppingBasket className={styles.decoration} size={300} strokeWidth={0.9} aria-hidden />
        <h1>Las compras del almacén, sin salir de casa</h1>
        <p>Elegí lo que te falta, armá tu pedido y seguilo desde acá.</p>
        <LinkButton to="/productos" variant="secondary">
          Ver productos
        </LinkButton>
      </section>

      <HomeSection title="Categorías">
        <QueryState query={categories}>{(root) => <CategoryTiles categories={root.children} />}</QueryState>
      </HomeSection>

      <QueryState query={products} loading={<ProductGridSkeleton count={5} />}>
        {(list) => {
          const offers = list.filter(hasDiscount)
          const selection = pickSelection(list)
          return (
            <>
              {offers.length > 0 ? (
                <HomeSection title="Ofertas" link={<Link to="/productos?ofertas=1">Ver todas las ofertas</Link>}>
                  <ProductGrid products={offers} />
                </HomeSection>
              ) : null}
              {selection.length > 0 ? (
                <HomeSection title="Elegidos para vos">
                  <ProductGrid products={selection} />
                </HomeSection>
              ) : null}
            </>
          )
        }}
      </QueryState>
    </>
  )
}
