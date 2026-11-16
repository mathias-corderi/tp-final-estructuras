import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(path.resolve(import.meta.dirname, 'tokens.css'), 'utf-8')

function token(name: string): string {
  if (name === 'white') return '#ffffff'
  const match = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`).exec(css)
  if (!match?.[1]) throw new Error(`No existe el color --${name}`)
  return match[1]
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

describe('contraste de la paleta (WCAG AA, 4.5:1 para texto)', () => {
  it.each([
    ['ink', 'bg'],
    ['ink', 'surface-soft'],
    ['ink-soft', 'bg'],
    ['ink-soft', 'surface-soft'],
    ['ink-faint', 'surface'],
    ['ink-faint', 'bg'],
    ['white', 'primary'],
    ['white', 'primary-hover'],
    ['white', 'accent'],
    ['white', 'danger'],
    ['primary-ink', 'primary-tint'],
    ['accent-ink', 'accent-tint'],
    ['warning-ink', 'warning-tint'],
    ['info-ink', 'info-tint'],
    ['danger-ink', 'danger-tint'],
  ])('%s sobre %s', (text, background) => {
    expect(contrast(token(text), token(background))).toBeGreaterThanOrEqual(4.5)
  })
})
