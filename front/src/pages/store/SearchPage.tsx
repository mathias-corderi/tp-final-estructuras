import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, type SearchResult } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { formatNumber } from '@/lib/format'
import { Button, EmptyState, LinkButton, PageHeader, QueryState, TextField } from '@/ui'
import { ProductGrid, ProductGridSkeleton } from './catalog/ProductGrid'
import styles from './SearchPage.module.css'

interface SearchFormProps {
  name: string
  brand: string
  onSearch: (name: string, brand: string) => void
}

function SearchForm({ name, brand, onSearch }: SearchFormProps) {
  const [nameText, setNameText] = useState(name)
  const [brandText, setBrandText] = useState(brand)

  useEffect(() => setNameText(name), [name])
  useEffect(() => setBrandText(brand), [brand])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSearch(nameText.trim(), brandText.trim())
  }

  return (
    <form className={styles.form} role="search" aria-label="Buscar por nombre y marca" onSubmit={submit}>
      <TextField label="Nombre" type="search" enterKeyHint="search" value={nameText} onChange={(event) => setNameText(event.target.value)} />
      <TextField label="Marca" type="search" enterKeyHint="search" value={brandText} onChange={(event) => setBrandText(event.target.value)} />
      <Button type="submit" icon={<Search size={18} aria-hidden />}>
        Buscar productos
      </Button>
    </form>
  )
}

function SearchResults({ result, criteria }: { result: SearchResult; criteria: number }) {
  const { results, comparisons } = result
  const count = formatNumber(comparisons)
  const found = `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`

  if (results.length === 0) {
    return (
      <EmptyState title="No encontramos productos con esa búsqueda" action={<LinkButton to="/productos" variant="secondary">Ver todo el catálogo</LinkButton>}>
        {criteria === 2 ? `Hicimos ${count} comparaciones y ningún producto cumple los dos criterios.` : `Revisamos ${count} productos y ninguno coincide.`}
      </EmptyState>
    )
  }
  return (
    <>
      <p className={styles.summary}>
        {criteria === 2
          ? `Hicimos ${count} comparaciones para encontrar ${found}: una pasada por nombre y otra por marca.`
          : `Revisamos ${count} productos para encontrar ${found}.`}
      </p>
      <ProductGrid products={results} />
    </>
  )
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const name = params.get('name')?.trim() ?? ''
  const brand = params.get('brand')?.trim() ?? ''
  const criteria = [name, brand].filter(Boolean).length

  const query = useQuery({
    queryKey: keys.search(name, brand),
    queryFn: () => api.products.search({ name, brand }),
    enabled: criteria > 0,
    // Cada llamada queda en el historial del dueño: volver a estos resultados no puede contar como otra búsqueda.
    staleTime: 'static',
  })

  const search = (nextName: string, nextBrand: string) => {
    setParams({ ...(nextName && { name: nextName }), ...(nextBrand && { brand: nextBrand }) })
  }

  return (
    <>
      <PageHeader title="Buscar productos" description="Buscá por nombre, por marca o por los dos a la vez." />
      <SearchForm name={name} brand={brand} onSearch={search} />
      {criteria === 0 ? (
        <EmptyState icon={<Search size={28} aria-hidden />} title="¿Qué estás buscando?">
          Escribí un nombre o una marca y tocá Buscar productos.
        </EmptyState>
      ) : (
        <QueryState query={query} loading={<ProductGridSkeleton />}>
          {(result) => <SearchResults result={result} criteria={criteria} />}
        </QueryState>
      )}
    </>
  )
}
