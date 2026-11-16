import { FlaskConical } from 'lucide-react'
import styles from './DemoBanner.module.css'

/** Aviso del modo demo: lo que se ve no sale de la API real. */
export function DemoBanner() {
  const reset = async () => {
    const { resetDemo } = await import('@/mocks/browser')
    resetDemo()
  }

  return (
    <div className={`${styles.banner} demo-banner`} role="note">
      <FlaskConical size={16} aria-hidden />
      <span>
        Modo demo: los datos son simulados y viven en este navegador. Token del dueño: <code>change-me</code>
      </span>
      <button type="button" onClick={() => void reset()}>
        Reiniciar datos
      </button>
    </div>
  )
}
