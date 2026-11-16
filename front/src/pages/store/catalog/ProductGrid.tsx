import type { Product } from '@/api/endpoints'
import { Skeleton } from '@/ui'
import { ProductCard } from './ProductCard'
import styles from './ProductGrid.module.css'

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className={styles.grid}>
      {products.map((product) => (
        <li key={product.code}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  )
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <ul className={styles.grid}>
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <Skeleton height={300} radius="var(--radius)" />
        </li>
      ))}
    </ul>
  )
}
