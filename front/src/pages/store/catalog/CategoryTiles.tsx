import { Link } from 'react-router-dom'
import type { CategoryNode } from '@/api/endpoints'
import { categoryLabel, categoryUrl, categoryVisual } from '@/lib/categories'
import { productCount } from './helpers'
import styles from './CategoryTiles.module.css'

export function CategoryTiles({ categories }: { categories: CategoryNode[] }) {
  return (
    <ul className={styles.tiles} aria-label="Categorías principales">
      {categories.map((category) => {
        const { Icon, tone } = categoryVisual(category.path)
        const label = categoryLabel(category.name)
        const count = productCount(category.product_count)
        return (
          <li key={category.path}>
            <Link to={categoryUrl(category.path)} className={`${styles.tile} ${styles[tone]}`} aria-label={`${label}, ${count}`}>
              <Icon size={30} strokeWidth={1.6} aria-hidden />
              <span className={styles.name}>{label}</span>
              <span className={styles.count}>{count}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
