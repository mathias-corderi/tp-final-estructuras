import { Link } from 'react-router-dom'
import { categoryLabel, categoryUrl } from '@/lib/categories'
import styles from './CategoryBreadcrumb.module.css'

interface CategoryBreadcrumbProps {
  path: string
  /** En la pantalla de categorías: arranca en "Categorías" y el último nivel es donde ya se está. */
  browsing?: boolean
}

export function CategoryBreadcrumb({ path, browsing = false }: CategoryBreadcrumbProps) {
  const names = path.split('/')
  return (
    <nav aria-label="Ruta de categorías">
      <ol className={styles.trail}>
        {browsing ? (
          <li>
            <Link to="/categorias">Categorías</Link>
          </li>
        ) : null}
        {names.map((name, index) => {
          const label = categoryLabel(name)
          const isCurrent = browsing && index === names.length - 1
          return (
            <li key={index}>
              {isCurrent ? <span aria-current="page">{label}</span> : <Link to={categoryUrl(names.slice(0, index + 1).join('/'))}>{label}</Link>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
