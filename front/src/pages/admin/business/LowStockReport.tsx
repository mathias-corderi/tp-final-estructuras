import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { DataTable, EmptyState, numericCell, QueryState } from '@/ui'
import { adminQueries } from './queries'
import styles from './reports.module.css'

export function LowStockReport() {
  const lowStock = useQuery(adminQueries.lowStock())

  return (
    <div className={styles.section}>
      <div className={styles.toolbar}>
        <p className={styles.note}>Productos activos con stock igual o menor a su mínimo, de menor a mayor stock.</p>
        <Link to="/admin/productos">Ir a productos para reponer</Link>
      </div>
      <QueryState query={lowStock}>
        {(products) =>
          products.length === 0 ? (
            <EmptyState title="No hay productos con stock bajo">Todos los productos activos están por encima de su mínimo.</EmptyState>
          ) : (
            <DataTable caption="Productos con stock bajo">
              <thead>
                <tr>
                  <th scope="col">Código</th>
                  <th scope="col">Producto</th>
                  <th scope="col" className={numericCell}>
                    Stock
                  </th>
                  <th scope="col" className={numericCell}>
                    Mínimo
                  </th>
                  <th scope="col">Marca</th>
                  <th scope="col">Categoría</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.code}>
                    <td className="tabular">{product.code}</td>
                    <td>{product.name}</td>
                    <td className={numericCell}>{product.stock}</td>
                    <td className={numericCell}>{product.min_stock}</td>
                    <td>{product.brand}</td>
                    <td>{product.category}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )
        }
      </QueryState>
    </div>
  )
}
