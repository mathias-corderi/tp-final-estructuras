import { ChevronRight, FolderPlus, Pencil, Percent, Trash2 } from 'lucide-react'
import type { CategoryNode } from '@/api/endpoints'
import { categoryLabel } from '@/lib/categories'
import { IconAction } from './IconAction'
import styles from './CategoryTree.module.css'

export type CategoryAction = 'add' | 'rename' | 'prices' | 'delete'

interface TreeHandlers {
  collapsed: ReadonlySet<string>
  onToggle: (path: string) => void
  onAction: (action: CategoryAction, node: CategoryNode) => void
}

const activeCount = (count: number) => (count === 1 ? '1 producto activo' : `${count} productos activos`)

function CategoryItem({ node, ...handlers }: TreeHandlers & { node: CategoryNode }) {
  const { collapsed, onToggle, onAction } = handlers
  const hasChildren = node.children.length > 0
  const expanded = hasChildren && !collapsed.has(node.path)
  const translation = categoryLabel(node.name)

  return (
    <li>
      <div role="group" aria-label={node.path} className={styles.row}>
        <div className={styles.title}>
          {hasChildren ? (
            <button
              type="button"
              className={styles.toggle}
              aria-expanded={expanded}
              aria-label={`${expanded ? 'Contraer' : 'Expandir'} ${node.path}`}
              onClick={() => onToggle(node.path)}
            >
              <ChevronRight size={18} className={expanded ? styles.open : undefined} aria-hidden />
            </button>
          ) : (
            <span className={styles.spacer} />
          )}
          <span className={styles.name}>{node.name}</span>
          {translation !== node.name ? <span className={styles.translation}>{translation}</span> : null}
        </div>
        <div className={styles.meta}>
          <span className={styles.count}>{activeCount(node.product_count)}</span>
          <div className={styles.actions}>
            <IconAction label={`Agregar subcategoría a ${node.path}`} hint="Agregar subcategoría" icon={<FolderPlus size={17} aria-hidden />} onClick={() => onAction('add', node)} />
            <IconAction label={`Renombrar ${node.path}`} hint="Renombrar" icon={<Pencil size={17} aria-hidden />} onClick={() => onAction('rename', node)} />
            <IconAction label={`Ajustar precios de ${node.path}`} hint="Ajustar precios" icon={<Percent size={17} aria-hidden />} onClick={() => onAction('prices', node)} />
            <IconAction label={`Eliminar ${node.path}`} hint="Eliminar" danger icon={<Trash2 size={17} aria-hidden />} onClick={() => onAction('delete', node)} />
          </div>
        </div>
      </div>
      {expanded ? <CategoryTree nodes={node.children} {...handlers} /> : null}
    </li>
  )
}

/** Lista anidada con botones de expandir: se recorre con Tab, sin el teclado especial de role="tree". */
export function CategoryTree({ nodes, ...handlers }: TreeHandlers & { nodes: CategoryNode[] }) {
  return (
    <ul className={styles.tree}>
      {nodes.map((node) => (
        <CategoryItem key={node.path} node={node} {...handlers} />
      ))}
    </ul>
  )
}
