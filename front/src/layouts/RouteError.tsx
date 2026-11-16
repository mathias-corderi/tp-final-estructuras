import { Bug } from 'lucide-react'
import { EmptyState, LinkButton } from '@/ui'

/** Último recurso si una pantalla falla al dibujarse: la app no queda en blanco. */
export function RouteError() {
  return (
    <EmptyState icon={<Bug size={28} aria-hidden />} title="Algo salió mal en esta pantalla" action={<LinkButton to="/">Volver al inicio</LinkButton>}>
      Probá de nuevo; si sigue pasando, avisanos.
    </EmptyState>
  )
}
