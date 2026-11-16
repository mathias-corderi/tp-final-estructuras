import { useMutation, useQuery } from '@tanstack/react-query'
import { Undo2 } from 'lucide-react'
import { useId } from 'react'
import { ApiError } from '@/api/client'
import { api, type Operation, type Product } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { Badge, Button, describeError, useToast } from '@/ui'
import { operationKind, operationText } from './operations'
import { useCatalogChange } from './useCatalogChange'
import styles from './UndoPanel.module.css'

function OperationLine({ operation, products }: { operation: Operation; products: Product[] }) {
  const { label, tone } = operationKind(operation.kind)
  const name = products.find((product) => product.code === operation.code)?.name
  return (
    <span className={styles.operation}>
      <Badge tone={tone}>{label}</Badge>
      <span>
        {operationText(operation)}
        {name ? <span className={styles.name}> · {name}</span> : null}
      </span>
    </span>
  )
}

export function UndoPanel({ products }: { products: Product[] }) {
  const lastId = useId()
  const toast = useToast()
  const afterChange = useCatalogChange()
  const history = useQuery({ queryKey: keys.admin.undoHistory(), queryFn: api.admin.undo.history })
  const operations = history.data ?? []
  const last = operations[0]

  const undo = useMutation({
    mutationFn: api.admin.undo.run,
    onSuccess: ({ undone }) => afterChange(`Deshecho: ${operationText(undone)}`),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) toast.error(`No se pudo deshacer: ${error.message}`)
      else toast.error(error, { 404: 'No se pudo deshacer: el producto o su categoría ya no existen.' })
    },
  })

  return (
    <section className={styles.panel} aria-label="Deshacer cambios del catálogo">
      <div className={styles.bar}>
        <Button
          variant="secondary"
          size="sm"
          icon={<Undo2 size={16} aria-hidden />}
          loading={undo.isPending}
          disabled={!last}
          aria-describedby={lastId}
          onClick={() => undo.mutate()}
        >
          Deshacer
        </Button>
        <p id={lastId} className={styles.last}>
          {last ? (
            <>
              <span className={styles.lastLabel}>Última operación:</span> <OperationLine operation={last} products={products} />
            </>
          ) : history.isError ? (
            describeError(history.error)
          ) : history.isPending ? null : (
            'Todavía no hay operaciones para deshacer.'
          )}
        </p>
      </div>
      <p className={styles.note}>
        Se deshace de a una operación, siempre la más reciente primero. Los pedidos, las categorías, los ajustes masivos de precios y la
        configuración no se deshacen.
      </p>
      {last ? (
        <details className={styles.history}>
          <summary>Historial ({operations.length})</summary>
          <ol aria-label="Operaciones que se pueden deshacer">
            {operations.map((operation, index) => (
              // La pila solo cambia por arriba: la distancia al fondo identifica a cada operación.
              <li key={operations.length - index}>
                <OperationLine operation={operation} products={products} />
                {index === 0 ? <span className={styles.next}>Se deshace primero</span> : null}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  )
}
