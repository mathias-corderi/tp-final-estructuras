import type { BestSeller } from '@/api/endpoints'
import { formatNumber } from '@/lib/format'
import { useMoney } from './useMoney'
import styles from './BestSellerRanking.module.css'

/** Ranking por unidades. Los números están escritos en cada fila: la barra solo ayuda a comparar. */
export function BestSellerRanking({ items }: { items: BestSeller[] }) {
  const money = useMoney()
  const most = Math.max(...items.map((item) => item.units_sold))

  return (
    <ol className={styles.list} aria-label="Ranking de más vendidos">
      {items.map((item, index) => (
        <li key={item.code} className={styles.item}>
          <span className={`${styles.rank} tabular`}>{index + 1}</span>
          <div className={styles.body}>
            <div className={styles.head}>
              <span className={styles.name}>{item.name}</span>
              <span className={`${styles.values} tabular`}>
                <strong>{formatNumber(item.units_sold)} u.</strong> · {money(item.revenue)}
              </span>
            </div>
            <div className={styles.track} aria-hidden>
              <div className={styles.bar} style={{ width: `${(item.units_sold / most) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
