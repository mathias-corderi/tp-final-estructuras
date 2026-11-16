import { useMutation } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { ApiError } from '@/api/client'
import { api, type Product } from '@/api/endpoints'
import { Button, describeError, Modal, TextField } from '@/ui'
import { FormAlert } from './FormAlert'
import styles from './forms.module.css'
import { PRODUCT_GONE } from './productForm'
import { useCatalogChange } from './useCatalogChange'

interface StockModalProps {
  product: Product
  onClose: () => void
}

const isWhole = (text: string) => text.trim() !== '' && Number.isSafeInteger(Number(text))
const units = (count: number) => (count === 1 ? '1 unidad' : `${count} unidades`)
const fieldsOf = (error: unknown) => (error instanceof ApiError ? error.fields : {})

function StockFacts({ current, afterLabel, after }: { current: number; afterLabel: string; after: number | null }) {
  return (
    <dl className={styles.stockFacts}>
      <div>
        <dt>Stock actual</dt>
        <dd>{current}</dd>
      </div>
      <div>
        <dt>{afterLabel}</dt>
        <dd>{after ?? '—'}</dd>
      </div>
    </dl>
  )
}

function StockFooter({ formId, label, pending, onClose }: { formId: string; label: string; pending: boolean; onClose: () => void }) {
  return (
    <>
      <Button variant="secondary" onClick={onClose} disabled={pending}>
        Cancelar
      </Button>
      <Button type="submit" form={formId} loading={pending}>
        {label}
      </Button>
    </>
  )
}

export function RestockModal({ product, onClose }: StockModalProps) {
  const formId = useId()
  const afterChange = useCatalogChange()
  const [quantity, setQuantity] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [general, setGeneral] = useState<string | null>(null)
  const valid = isWhole(quantity) && Number(quantity) > 0

  const restock = useMutation({
    mutationFn: () => api.admin.products.restock(product.code, Number(quantity)),
    onSuccess: (saved) => {
      afterChange(`Repusiste ${saved.name}: ahora hay ${units(saved.stock)}`)
      onClose()
    },
    onError: (error) => {
      const { quantity: problem } = fieldsOf(error)
      if (problem) setFieldError(problem)
      else setGeneral(describeError(error, { 404: PRODUCT_GONE }))
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setGeneral(null)
    setFieldError(valid ? null : 'Ingresá una cantidad entera mayor a 0')
    if (valid) restock.mutate()
  }

  return (
    <Modal
      title={`Reponer stock de ${product.name}`}
      onClose={onClose}
      footer={<StockFooter formId={formId} label="Reponer" pending={restock.isPending} onClose={onClose} />}
    >
      <form id={formId} onSubmit={submit} noValidate className={styles.form}>
        <StockFacts current={product.stock} afterLabel="Después de reponer" after={valid ? product.stock + Number(quantity) : null} />
        <TextField
          label="Cantidad a reponer"
          type="number"
          min={1}
          step={1}
          value={quantity}
          error={fieldError}
          onChange={(event) => setQuantity(event.target.value)}
        />
        <FormAlert>{general}</FormAlert>
      </form>
    </Modal>
  )
}

interface AdjustErrors {
  delta?: string
  reason?: string
}

export function AdjustStockModal({ product, onClose }: StockModalProps) {
  const formId = useId()
  const afterChange = useCatalogChange()
  const [delta, setDelta] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<AdjustErrors>({})
  const [general, setGeneral] = useState<string | null>(null)
  const validDelta = isWhole(delta) && Number(delta) !== 0

  const adjust = useMutation({
    mutationFn: () => api.admin.products.adjustStock(product.code, Number(delta), reason.trim()),
    onSuccess: (saved) => {
      afterChange(`Ajustaste ${saved.name}: ahora hay ${units(saved.stock)}`)
      onClose()
    },
    onError: (error) => {
      const { delta: deltaProblem, reason: reasonProblem } = fieldsOf(error)
      if (deltaProblem || reasonProblem) setErrors({ delta: deltaProblem, reason: reasonProblem })
      else setGeneral(describeError(error, { 404: PRODUCT_GONE, 409: 'No alcanza el stock: el ajuste lo dejaría en negativo.' }))
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const problems: AdjustErrors = {}
    if (!validDelta) problems.delta = 'Ingresá un entero distinto de 0'
    if (!reason.trim()) problems.reason = 'Contá por qué se ajusta'
    setErrors(problems)
    setGeneral(null)
    if (Object.keys(problems).length === 0) adjust.mutate()
  }

  return (
    <Modal
      title={`Ajustar stock de ${product.name}`}
      onClose={onClose}
      footer={<StockFooter formId={formId} label="Ajustar stock" pending={adjust.isPending} onClose={onClose} />}
    >
      <form id={formId} onSubmit={submit} noValidate className={styles.form}>
        <StockFacts current={product.stock} afterLabel="Después del ajuste" after={validDelta ? product.stock + Number(delta) : null} />
        <TextField
          label="Unidades a sumar o restar"
          type="number"
          step={1}
          hint="Positivo para sumar, negativo para restar."
          value={delta}
          error={errors.delta}
          onChange={(event) => setDelta(event.target.value)}
        />
        <TextField
          label="Motivo"
          hint="Por ejemplo: rotura o conteo de inventario."
          value={reason}
          error={errors.reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <FormAlert>{general}</FormAlert>
      </form>
    </Modal>
  )
}
