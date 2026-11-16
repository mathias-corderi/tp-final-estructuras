import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { EmptyState, QueryState, SelectField } from '@/ui'
import { BestSellerRanking } from './BestSellerRanking'
import { Panel } from './Panel'
import { adminQueries } from './queries'
import styles from './reports.module.css'

const LIMITS = [5, 10, 20]

export function BestSellersReport() {
  const [limit, setLimit] = useState(10)
  const bestSellers = useQuery({ ...adminQueries.bestSellers(limit), placeholderData: keepPreviousData })

  return (
    <div className={styles.section}>
      <div className={styles.toolbar}>
        <p className={styles.note}>Cuenta solo pedidos entregados, ordenados por unidades.</p>
        <div className={styles.limit}>
          <SelectField label="Cantidad" value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
            {LIMITS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <Panel title="Ranking">
        <QueryState query={bestSellers}>
          {(items) =>
            items.length === 0 ? <EmptyState title="Todavía no hay ventas">Acá aparecen los pedidos entregados.</EmptyState> : <BestSellerRanking items={items} />
          }
        </QueryState>
      </Panel>
    </div>
  )
}
