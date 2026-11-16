import { useQuery } from '@tanstack/react-query'
import { DataTable, numericCell, QueryState, Stat } from '@/ui'
import panelStyles from './Panel.module.css'
import { adminQueries } from './queries'
import styles from './reports.module.css'
import { useMoney } from './useMoney'

const INDENT = 16

function TheoreticalMinimum({ productCount, failed }: { productCount?: number; failed: boolean }) {
  if (failed) return <>Mínimo teórico no disponible.</>
  if (productCount === undefined) return null
  return (
    <>
      Mínimo teórico: ⌈log2({productCount} + 1)⌉ = {Math.ceil(Math.log2(productCount + 1))}.
    </>
  )
}

function CategoryPath({ path }: { path: string }) {
  const parents = path.split('/')
  const leaf = parents.pop()
  return (
    <span className={styles.path} style={{ paddingLeft: `${parents.length * INDENT}px` }}>
      {/* <wbr>: en pantallas chicas la ruta corta en las barras y deja ver los números. */}
      {parents.map((parent, level) => (
        <span key={level} className={styles.pathParent}>
          {parent}/<wbr />
        </span>
      ))}
      <span className={styles.pathLeaf}>{leaf}</span>
    </span>
  )
}

export function CategoriesReport() {
  const report = useQuery(adminQueries.categories())
  const summary = useQuery(adminQueries.summary())
  const money = useMoney()
  const minimum = <TheoreticalMinimum productCount={summary.data?.product_count} failed={summary.isError} />

  return (
    <QueryState query={report}>
      {(data) => (
        <div className={styles.section}>
          <ul className={`${styles.bareList} ${styles.statItems} ${panelStyles.stats}`} aria-label="Estructuras del catálogo">
            <li>
              <Stat label="Profundidad del árbol de categorías" value={data.tree_depth} hint="Niveles de categorías debajo de la raíz." />
            </li>
            <li>
              <Stat label="BST por código" value={data.bst_height_by_code} hint={<>Niveles de la raíz a la hoja más lejana. {minimum}</>} />
            </li>
            <li>
              <Stat label="BST por nombre" value={data.bst_height_by_name} hint={<>Niveles de la raíz a la hoja más lejana. {minimum}</>} />
            </li>
          </ul>
          <p className={styles.note}>
            Cuanto más cerca del mínimo esté la altura, menos comparaciones hace una búsqueda en el peor caso. Cada categoría cuenta todo su
            subárbol, inactivos incluidos.
          </p>
          <DataTable caption="Categorías con productos y valor de stock">
            <thead>
              <tr>
                <th scope="col">Categoría</th>
                <th scope="col" className={numericCell}>
                  Productos
                </th>
                <th scope="col" className={numericCell}>
                  Valor de stock
                </th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((category) => (
                <tr key={category.path}>
                  <td>
                    <CategoryPath path={category.path} />
                  </td>
                  <td className={numericCell}>{category.product_count}</td>
                  <td className={numericCell}>{money(category.stock_value)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}
    </QueryState>
  )
}
