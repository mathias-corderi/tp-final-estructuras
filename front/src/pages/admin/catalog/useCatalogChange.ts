import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/ui'

/** Después de un cambio: refresca todo (toca stock, reportes e historial a la vez) y avisa. */
export function useCatalogChange(): (message: string) => void {
  const queryClient = useQueryClient()
  const toast = useToast()
  return (message) => {
    void queryClient.invalidateQueries()
    toast.success(message)
  }
}
