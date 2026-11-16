import { ChevronDown, ChevronRight, ListTree } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { CategoryNode } from '@/api/endpoints'
import { categoryLabel, categoryUrl } from '@/lib/categories'
import { productCount } from './helpers'
import styles from './CategoryTree.module.css'

interface BranchProps {
  nodes: CategoryNode[]
  selected: string
  /** Lo que el cliente abrió o cerró a mano; el resto sigue a la categoría elegida. */
  manual: Record<string, boolean>
  onToggle: (path: string, open: boolean) => void
  onSelect: (path: string) => void
}

function Branch({ nodes, selected, manual, onToggle, onSelect }: BranchProps) {
  return (
    <ul className={styles.branch}>
      {nodes.map((node) => {
        const label = categoryLabel(node.name)
        const hasChildren = node.children.length > 0
        const onSelectedBranch = selected === node.path || selected.startsWith(`${node.path}/`)
        const open = manual[node.path] ?? onSelectedBranch
        return (
          <li key={node.path}>
            <div className={styles.row}>
              {hasChildren ? (
                <button
                  type="button"
                  className={styles.expander}
                  aria-expanded={open}
                  aria-label={`${open ? 'Contraer' : 'Expandir'} ${label}`}
                  onClick={() => onToggle(node.path, !open)}
                >
                  <ChevronRight size={16} className={open ? styles.rotated : undefined} aria-hidden />
                </button>
              ) : (
                <span className={styles.spacer} />
              )}
              <Link
                to={categoryUrl(node.path)}
                className={styles.link}
                aria-label={`${label}, ${productCount(node.product_count)}`}
                aria-current={selected === node.path ? 'page' : undefined}
                onClick={() => onSelect(node.path)}
              >
                <span className={styles.label}>{label}</span>
                <span className={styles.count}>{node.product_count}</span>
              </Link>
            </div>
            {hasChildren && open ? <Branch nodes={node.children} selected={selected} manual={manual} onToggle={onToggle} onSelect={onSelect} /> : null}
          </li>
        )
      })}
    </ul>
  )
}

export function CategoryTree({ root, selected }: { root: CategoryNode; selected: string }) {
  const [manual, setManual] = useState<Record<string, boolean>>({})
  const [openOnMobile, setOpenOnMobile] = useState(false)

  const toggle = (path: string, open: boolean) => setManual((current) => ({ ...current, [path]: open }))
  const select = (path: string) => {
    toggle(path, true)
    setOpenOnMobile(false)
  }

  return (
    <nav aria-label="Categorías" className={styles.tree}>
      <button type="button" className={styles.mobileToggle} aria-expanded={openOnMobile} onClick={() => setOpenOnMobile(!openOnMobile)}>
        <ListTree size={18} aria-hidden />
        Explorar categorías
        <ChevronDown size={18} className={openOnMobile ? styles.flipped : undefined} aria-hidden />
      </button>
      <div className={openOnMobile ? undefined : styles.closedOnMobile}>
        <Branch nodes={root.children} selected={selected} manual={manual} onToggle={toggle} onSelect={select} />
      </div>
    </nav>
  )
}
