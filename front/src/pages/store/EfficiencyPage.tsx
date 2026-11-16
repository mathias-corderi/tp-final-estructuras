import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type CompareSearch } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { formatNumber } from '@/lib/format'
import { Button, Card, PageHeader, QueryState, SelectField, Skeleton, TextField } from '@/ui'
import { parseProductCode } from './catalog/helpers'
import styles from './EfficiencyPage.module.css'

const comparisonCount = (count: number) => `${formatNumber(count)} ${count === 1 ? 'comparación' : 'comparaciones'}`

interface BarProps {
  label: string
  value: number
  max: number
  tone: 'list' | 'tree'
}

function ComparisonBar({ label, value, max, tone }: BarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.barText}>
        <span>{label}</span>
        <strong className="tabular">{comparisonCount(value)}</strong>
      </div>
      <div className={styles.track} role="meter" aria-label={`${label}: ${comparisonCount(value)}`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div className={`${styles.fill} ${styles[tone]}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  )
}

function verdict(list: number, tree: number): string {
  if (tree < list) return `El árbol hizo ${comparisonCount(list - tree)} menos que la lista.`
  if (list < tree) return `Esta vez la lista hizo ${comparisonCount(tree - list)} menos que el árbol.`
  return 'Empate: los dos hicieron la misma cantidad de comparaciones.'
}

function CompareResult({ result }: { result: CompareSearch }) {
  const { code, found, list_comparisons: list, tree_comparisons: tree } = result
  const max = Math.max(list, tree, 1)
  return (
    <section className={styles.result} aria-label="Resultado de la comparación">
      <h3>{found ? `Encontramos el código ${code}.` : `El código ${code} no existe en la tienda.`}</h3>
      <ComparisonBar label="Lista" value={list} max={max} tone="list" />
      <ComparisonBar label="Árbol binario" value={tree} max={max} tone="tree" />
      {found ? null : (
        <p>
          Para estar segura, la lista recorrió sus {formatNumber(list)} productos hasta el final. Al árbol le alcanzó con bajar por una sola rama y ver que
          ahí no estaba.
        </p>
      )}
      <p className={styles.verdict}>{verdict(list, tree)}</p>
    </section>
  )
}

function CompareLoader({ code }: { code: number }) {
  const query = useQuery({ queryKey: keys.compareSearch(code), queryFn: () => api.products.compareSearch(code) })
  return (
    <div aria-live="polite">
      <QueryState query={query} loading={<Skeleton height={160} />}>
        {(result) => <CompareResult result={result} />}
      </QueryState>
    </div>
  )
}

function CompareForm({ code, onCompare }: { code: string; onCompare: (code: string) => void }) {
  const [text, setText] = useState(code)
  const [error, setError] = useState<string | null>(null)
  const products = useQuery({ queryKey: keys.products('name'), queryFn: () => api.products.list('name') })

  useEffect(() => setText(code), [code])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = text.trim()
    if (parseProductCode(value) === null) {
      setError('Ingresá un código numérico, por ejemplo 221.')
      return
    }
    setError(null)
    onCompare(value)
  }

  const pick = (value: string) => {
    setError(null)
    onCompare(value)
  }

  return (
    <div className={styles.controls}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <TextField label="Código de producto" inputMode="numeric" autoComplete="off" value={text} error={error} onChange={(event) => setText(event.target.value)} />
        <Button type="submit">Comparar</Button>
      </form>
      {products.data ? (
        <SelectField label="O elegí un producto" value={products.data.some((product) => String(product.code) === code) ? code : ''} onChange={(event) => pick(event.target.value)}>
          <option value="" disabled>
            Elegí de la lista…
          </option>
          {products.data.map((product) => (
            <option key={product.code} value={product.code}>
              {product.name} ({product.code})
            </option>
          ))}
        </SelectField>
      ) : null}
    </div>
  )
}

export function EfficiencyPage() {
  const [params, setParams] = useSearchParams()
  const codeText = params.get('codigo') ?? ''
  const code = parseProductCode(codeText)

  return (
    <>
      <PageHeader title="Cómo buscamos tus productos" description="La tienda guarda sus productos de dos formas. Las dos encuentran lo mismo, pero no hacen el mismo esfuerzo." />

      <div className={styles.methods}>
        <Card>
          <h2>Lista: de a uno</h2>
          <p>
            Los productos están uno detrás del otro, en el orden en que se cargaron. Para encontrar uno hay que mirarlos desde el principio hasta dar con él, y si
            no está, recorrerlos todos.
          </p>
          <p className={styles.usage}>La usamos cuando buscás por nombre o por marca.</p>
        </Card>
        <Card>
          <h2>Árbol binario: por descarte</h2>
          <p>
            Cada producto deja a un lado los códigos menores y al otro los mayores. Con cada comparación elegimos un camino y descartamos todo lo demás, sin
            mirarlo.
          </p>
          <p className={styles.usage}>Lo usamos cuando abrís un producto por su código.</p>
        </Card>
      </div>

      <Card className={styles.lab}>
        <h2>Probalo con un producto</h2>
        <p className={styles.lead}>Buscamos el mismo código en las dos estructuras y contamos cuántas comparaciones hizo cada una.</p>
        <CompareForm code={codeText} onCompare={(value) => setParams({ codigo: value })} />
        {code === null ? null : <CompareLoader code={code} />}
      </Card>

      <div className={styles.why}>
        <h2>¿Por qué importa?</h2>
        <p>
          Con pocos productos casi no se nota, pero la lista crece al ritmo del catálogo: con 1.000 productos puede necesitar 1.000 comparaciones. En un árbol bien
          repartido alcanzan unas 10, porque cada paso descarta la mitad de lo que queda.
        </p>
        <p>
          El árbol no se acomoda solo: su forma depende del orden en que se cargaron los códigos. Si entraran de menor a mayor quedaría como una lista larga, sin
          ninguna ventaja.
        </p>
      </div>
    </>
  )
}
