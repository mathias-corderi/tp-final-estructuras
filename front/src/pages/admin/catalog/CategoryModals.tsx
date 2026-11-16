import { useMutation } from '@tanstack/react-query'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '@/api/client'
import { api, type CategoryNode } from '@/api/endpoints'
import { categoryLabel, parentCategory } from '@/lib/categories'
import { formatNumber } from '@/lib/format'
import { Button, ConfirmDialog, describeError, Modal, TextField } from '@/ui'
import { FormAlert } from './FormAlert'
import styles from './forms.module.css'
import { useCatalogChange } from './useCatalogChange'

const CATEGORY_GONE = 'Esa categoría ya no existe. Cerrá esta ventana y volvé al árbol.'
const NO_NAME = 'Escribí un nombre'

/** Ubica el error en el campo si la API lo señala o si la pantalla sabe qué significa ese código. */
function readError(error: unknown, field: string, fieldMessages: Partial<Record<number, string>>) {
  if (error instanceof ApiError) {
    const message = error.fields[field] ?? fieldMessages[error.status]
    if (message) return { field: message, general: null }
  }
  return { field: null, general: describeError(error, { 404: CATEGORY_GONE }) }
}

interface FormModalProps {
  title: string
  submitLabel: string
  pending: boolean
  onSubmit: () => void
  onClose: () => void
  children: ReactNode
}

function FormModal({ title, submitLabel, pending, onSubmit, onClose, children }: FormModalProps) {
  const formId = useId()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={pending}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className={styles.form}>
        {children}
      </form>
    </Modal>
  )
}

interface CreateCategoryModalProps {
  /** Sin padre se crea desde la raíz y el campo acepta una ruta completa. */
  parent: string | null
  onCreated: (path: string) => void
  onClose: () => void
}

export function CreateCategoryModal({ parent, onCreated, onClose }: CreateCategoryModalProps) {
  const afterChange = useCatalogChange()
  const [text, setText] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [general, setGeneral] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: (path: string) => api.admin.categories.create(path),
    onSuccess: (node) => {
      afterChange(`Creaste ${node.path}`)
      onCreated(node.path)
      onClose()
    },
    onError: (error) => {
      const problem = readError(error, 'path', { 409: 'Ya existe esa categoría' })
      setFieldError(problem.field)
      setGeneral(problem.general)
    },
  })

  const submit = () => {
    setGeneral(null)
    const parts = text.split('/').map((part) => part.trim())
    if (!text.trim()) setFieldError(NO_NAME)
    else if (parts.some((part) => !part)) setFieldError('Cada parte de la ruta tiene que tener un nombre')
    else {
      setFieldError(null)
      create.mutate([...(parent ? [parent] : []), ...parts].join('/'))
    }
  }

  return (
    <FormModal
      title={parent ? `Nueva subcategoría en ${parent}` : 'Nueva categoría'}
      submitLabel="Crear categoría"
      pending={create.isPending}
      onSubmit={submit}
      onClose={onClose}
    >
      <TextField
        label={parent ? 'Nombre' : 'Ruta'}
        hint={
          parent
            ? 'Con / podés crear varios niveles de una vez.'
            : 'Una categoría o una ruta como Mascotas/Perros/Alimento: se crean los padres que falten.'
        }
        value={text}
        error={fieldError}
        onChange={(event) => setText(event.target.value)}
      />
      <FormAlert>{general}</FormAlert>
    </FormModal>
  )
}

interface NodeModalProps {
  node: CategoryNode
  onClose: () => void
}

export function RenameCategoryModal({ node, onClose }: NodeModalProps) {
  const afterChange = useCatalogChange()
  const [name, setName] = useState(node.name)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [general, setGeneral] = useState<string | null>(null)
  const next = name.trim()
  const nextPath = [parentCategory(node.path), next].filter(Boolean).join('/')

  const rename = useMutation({
    mutationFn: () => api.admin.categories.rename(node.path, next),
    onSuccess: (saved) => {
      afterChange(`Renombraste ${node.path} a ${saved.path}`)
      onClose()
    },
    onError: (error) => {
      const problem = readError(error, 'new_name', { 409: `Ya hay una categoría llamada ${next} en este nivel` })
      setFieldError(problem.field)
      setGeneral(problem.general)
    },
  })

  const submit = () => {
    setGeneral(null)
    if (!next) setFieldError(NO_NAME)
    else if (next.includes('/')) setFieldError('El nombre no puede tener /. Para mover una rama, creá la ruta nueva.')
    else if (next === node.name) onClose()
    else {
      setFieldError(null)
      rename.mutate()
    }
  }

  return (
    <FormModal title={`Renombrar ${node.name}`} submitLabel="Renombrar" pending={rename.isPending} onSubmit={submit} onClose={onClose}>
      <TextField label="Nuevo nombre" value={name} error={fieldError} onChange={(event) => setName(event.target.value)} />
      {next && next !== node.name ? (
        <p className={styles.preview}>
          {node.path} pasa a ser {nextPath}.
        </p>
      ) : null}
      <p className={styles.warning}>Actualiza la categoría de todos los productos de la rama, inactivos incluidos. No se puede deshacer.</p>
      <FormAlert>{general}</FormAlert>
    </FormModal>
  )
}

function BlockedDeleteNotice({ node, onClose }: NodeModalProps) {
  const count = node.children.length
  return (
    <Modal title={`Eliminar ${node.name}`} onClose={onClose} footer={<Button onClick={onClose}>Entendido</Button>}>
      <p>
        {count === 1 ? 'Tiene 1 subcategoría' : `Tiene ${count} subcategorías`}, así que no se puede eliminar. Solo se eliminan las categorías
        vacías: primero eliminá lo que tiene adentro.
      </p>
    </Modal>
  )
}

function ConfirmCategoryDelete({ node, onClose }: NodeModalProps) {
  const afterChange = useCatalogChange()
  const remove = useMutation({
    mutationFn: () => api.admin.categories.remove(node.path),
    onSuccess: () => {
      afterChange(`Eliminaste ${node.path}`)
      onClose()
    },
  })

  return (
    <ConfirmDialog
      title={`Eliminar ${node.name}`}
      confirmLabel="Eliminar categoría"
      danger
      loading={remove.isPending}
      onConfirm={() => remove.mutate()}
      onCancel={onClose}
    >
      <div className={styles.form}>
        <p>
          Se elimina {node.path}. No se puede deshacer.
          {node.product_count === 0 ? ' Si tiene productos inactivos no se va a poder eliminar.' : null}
        </p>
        <FormAlert>
          {remove.isError
            ? describeError(remove.error, {
                404: CATEGORY_GONE,
                409: 'No se puede eliminar: todavía tiene productos o subcategorías. Los productos inactivos también cuentan.',
              })
            : null}
        </FormAlert>
      </div>
    </ConfirmDialog>
  )
}

/** Con subcategorías el pedido no puede prosperar: se avisa antes en lugar de ofrecerlo. */
export function DeleteCategoryDialog({ node, onClose }: NodeModalProps) {
  return node.children.length > 0 ? <BlockedDeleteNotice node={node} onClose={onClose} /> : <ConfirmCategoryDelete node={node} onClose={onClose} />
}

function updatedMessage(count: number): string {
  if (count === 0) return 'Esa categoría no tenía productos para actualizar'
  return count === 1 ? 'Se actualizó 1 producto' : `Se actualizaron ${count} productos`
}

export function AdjustPricesModal({ node, onClose }: NodeModalProps) {
  const afterChange = useCatalogChange()
  const [percent, setPercent] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [general, setGeneral] = useState<string | null>(null)
  const value = Number(percent)
  const valid = percent.trim() !== '' && value >= -90 && value <= 500 && value !== 0
  const scope = `${categoryLabel(node.name)}${node.children.length > 0 ? ' y sus subcategorías' : ''}`

  const adjust = useMutation({
    mutationFn: () => api.admin.categories.adjustPrices(node.path, value),
    onSuccess: ({ updated }) => {
      afterChange(updatedMessage(updated.length))
      onClose()
    },
    onError: (error) => {
      const problem = readError(error, 'percent', {})
      setFieldError(problem.field)
      setGeneral(problem.general)
    },
  })

  const submit = () => {
    setGeneral(null)
    setFieldError(valid ? null : 'Ingresá un porcentaje entre -90 y 500, distinto de 0')
    if (valid) adjust.mutate()
  }

  return (
    <FormModal title={`Ajustar precios de ${node.name}`} submitLabel="Aplicar ajuste" pending={adjust.isPending} onSubmit={submit} onClose={onClose}>
      <TextField
        label="Porcentaje"
        type="number"
        min={-90}
        max={500}
        step="any"
        hint="Positivo para subir, negativo para bajar."
        value={percent}
        error={fieldError}
        onChange={(event) => setPercent(event.target.value)}
      />
      {valid ? (
        <p className={styles.preview} aria-live="polite">
          {value > 0 ? 'Sube' : 'Baja'} {formatNumber(Math.abs(value))} % todos los precios de {scope}, inactivos incluidos.
        </p>
      ) : null}
      <p className={styles.warning}>No se puede deshacer: el botón Deshacer de Productos no revierte este ajuste.</p>
      <FormAlert>{general}</FormAlert>
    </FormModal>
  )
}
