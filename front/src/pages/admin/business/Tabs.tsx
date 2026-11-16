import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import styles from './Tabs.module.css'

interface TabsProps {
  label: string
  tabs: readonly { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
  children: ReactNode
}

/** Pestañas accesibles: Tab entra a la activa y las flechas, Inicio y Fin se mueven entre ellas. */
export function Tabs({ label, tabs, active, onChange, children }: TabsProps) {
  const baseId = useId()
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const tabId = (id: string) => `${baseId}-tab-${id}`
  const panelId = `${baseId}-panel`

  const move = (event: KeyboardEvent) => {
    const current = tabs.findIndex((tab) => tab.id === active)
    const targets: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 }
    const target = targets[event.key]
    if (target === undefined) return
    event.preventDefault()
    const tab = tabs[(target + tabs.length) % tabs.length]
    if (!tab) return
    onChange(tab.id)
    buttons.current.get(tab.id)?.focus()
  }

  return (
    <>
      <div role="tablist" aria-label={label} className={styles.list} onKeyDown={move}>
        {tabs.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              ref={(button) => {
                if (button) buttons.current.set(tab.id, button)
              }}
              type="button"
              role="tab"
              id={tabId(tab.id)}
              className={styles.tab}
              aria-selected={selected}
              aria-controls={selected ? panelId : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId(active)} tabIndex={0} className={styles.panel}>
        {children}
      </div>
    </>
  )
}
