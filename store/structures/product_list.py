"""Lista secuencial de productos — FLUJO 1 (navegacion y busqueda del catalogo).

Guarda los productos en orden de inserción y los busca uno por uno, contando
comparaciones. Es la estructura "lenta" que comparamos contra el BST.

Los elementos son objetos con atributos `code`, `name` y `brand` (en la app son
`Product`; en los tests unitarios, objetos simples que los imitan).
Usá una lista de Python por dentro, pero escribí cada búsqueda como un `for`
explícito: nada de `x in lista`, list.index() ni diccionarios.
Tests: tests/unit/test_product_list.py
"""

from typing import Any, Iterator


class ProductList:
    def __init__(self) -> None:
        self._items = []


    def append(self, product: Any) -> None:
        """Agrega al final. NO controla duplicados (eso lo hace CatalogService con el BST)."""
        self._items.append(product)


    def remove(self, code: int) -> Any | None:
        """Saca y devuelve el producto con ese código, o None si no está."""
        for i in range(len(self._items)):
            if self._items[i].code == code:
                return self._items.pop(i)
        return None
        
 

    def find_by_code(self, code: int) -> tuple[Any | None, int]:
        """Búsqueda secuencial que se detiene en la primera coincidencia.
           Devuelve (producto o None, comparaciones), comparaciones = elementos revisados.
        """
        comparisons = 0
        for item in self._items:
            comparisons += 1
            if item.code == code :
                return (item, comparisons)
        return (None, comparisons)


    def search_by_name(self, text: str) -> tuple[list[Any], int]:
        """Coincidencia por *substring* en `name`, sin distinguir mayúsculas.

        Recorre la lista entera, así que comparaciones == len(self).
        Los resultados respetan el orden de la lista.
        """
        text_lower = text.lower()
        results = []
        comparisons = 0
    
        for item in self._items:
            comparisons += 1
            if text_lower in item.name.lower():
                results.append(item)
            
        return (results, comparisons)
    
    

    def search_by_brand(self, text: str) -> tuple[list[Any], int]:
        """Igual que search_by_name, pero sobre `brand`."""
        text_lower = text.lower()
        results = []
        comparisons = 0
        
        for item in self._items:
            comparisons += 1
            if item.brand and text_lower in item.brand.lower():
                results.append(item)
        return (results, comparisons) 

    def to_list(self) -> list[Any]:
        """Una copia de los elementos en orden (modificar la copia no debe afectar a la lista)."""
        return list(self._items)

    def __len__(self) -> int:
        return len(self._items)
        

    def __iter__(self) -> Iterator[Any]:
        return iter(self._items)
