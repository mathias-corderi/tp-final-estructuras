import { useMutation, useQuery } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { api, type Product } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { flattenCategories } from '@/lib/categories'
import { Button, Checkbox, describeError, Modal, SelectField, TextField, useToast } from '@/ui'
import { FormAlert } from './FormAlert'
import styles from './forms.module.css'
import {
  changedFields,
  EMPTY_PRODUCT_FORM,
  readServerError,
  toProductCreate,
  validateProduct,
  valuesFromProduct,
  type ProductField,
  type ProductFormErrors,
  type ProductFormValues,
} from './productForm'
import { useCatalogChange } from './useCatalogChange'

// Un <option> no acepta padding: la sangría tiene que ser parte del texto.
const INDENT = '   '

interface ProductFormModalProps {
  /** Sin producto es un alta. */
  product?: Product
  onClose: () => void
}

export function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const editing = product !== undefined
  const formId = useId()
  const toast = useToast()
  const afterChange = useCatalogChange()
  const [values, setValues] = useState<ProductFormValues>(() => (product ? valuesFromProduct(product) : EMPTY_PRODUCT_FORM))
  const [errors, setErrors] = useState<ProductFormErrors>({})
  const [general, setGeneral] = useState<string | null>(null)

  const categories = useQuery({ queryKey: keys.categoryTree(), queryFn: api.categories.tree })
  const settings = useQuery({ queryKey: keys.admin.settings(), queryFn: api.admin.settings.get, enabled: !editing })

  const save = useMutation({
    mutationFn: (send: () => Promise<Product>) => send(),
    onSuccess: (saved) => {
      afterChange(editing ? `Guardaste los cambios de ${saved.name}` : `Agregaste ${saved.name}`)
      onClose()
    },
    onError: (error) => {
      const problem = readServerError(error, values, editing)
      setErrors(problem.fields)
      setGeneral(problem.general)
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const problems = validateProduct(values, editing)
    setErrors(problems)
    setGeneral(null)
    if (Object.keys(problems).length > 0) return
    if (!product) {
      save.mutate(() => api.admin.products.create(toProductCreate(values)))
      return
    }
    const changes = changedFields(product, values)
    if (Object.keys(changes).length > 0) {
      save.mutate(() => api.admin.products.update(product.code, changes))
    } else {
      toast.success('No había cambios para guardar')
      onClose()
    }
  }

  const bind = (field: ProductField) => ({
    value: values[field] as string,
    error: errors[field],
    onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [field]: event.target.value })),
  })

  const options = categories.data ? flattenCategories(categories.data) : []
  const currentIsListed = options.some((option) => option.path === values.category)
  const defaultMinStock = settings.data ? ` (${settings.data.default_min_stock})` : ''

  return (
    <Modal
      side
      title={product ? `Editar ${product.name}` : 'Nuevo producto'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={save.isPending}>
            {editing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className={styles.form}>
        {product ? (
          <p className={styles.context}>
            Código {product.code} · Stock {product.stock}. El código no se cambia, y el stock se corrige con Reponer o Ajustar.
          </p>
        ) : null}
        {editing ? null : <TextField label="Código" type="number" min={1} step={1} {...bind('code')} />}
        <TextField label="Nombre" {...bind('name')} />
        <TextField label="Marca" {...bind('brand')} />
        <div className={styles.row}>
          <TextField label="Precio" type="number" min={0} step="any" {...bind('price')} />
          {editing ? null : <TextField label="Stock inicial" type="number" min={0} step={1} {...bind('stock')} />}
          <TextField label="Descuento (%)" type="number" min={0} max={90} step="any" {...bind('discount_percent')} />
          <TextField
            label="Stock mínimo"
            type="number"
            min={0}
            step={1}
            hint={editing ? undefined : `Si lo dejás vacío se usa el de la tienda${defaultMinStock}.`}
            {...bind('min_stock')}
          />
        </div>
        <SelectField
          label="Categoría"
          hint={categories.isError ? describeError(categories.error) : undefined}
          {...bind('category')}
        >
          {editing ? null : <option value="">{categories.isPending ? 'Cargando categorías…' : 'Elegí una categoría'}</option>}
          {options.map(({ path, depth }) => (
            <option key={path} value={path}>
              {INDENT.repeat(depth)}
              {path}
            </option>
          ))}
          {values.category && !currentIsListed ? <option value={values.category}>{values.category}</option> : null}
        </SelectField>
        <Checkbox
          label="Activo: los clientes lo ven en la tienda"
          checked={values.active}
          onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))}
        />
        <FormAlert>{general}</FormAlert>
      </form>
    </Modal>
  )
}
