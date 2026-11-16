import type { UseQueryResult } from '@tanstack/react-query'
import { CircleAlert, CloudOff, Construction, RotateCw, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiError } from '@/api/client'
import { Button } from './Button'
import { describeError, type ErrorMessages } from './errors'
import styles from './States.module.css'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
}

export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className={styles.state}>
      <div className={styles.icon}>{icon ?? <SearchX size={28} aria-hidden />}</div>
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  )
}

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  messages?: ErrorMessages
}

/** Error al cargar una pantalla. Distingue "falta ese flujo" de "la API está apagada". */
export function ErrorState({ error, onRetry, messages }: ErrorStateProps) {
  const retry = onRetry ? (
    <Button variant="secondary" size="sm" icon={<RotateCw size={16} aria-hidden />} onClick={onRetry}>
      Reintentar
    </Button>
  ) : null

  if (error instanceof ApiError && error.isNotImplemented) {
    return (
      <EmptyState icon={<Construction size={28} aria-hidden />} title="Esta parte todavía está en construcción" action={retry}>
        {error.pendingFlow
          ? `La API aún no implementa lo que hace falta acá (${error.pendingFlow}).`
          : 'La API aún no implementa lo que hace falta acá.'}
      </EmptyState>
    )
  }
  if (error instanceof ApiError && error.isUnavailable) {
    return (
      <EmptyState icon={<CloudOff size={28} aria-hidden />} title="No pudimos conectarnos con la tienda" action={retry}>
        Revisá que la API esté corriendo y probá de nuevo.
      </EmptyState>
    )
  }
  return (
    <EmptyState icon={<CircleAlert size={28} aria-hidden />} title="No pudimos cargar esta información" action={retry}>
      {describeError(error, messages)}
    </EmptyState>
  )
}

export function Skeleton({ height = 16, width = '100%', radius }: { height?: number | string; width?: number | string; radius?: number | string }) {
  return <span className={styles.skeleton} style={{ height, width, borderRadius: radius }} aria-hidden />
}

export function LoadingState({ label = 'Cargando…', children }: { label?: string; children?: ReactNode }) {
  return (
    <div role="status" aria-label={label}>
      {children ?? (
        <div className={styles.lines}>
          <Skeleton height={22} width="40%" />
          <Skeleton />
          <Skeleton />
          <Skeleton width="70%" />
        </div>
      )}
    </div>
  )
}

interface QueryStateProps<T> {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  loading?: ReactNode
  messages?: ErrorMessages
}

/** Resuelve carga y error de una consulta; `children` recibe los datos ya listos. */
export function QueryState<T>({ query, children, loading, messages }: QueryStateProps<T>) {
  if (query.isPending) return <LoadingState>{loading}</LoadingState>
  if (query.isError) return <ErrorState error={query.error} messages={messages} onRetry={() => void query.refetch()} />
  return <>{children(query.data)}</>
}
