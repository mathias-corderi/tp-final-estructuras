import { Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product, Quote } from '@/api/endpoints'
import { formatMoney } from '@/lib/format'
import { Price, ProductThumb, QuantityStepper } from '@/ui'
import styles from './CartLineItem.module.css'

interface CartLineItemProps {
  line: Quote['lines'][number]
  /** La del carrito: mientras llega la cotización nueva, `line.quantity` es la anterior. */
  quantity: number
  product?: Product
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

export function CartLineItem({ line, quantity, product, onQuantityChange, onRemove }: CartLineItemProps) {
  return (
    <li className={styles.line}>
      <ProductThumb category={product?.category ?? ''} size="sm" />
      <div className={styles.info}>
        <Link to={`/productos/${line.code}`} className={styles.name}>
          {line.name}
        </Link>
        <Price finalPrice={line.unit_price} price={product?.price ?? line.unit_price} />
      </div>
      <QuantityStepper label={`Cantidad de ${line.name}`} value={quantity} max={product?.stock} onChange={onQuantityChange} />
      <strong className={`${styles.subtotal} tabular`}>{formatMoney(line.subtotal)}</strong>
      <button type="button" className={styles.remove} aria-label={`Quitar ${line.name} del carrito`} onClick={onRemove}>
        <Trash2 size={18} aria-hidden />
      </button>
    </li>
  )
}
