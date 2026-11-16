import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ApiError } from '@/api/client'
import { DemoBanner } from '@/layouts/DemoBanner'
import { CartProvider } from '@/lib/cart'
import { ToastProvider } from '@/ui'

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: false,
        // Reintentar solo sirve si la API no respondió; un 4xx o un 501 va a dar lo mismo.
        retry: (count, error) => error instanceof ApiError && error.isUnavailable && count < 1,
      },
    },
  })
}

export function Providers({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <CartProvider>
        <ToastProvider>
          {import.meta.env.MODE === 'mock' ? <DemoBanner /> : null}
          {children}
        </ToastProvider>
      </CartProvider>
    </QueryClientProvider>
  )
}
