import { formatMoney } from '@/lib/format'
import styles from './Price.module.css'

interface PriceProps {
  finalPrice: number
  price: number
  size?: 'md' | 'lg'
}

/** Precio final y, si hay descuento, el de lista tachado. */
export function Price({ finalPrice, price, size = 'md' }: PriceProps) {
  const discounted = finalPrice < price
  return (
    <span className={`${styles.price} ${styles[size]}`}>
      <strong className="tabular">{formatMoney(finalPrice)}</strong>
      {discounted ? (
        <s className="tabular">
          <span className="visually-hidden">Antes: </span>
          {formatMoney(price)}
        </s>
      ) : null}
    </span>
  )
}
