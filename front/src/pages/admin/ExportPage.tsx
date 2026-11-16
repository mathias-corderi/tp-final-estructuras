import { useQuery } from '@tanstack/react-query'
import { Copy, Download } from 'lucide-react'
import { Button, PageHeader, QueryState, useToast } from '@/ui'
import { adminQueries } from './business/queries'
import styles from './ExportPage.module.css'

function download(text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'catalogo.txt'
  document.body.append(link)
  link.click()
  link.remove()
  // Se espera un poco: algunos navegadores leen el Blob después del clic.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Catalog({ text }: { text: string }) {
  const toast = useToast()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copiamos el catálogo.')
    } catch {
      toast.error('No pudimos copiar. Seleccioná el texto a mano o descargalo.')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <Button icon={<Download size={18} aria-hidden />} onClick={() => download(text)}>
          Descargar .txt
        </Button>
        <Button variant="secondary" icon={<Copy size={18} aria-hidden />} onClick={() => void copy()}>
          Copiar
        </Button>
      </div>
      <pre className={styles.text} role="region" aria-label="Catálogo exportado" tabIndex={0}>
        {text}
      </pre>
    </div>
  )
}

export function ExportPage() {
  const catalog = useQuery(adminQueries.exportCatalog())

  return (
    <>
      <PageHeader title="Exportar catálogo" description="Productos activos ordenados por nombre, con su precio final y stock." />
      <QueryState query={catalog}>{(text) => <Catalog text={text} />}</QueryState>
    </>
  )
}
