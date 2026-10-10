"""Lista secuencial de productos — FLUJO 1 (navegación y búsqueda del catálogo).

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
        raise NotImplementedError("Flow 1: ProductList.__init__")

    def append(self, product: Any) -> None:
        """Agrega al final. NO controla duplicados (eso lo hace CatalogService con el BST)."""
        raise NotImplementedError("Flow 1: ProductList.append")

    def remove(self, code: int) -> Any | None:
        """Saca y devuelve el producto con ese código, o None si no está."""
        raise NotImplementedError("Flow 1: ProductList.remove")

    def find_by_code(self, code: int) -> tuple[Any | None, int]:
        """Búsqueda secuencial que se detiene en la primera coincidencia.

        Devuelve (producto o None, comparaciones), comparaciones = elementos revisados.
        """
        raise NotImplementedError("Flow 1: ProductList.find_by_code")

    def search_by_name(self, text: str) -> tuple[list[Any], int]:
        """Coincidencia por *substring* en `name`, sin distinguir mayúsculas.

        Recorre la lista entera, así que comparaciones == len(self).
        Los resultados respetan el orden de la lista.
        """
        raise NotImplementedError("Flow 1: ProductList.search_by_name")

    def search_by_brand(self, text: str) -> tuple[list[Any], int]:
        """Igual que search_by_name, pero sobre `brand`."""
        raise NotImplementedError("Flow 1: ProductList.search_by_brand")

    def to_list(self) -> list[Any]:
        """Una copia de los elementos en orden (modificar la copia no debe afectar a la lista)."""
        raise NotImplementedError("Flow 1: ProductList.to_list")

    def __len__(self) -> int:
        raise NotImplementedError("Flow 1: ProductList.__len__")

    def __iter__(self) -> Iterator[Any]:
        raise NotImplementedError("Flow 1: ProductList.__iter__")
