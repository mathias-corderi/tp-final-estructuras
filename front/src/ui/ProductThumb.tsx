import { categoryVisual } from '@/lib/categories'
import styles from './ProductThumb.module.css'

interface ProductThumbProps {
  category: string
  size?: 'sm' | 'md' | 'lg'
}

/** La API no tiene fotos de productos: cada uno se ilustra con el ícono y el color de su categoría. */
export function ProductThumb({ category, size = 'md' }: ProductThumbProps) {
  const { Icon, tone } = categoryVisual(category)
  const iconSize = { sm: 22, md: 52, lg: 96 }[size]
  return (
    <div className={`${styles.thumb} ${styles[size]} ${styles[tone]}`} aria-hidden>
      <Icon size={iconSize} strokeWidth={1.5} />
    </div>
  )
}
