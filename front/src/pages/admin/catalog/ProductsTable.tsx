import { PackagePlus, Pencil, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Fragment } from 'react'
import type { Product } from '@/api/endpoints'
import { formatMoney, formatNumber } from '@/lib/format'
import { Badge, DataTable, numericCell } from '@/ui'
import { IconAction } from './IconAction'
import { isLowStock } from './productFilters'
import styles from './ProductsTable.module.css'

export type ProductAction = 'edit' | 'restock' | 'adjust' | 'delete'

interface ProductsTableProps {
  products: Product[]
  onAction: (action: ProductAction, product: Product) => void
}

/** La ruta se corta en las barras, nunca en medio de un nombre. */
function CategoryPath({ path }: { path: string }) {
  return path.split('/').map((name, index) => (
    <Fragment key={index}>
      {index > 0 ? <>/<wbr /></> : null}
      {name}
    </Fragment>
  ))
}

function StatusCell({ product }: { product: Product }) {
  return (
    <div className={styles.status}>
      {product.active ? <span className={styles.active}>Activo</span> : <Badge>Inactivo</Badge>}
      {product.stock === 0 ? <Badge tone="danger">Agotado</Badge> : null}
      {product.stock > 0 && isLowStock(product) ? <Badge tone="warning">Stock bajo</Badge> : null}
    </div>
  )
}

export function ProductsTable({ products, onAction }: ProductsTableProps) {
  return (
    <div className={styles.compact}>
      <DataTable caption="Productos del catálogo">
        <thead>
          <tr>
            <th scope="col">Código</th>
            <th scope="col">Producto</th>
            <th scope="col">Categoría</th>
            <th scope="col" className={numericCell}>Precio</th>
            <th scope="col" className={numericCell}>Dto.</th>
            <th scope="col" className={numericCell}>Final</th>
            <th scope="col" className={numericCell}>Stock</th>
            <th scope="col">Estado</th>
            {/* aria-label y no .visually-hidden: lo absoluto se escapa del scroll de la tabla y ensancha la página. */}
            <th scope="col" aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.code} className={product.active ? undefined : styles.inactive}>
              <td className={numericCell}>{product.code}</td>
              <th scope="row" className={styles.product}>
                <span className={styles.name}>{product.name}</span>
                <span className={styles.brand}>{product.brand}</span>
              </th>
              <td className={styles.category}>
                <CategoryPath path={product.category} />
              </td>
              <td className={numericCell}>{formatMoney(product.price)}</td>
              <td className={numericCell}>{product.discount_percent > 0 ? `${formatNumber(product.discount_percent)} %` : '—'}</td>
              <td className={numericCell}>{formatMoney(product.final_price)}</td>
              <td className={numericCell}>
                <span>{product.stock}</span>
                <span className={styles.min}>mín. {product.min_stock}</span>
              </td>
              <td><StatusCell product={product} /></td>
              <td>
                <div className={styles.actions}>
                  <IconAction label={`Editar ${product.name}`} hint="Editar" icon={<Pencil size={17} aria-hidden />} onClick={() => onAction('edit', product)} />
                  <IconAction label={`Reponer stock de ${product.name}`} hint="Reponer stock" icon={<PackagePlus size={17} aria-hidden />} onClick={() => onAction('restock', product)} />
                  <IconAction label={`Ajustar stock de ${product.name}`} hint="Ajustar stock" icon={<SlidersHorizontal size={17} aria-hidden />} onClick={() => onAction('adjust', product)} />
                  <IconAction label={`Eliminar ${product.name}`} hint="Eliminar" danger icon={<Trash2 size={17} aria-hidden />} onClick={() => onAction('delete', product)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}
