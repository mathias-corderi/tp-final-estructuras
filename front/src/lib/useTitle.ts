import { useEffect } from 'react'
import { config } from '@/config'

export function useTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${config.storeName}` : config.storeName
  }, [title])
}
