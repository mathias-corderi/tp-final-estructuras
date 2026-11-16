import { ShoppingCart } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '@/api/endpoints'
import { Badge, Button, Price, ProductThumb } from '@/ui'
import { discountLabel } from './helpers'
import { useAddToCart } from './useAddToCart'
import styles from './ProductCard.module.css'

function AddButton({ product }: { product: Product }) {
  const { remaining, addToCart } = useAddToCart(product)
  if (remaining === 0) {
    return (
      <Button variant="secondary" size="sm" block disabled>
        {product.stock === 0 ? 'Agotado' : 'En tu carrito'}
      </Button>
    )
  }
  return (
    <Button size="sm" block icon={<ShoppingCart size={16} aria-hidden />} aria-label={`Agregar ${product.name} al carrito`} onClick={() => addToCart()}>
      Agregar
    </Button>
  )
}

export function ProductCard({ product }: { product: Product }) {
  const titleId = useId()
  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.media}>
        <ProductThumb category={product.category} />
        {product.discount_percent > 0 ? (
          <span className={styles.badge}>
            <Badge tone="accent">{discountLabel(product)}</Badge>
          </span>
        ) : null}
      </div>
      <div className={styles.body}>
        <h3 id={titleId} className={styles.name}>
          <Link to={`/productos/${product.code}`}>{product.name}</Link>
        </h3>
        <p className={styles.brand}>{product.brand}</p>
        <div className={styles.footer}>
          <Price finalPrice={product.final_price} price={product.price} />
          <div className={styles.action}>
            <AddButton product={product} />
          </div>
        </div>
      </div>
    </article>
  )
}
