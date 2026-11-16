import { SearchX } from 'lucide-react'
import { useTitle } from '@/lib/useTitle'
import { EmptyState, LinkButton } from '@/ui'

export function NotFoundPage() {
  useTitle('Página no encontrada')
  return (
    <EmptyState icon={<SearchX size={28} aria-hidden />} title="No encontramos esta página" action={<LinkButton to="/">Volver al inicio</LinkButton>}>
      Puede que el enlace haya cambiado.
    </EmptyState>
  )
}
