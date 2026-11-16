/**
 * Presentación de categorías. Los datos de la API están en inglés (RNF-07); acá se traducen
 * solo para mostrarlos. Las URL y los pedidos a la API siempre usan la ruta original.
 */
import {
  BatteryCharging, Brush, Cable, Citrus, Cookie, CupSoda, Droplets, GlassWater, Headphones, Layers, Notebook, NotebookPen,
  Package, Popcorn, ScanFace, Shirt, ShoppingBasket, Smile, Soup, Sparkles, SprayCan, UtensilsCrossed, Wheat, type LucideIcon,
} from 'lucide-react'
import type { CategoryNode } from '@/api/endpoints'

const LABELS: Record<string, string> = {
  Grocery: 'Almacén',
  Drinks: 'Bebidas',
  Sodas: 'Gaseosas',
  Water: 'Aguas',
  Juices: 'Jugos',
  Snacks: 'Snacks',
  Cookies: 'Galletitas',
  Chips: 'Papas fritas',
  Pantry: 'Despensa',
  Pasta: 'Pastas',
  Rice: 'Arroz',
  Oils: 'Aceites',
  Cleaning: 'Limpieza',
  Laundry: 'Lavandería',
  Kitchen: 'Cocina',
  Floors: 'Pisos',
  'Personal Care': 'Cuidado personal',
  Hair: 'Cabello',
  Oral: 'Salud bucal',
  Electronics: 'Electrónica',
  Accessories: 'Accesorios',
  Chargers: 'Cargadores',
  Cables: 'Cables',
  Stationery: 'Librería',
  Notebooks: 'Cuadernos',
}

const ICONS: Record<string, LucideIcon> = {
  Grocery: ShoppingBasket,
  Drinks: CupSoda,
  Sodas: CupSoda,
  Water: GlassWater,
  Juices: Citrus,
  Snacks: Popcorn,
  Cookies: Cookie,
  Chips: Popcorn,
  Pantry: Soup,
  Pasta: UtensilsCrossed,
  Rice: Wheat,
  Oils: Droplets,
  Cleaning: SprayCan,
  Laundry: Shirt,
  Kitchen: Sparkles,
  Floors: Brush,
  'Personal Care': ScanFace,
  Hair: ScanFace,
  Oral: Smile,
  Electronics: Headphones,
  Accessories: Headphones,
  Chargers: BatteryCharging,
  Cables: Cable,
  Stationery: NotebookPen,
  Notebooks: Notebook,
}

/** Cada rama principal tiene su color, así el catálogo se ordena a simple vista. */
export type CategoryTone = 'mustard' | 'sky' | 'rose' | 'sage' | 'clay' | 'neutral'

const TONES: Record<string, CategoryTone> = {
  Grocery: 'mustard',
  Cleaning: 'sky',
  'Personal Care': 'rose',
  Electronics: 'sage',
  Stationery: 'clay',
}

export function categoryLabel(name: string): string {
  return LABELS[name] ?? name
}

export function categoryPathLabel(path: string): string {
  return path.split('/').map(categoryLabel).join(' › ')
}

export function categoryUrl(path: string): string {
  return `/categorias/${path.split('/').map(encodeURIComponent).join('/')}`
}

export function parentCategory(path: string): string {
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
}

export function categoryName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** Ícono y color de una ruta: usa el nivel más específico que conozca. */
export function categoryVisual(path: string): { Icon: LucideIcon; tone: CategoryTone } {
  const names = path.split('/')
  const known = [...names].reverse().find((name) => ICONS[name])
  return { Icon: (known && ICONS[known]) || Package, tone: TONES[names[0] ?? ''] ?? 'neutral' }
}

export const ALL_CATEGORIES_ICON = Layers

export interface FlatCategory {
  path: string
  name: string
  depth: number
  productCount: number
}

/** Árbol en preorden y sin la raíz: para selects y listados. */
export function flattenCategories(root: CategoryNode): FlatCategory[] {
  const out: FlatCategory[] = []
  const walk = (node: CategoryNode, depth: number) => {
    for (const child of node.children ?? []) {
      out.push({ path: child.path, name: child.name, depth, productCount: child.product_count })
      walk(child, depth + 1)
    }
  }
  walk(root, 0)
  return out
}
