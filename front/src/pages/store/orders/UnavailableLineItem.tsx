import type { Product, Quote } from '@/api/endpoints'
import { Button, ProductThumb } from '@/ui'
import styles from './CartLineItem.module.css'

interface UnavailableLineItemProps {
  item: Quote['unavailable'][number]
  product?: Product
  onAdjust: (quantity: number) => void
  onRemove: () => void
}

function reasonText({ reason, available }: Quote['unavailable'][number]): string {
  if (reason === 'not_found') return 'Ya no está disponible'
  if (available === 0) return 'Sin stock por ahora'
  return available === 1 ? 'Queda 1' : `Quedan ${available}`
}

export function UnavailableLineItem({ item, product, onAdjust, onRemove }: UnavailableLineItemProps) {
  // La cotización no trae el nombre, y un producto inactivo tampoco está en el catálogo público.
  const name = product?.name ?? `Producto ${item.code}`
  const adjustable = item.reason === 'insufficient_stock' && item.available > 0
  return (
    <li className={styles.unavailable}>
      <ProductThumb category={product?.category ?? ''} size="sm" />
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <p className={styles.reason}>
          <strong className="tabular">{reasonText(item)}</strong>
          {adjustable ? <span className="tabular">Pediste {item.requested}</span> : null}
        </p>
      </div>
      <div className={styles.actions}>
        {adjustable ? (
          <Button size="sm" variant="secondary" onClick={() => onAdjust(item.available)}>
            Ajustar a {item.available}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" aria-label={`Quitar ${name} del carrito`} onClick={onRemove}>
          Quitar
        </Button>
      </div>
    </li>
  )
}
