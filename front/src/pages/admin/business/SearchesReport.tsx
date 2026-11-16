import { useQuery } from '@tanstack/react-query'
import { EmptyState, QueryState } from '@/ui'
import { Panel } from './Panel'
import { adminQueries } from './queries'
import styles from './reports.module.css'

export function SearchesReport() {
  const searches = useQuery(adminQueries.searches())

  return (
    <QueryState query={searches}>
      {({ recent, top_terms: topTerms }) =>
        recent.length === 0 ? (
          <EmptyState title="Todavía no hay búsquedas">Acá aparece lo que buscan los clientes en la tienda.</EmptyState>
        ) : (
          <div className={styles.section}>
            <p className={styles.note}>Solo cuentan las búsquedas que siguen en el historial. Su tamaño se cambia en Configuración.</p>
            <div className={styles.columns}>
              <Panel title="Recientes">
                <ol className={`${styles.bareList} ${styles.terms}`} aria-label="Búsquedas recientes">
                  {/* Un término se puede repetir: la posición es lo único que identifica a cada búsqueda. */}
                  {recent.map((term, position) => (
                    <li key={position} className={styles.term}>
                      {term}
                    </li>
                  ))}
                </ol>
              </Panel>
              <Panel title="Más buscados">
                <ol className={`${styles.bareList} ${styles.terms}`} aria-label="Términos más buscados">
                  {topTerms.map(({ term, count }) => (
                    <li key={term} className={styles.term}>
                      <span>{term}</span>
                      <span className={`${styles.termCount} tabular`}>{count}</span>
                    </li>
                  ))}
                </ol>
              </Panel>
            </div>
          </div>
        )
      }
    </QueryState>
  )
}
