import { useMutation } from '@tanstack/react-query'
import { api, type Product } from '@/api/endpoints'
import { ConfirmDialog, describeError } from '@/ui'
import { FormAlert } from './FormAlert'
import styles from './forms.module.css'
import { PRODUCT_GONE } from './productForm'
import { useCatalogChange } from './useCatalogChange'

export function DeleteProductDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const afterChange = useCatalogChange()
  const remove = useMutation({
    mutationFn: () => api.admin.products.remove(product.code),
    onSuccess: () => {
      afterChange(`Eliminaste ${product.name}`)
      onClose()
    },
  })

  return (
    <ConfirmDialog
      title={`Eliminar ${product.name}`}
      confirmLabel="Eliminar producto"
      danger
      loading={remove.isPending}
      onConfirm={() => remove.mutate()}
      onCancel={onClose}
    >
      <div className={styles.form}>
        <p>Sale del catálogo y de la tienda. Se puede deshacer con el botón Deshacer de esta pantalla.</p>
        <FormAlert>{remove.isError ? describeError(remove.error, { 404: PRODUCT_GONE }) : null}</FormAlert>
      </div>
    </ConfirmDialog>
  )
}
