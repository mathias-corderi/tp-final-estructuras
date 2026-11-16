import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { api, type CategoryNode } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { parentCategory } from '@/lib/categories'
import { Button, EmptyState, PageHeader, QueryState } from '@/ui'
import { AdjustPricesModal, CreateCategoryModal, DeleteCategoryDialog, RenameCategoryModal } from './catalog/CategoryModals'
import { CategoryTree, type CategoryAction } from './catalog/CategoryTree'
import styles from './AdminCategoriesPage.module.css'

type OpenDialog = { action: 'create' } | { action: CategoryAction; node: CategoryNode } | null

export function AdminCategoriesPage() {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const tree = useQuery({ queryKey: keys.categoryTree(), queryFn: api.categories.tree })

  const closeDialog = () => setDialog(null)
  const openCreate = () => setDialog({ action: 'create' })

  const toggle = (path: string) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(path)) next.add(path)
      return next
    })

  /** Abre la rama de lo recién creado, para que no quede escondido. */
  const reveal = (path: string) =>
    setCollapsed((current) => {
      const next = new Set(current)
      for (let ancestor = parentCategory(path); ancestor; ancestor = parentCategory(ancestor)) next.delete(ancestor)
      return next
    })

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Los números cuentan solo productos activos, sumando las subcategorías."
        actions={
          tree.isSuccess ? (
            <Button icon={<Plus size={18} aria-hidden />} onClick={openCreate}>
              Nueva categoría
            </Button>
          ) : null
        }
      />
      <QueryState query={tree}>
        {(root) =>
          root.children.length > 0 ? (
            <>
              <p className={styles.note}>Los cambios de categorías no se pueden deshacer.</p>
              <div className={styles.tree}>
                <CategoryTree nodes={root.children} collapsed={collapsed} onToggle={toggle} onAction={(action, node) => setDialog({ action, node })} />
              </div>
            </>
          ) : (
            <EmptyState title="Todavía no hay categorías" />
          )
        }
      </QueryState>
      {dialog?.action === 'create' ? <CreateCategoryModal parent={null} onCreated={reveal} onClose={closeDialog} /> : null}
      {dialog?.action === 'add' ? <CreateCategoryModal parent={dialog.node.path} onCreated={reveal} onClose={closeDialog} /> : null}
      {dialog?.action === 'rename' ? <RenameCategoryModal node={dialog.node} onClose={closeDialog} /> : null}
      {dialog?.action === 'delete' ? <DeleteCategoryDialog node={dialog.node} onClose={closeDialog} /> : null}
      {dialog?.action === 'prices' ? <AdjustPricesModal node={dialog.node} onClose={closeDialog} /> : null}
    </div>
  )
}
