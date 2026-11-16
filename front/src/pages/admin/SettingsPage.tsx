import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '@/api/client'
import { api, type Settings, type SettingsUpdate } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { config } from '@/config'
import { Button, Card, PageHeader, QueryState, TextField, useToast } from '@/ui'
import { adminQueries } from './business/queries'
import styles from './SettingsPage.module.css'

const FIELDS = ['store_name', 'currency', 'default_min_stock', 'search_history_size'] as const
type Field = (typeof FIELDS)[number]
type Values = Record<Field, string>
type Errors = Partial<Record<Field, string>>

const toValues = (settings: Settings): Values => ({
  store_name: settings.store_name,
  currency: settings.currency,
  default_min_stock: String(settings.default_min_stock),
  search_history_size: String(settings.search_history_size),
})

/** Un campo numérico vacío da NaN, no 0: así cuenta como cambio y lo frena la validación. */
const toNumber = (text: string) => (text.trim() === '' ? Number.NaN : Number(text))

const normalize = (values: Values): Settings => ({
  store_name: values.store_name.trim(),
  currency: values.currency.trim().toUpperCase(),
  default_min_stock: toNumber(values.default_min_stock),
  search_history_size: toNumber(values.search_history_size),
})

function validate({ store_name: name, currency, default_min_stock: minStock, search_history_size: historySize }: Settings): Errors {
  const errors: Errors = {}
  if (!name) errors.store_name = 'Escribí el nombre de la tienda.'
  if (!/^[A-Z]{3}$/.test(currency)) errors.currency = 'Tienen que ser 3 letras, por ejemplo ARS.'
  if (!Number.isSafeInteger(minStock) || minStock < 0) errors.default_min_stock = 'Tiene que ser un número entero, 0 o más.'
  if (!Number.isInteger(historySize) || historySize < 1 || historySize > 100) {
    errors.search_history_size = 'Tiene que ser un número entero entre 1 y 100.'
  }
  return errors
}

/** El PATCH lleva solo lo que cambió: un body vacío da 422. */
function changesBetween(saved: Settings, next: Settings): SettingsUpdate {
  return Object.fromEntries(FIELDS.filter((field) => next[field] !== saved[field]).map((field) => [field, next[field]]))
}

function SettingsForm({ settings }: { settings: Settings }) {
  const [values, setValues] = useState(() => toValues(settings))
  const [errors, setErrors] = useState<Errors>({})
  const toast = useToast()
  const queryClient = useQueryClient()

  const next = normalize(values)
  const changes = changesBetween(settings, next)
  const hasChanges = Object.keys(changes).length > 0

  const save = useMutation({
    mutationFn: (update: SettingsUpdate) => api.admin.settings.update(update),
    onSuccess: async (saved) => {
      setValues(toValues(saved))
      // Al toque, para que el formulario no parezca seguir con cambios mientras se recarga.
      queryClient.setQueryData(keys.admin.settings(), saved)
      toast.success('Guardamos la configuración.')
      await queryClient.invalidateQueries()
    },
    onError: (error) => {
      const known = error instanceof ApiError ? FIELDS.filter((field) => field in error.fields) : []
      if (error instanceof ApiError && known.length > 0) {
        setErrors(Object.fromEntries(known.map((field) => [field, error.fields[field]])))
      } else {
        toast.error(error)
      }
    },
  })

  const edit = (field: Field, text: string) => {
    setValues((current) => ({ ...current, [field]: text }))
    setErrors(({ [field]: _fixed, ...rest }) => rest)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!hasChanges) return
    const problems = validate(next)
    setErrors(problems)
    if (Object.keys(problems).length === 0) save.mutate(changes)
  }

  return (
    <Card>
      <form className={styles.form} aria-label="Configuración de la tienda" noValidate onSubmit={submit}>
        <TextField
          label="Nombre de la tienda"
          value={values.store_name}
          error={errors.store_name}
          hint="Encabeza el catálogo exportado."
          onChange={(event) => edit('store_name', event.target.value)}
        />
        <TextField
          label="Moneda"
          value={values.currency}
          error={errors.currency}
          maxLength={3}
          autoCapitalize="characters"
          hint="3 letras, por ejemplo ARS o USD. Se guarda en mayúsculas. Cambia cómo se muestran los montos, no los convierte."
          onChange={(event) => edit('currency', event.target.value)}
        />
        <TextField
          label="Stock mínimo por defecto"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={values.default_min_stock}
          error={errors.default_min_stock}
          hint="Se usa en los productos nuevos que no indican un mínimo."
          onChange={(event) => edit('default_min_stock', event.target.value)}
        />
        <TextField
          label="Tamaño del historial"
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          step={1}
          value={values.search_history_size}
          error={errors.search_history_size}
          hint="Cuántas búsquedas se recuerdan, de 1 a 100. Si lo achicás, se borran las búsquedas más viejas."
          onChange={(event) => edit('search_history_size', event.target.value)}
        />
        <div className={styles.actions}>
          <Button type="submit" disabled={!hasChanges} loading={save.isPending}>
            Guardar cambios
          </Button>
          {hasChanges ? null : <p className={styles.unchanged}>No hay cambios para guardar.</p>}
        </div>
      </form>
    </Card>
  )
}

export function SettingsPage() {
  const settings = useQuery(adminQueries.settings())

  return (
    <>
      <PageHeader title="Configuración" description="Datos generales de la tienda. Se guarda todo junto o nada." />
      <div className={styles.page}>
        <QueryState query={settings}>{(data) => <SettingsForm settings={data} />}</QueryState>
        <div className={styles.note} role="note">
          <Info size={20} aria-hidden />
          <p>
            <strong>La tienda pública no toma estos datos.</strong> El nombre y la moneda que ven los clientes salen de config.ts (hoy,{' '}
            {config.storeName} y {config.currency}) porque GET /admin/settings pide token y no hay un endpoint público. Lo que guardes acá se
            usa en los montos de este panel, en los productos nuevos, en el historial y en el catálogo exportado.
          </p>
        </div>
      </div>
    </>
  )
}
