import { describe, expect, it } from 'vitest'
import type { CategoryNode } from '@/api/endpoints'
import { categoryLabel, categoryPathLabel, categoryUrl, flattenCategories, parentCategory } from './categories'

const tree: CategoryNode = {
  name: 'Store',
  path: '',
  product_count: 3,
  children: [
    {
      name: 'Grocery',
      path: 'Grocery',
      product_count: 2,
      children: [{ name: 'Drinks', path: 'Grocery/Drinks', product_count: 2, children: [] }],
    },
    { name: 'Tools', path: 'Tools', product_count: 1, children: [] },
  ],
}

describe('nombres de categorías', () => {
  it('traduce los nombres conocidos', () => {
    expect(categoryLabel('Personal Care')).toBe('Cuidado personal')
  })

  it('deja tal cual una categoría creada por el dueño', () => {
    expect(categoryLabel('Tools')).toBe('Tools')
  })

  it('arma la ruta legible con el nombre traducido de cada nivel', () => {
    expect(categoryPathLabel('Grocery/Drinks/Sodas')).toBe('Almacén › Bebidas › Gaseosas')
  })
})

describe('rutas', () => {
  it('codifica cada segmento para la URL sin perder las barras', () => {
    expect(categoryUrl('Personal Care/Hair')).toBe('/categorias/Personal%20Care/Hair')
  })

  it('el padre de una categoría de primer nivel es la raíz', () => {
    expect(parentCategory('Grocery/Drinks')).toBe('Grocery')
    expect(parentCategory('Grocery')).toBe('')
  })
})

describe('flattenCategories', () => {
  it('recorre en preorden, sin la raíz, indicando la profundidad', () => {
    expect(flattenCategories(tree).map(({ path, depth }) => [path, depth])).toEqual([
      ['Grocery', 0],
      ['Grocery/Drinks', 1],
      ['Tools', 0],
    ])
  })
})
