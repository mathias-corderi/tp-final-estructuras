import { useQuery } from '@tanstack/react-query'
import { PackageSearch, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { api, type Product } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { useTitle } from '@/lib/useTitle'
import { Badge, type BadgeTone, Button, EmptyState, LinkButton, Price, ProductThumb, QuantityStepper, QueryState, Skeleton } from '@/ui'
import { CategoryBreadcrumb } from './catalog/CategoryBreadcrumb'
import { discountLabel, parseProductCode } from './catalog/helpers'
import { ProductGrid, ProductGridSkeleton } from './catalog/ProductGrid'
import { useAddToCart } from './catalog/useAddToCart'
import styles from './ProductPage.module.css'

const RELATED_LIMIT = 4

function availability(product: Product): { label: string; tone: BadgeTone } {
  if (product.stock === 0) return { label: 'Agotado', tone: 'danger' }
  if (product.stock <= product.min_stock) return { label: 'Últimas unidades', tone: 'warning' }
  return { label: 'En stock', tone: 'success' }
}

function ProductNotFound() {
  useTitle('Producto no encontrado')
  return (
    <EmptyState icon={<PackageSearch size={28} aria-hidden />} title="No encontramos este producto" action={<LinkButton to="/productos">Ver el catálogo</LinkButton>}>
      Puede que ya no esté a la venta o que el enlace tenga un error.
    </EmptyState>
  )
}

function BuyBox({ product }: { product: Product }) {
  const { remaining, addToCart } = useAddToCart(product)
  const [quantity, setQuantity] = useState(1)

  const add = () => {
    addToCart(quantity)
    setQuantity(1)
  }

  return (
    <div className={styles.buy}>
      {remaining > 0 ? <QuantityStepper value={quantity} onChange={setQuantity} max={remaining} label={`Cantidad de ${product.name}`} /> : null}
      <Button icon={<ShoppingCart size={18} aria-hidden />} disabled={remaining === 0} onClick={add}>
        Agregar al carrito
      </Button>
      {product.stock > 0 && remaining === 0 ? <p className={styles.note}>Ya tenés en el carrito todas las unidades disponibles.</p> : null}
    </div>
  )
}

function RelatedProducts({ product }: { product: Product }) {
  const query = useQuery({
    queryKey: keys.categoryProducts(product.category, true),
    queryFn: () => api.categories.products(product.category),
  })
  return (
    <QueryState query={query} loading={<ProductGridSkeleton count={RELATED_LIMIT} />}>
      {(products) => {
        const others = products.filter((other) => other.code !== product.code).slice(0, RELATED_LIMIT)
        if (others.length === 0) return null
        return (
          <section className={styles.related}>
            <h2>También te puede interesar</h2>
            <ProductGrid products={others} />
          </section>
        )
      }}
    </QueryState>
  )
}

function ProductDetail({ product }: { product: Product }) {
  useTitle(product.name)
  const { label, tone } = availability(product)
  return (
    <>
      <CategoryBreadcrumb path={product.category} />
      <div className={styles.layout}>
        <div className={styles.media}>
          <ProductThumb category={product.category} size="lg" />
        </div>
        <div className={styles.info}>
          <p className={styles.brand}>{product.brand}</p>
          <h1>{product.name}</h1>
          <div className={styles.price}>
            <Price finalPrice={product.final_price} price={product.price} size="lg" />
            {product.discount_percent > 0 ? <Badge tone="accent">{discountLabel(product)}</Badge> : null}
          </div>
          <Badge tone={tone}>{label}</Badge>
          <BuyBox product={product} />
          <p className={styles.code}>Código {product.code}</p>
        </div>
      </div>
      <RelatedProducts product={product} />
    </>
  )
}

function ProductLoader({ code }: { code: number }) {
  const query = useQuery({ queryKey: keys.product(code), queryFn: () => api.products.get(code) })
  if (query.error instanceof ApiError && query.error.status === 404) return <ProductNotFound />
  return (
    <QueryState query={query} loading={<Skeleton height={420} radius="var(--radius-lg)" />}>
      {(product) => <ProductDetail key={product.code} product={product} />}
    </QueryState>
  )
}

export function ProductPage() {
  const { code = '' } = useParams()
  const parsed = parseProductCode(code)
  return parsed === null ? <ProductNotFound /> : <ProductLoader code={parsed} />
}
