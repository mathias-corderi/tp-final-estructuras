"""Árbol binario de búsqueda — FLUJO 1 (navegación y búsqueda del catálogo).

El catálogo tiene dos:
  - clave = product.code                   -> búsqueda rápida por código
  - clave = (product.name.lower(), code)   -> listado alfabético (inorden)

Las claves pueden ser cualquier cosa comparable con `<` y `==` (ints, tuplas...).
Escribilo a mano (recursivo o iterativo, como prefieras). Sin sorted(), bisect ni diccionarios.
Tests: tests/unit/test_bst.py
"""

from typing import Any


class BSTNode:
    """Un nodo del árbol. Ya está implementado."""

    def __init__(self, key: Any, value: Any) -> None:
        self.key = key
        self.value = value
        self.left: "BSTNode | None" = None
        self.right: "BSTNode | None" = None


class BinarySearchTree:
    """Las claves menores van a la izquierda y las mayores a la derecha. No se repiten claves."""

    def __init__(self) -> None:
        raise NotImplementedError("Flow 1: BinarySearchTree.__init__")

    def insert(self, key: Any, value: Any) -> None:
        """Inserta `value` con la clave `key`. Si la clave ya existe, reemplaza el valor (el tamaño no cambia)."""
        raise NotImplementedError("Flow 1: BinarySearchTree.insert")

    def search(self, key: Any) -> tuple[Any | None, int]:
        """Devuelve (valor, comparaciones).

        comparaciones = cantidad de nodos visitados (cada nodo visitado cuenta 1).
        Si la clave no está, devuelve (None, nodos visitados hasta salirse del árbol).
        Árbol vacío -> (None, 0).
        """
        raise NotImplementedError("Flow 1: BinarySearchTree.search")

    def contains(self, key: Any) -> bool:
        raise NotImplementedError("Flow 1: BinarySearchTree.contains")

    def delete(self, key: Any) -> bool:
        """Elimina el nodo con `key`. Devuelve True si lo eliminó, False si no estaba.

        Tres casos: hoja, un hijo, dos hijos (se reemplaza por el sucesor inorden).
        """
        raise NotImplementedError("Flow 1: BinarySearchTree.delete")

    def inorder(self) -> list[Any]:
        """Valores en orden ascendente de clave (izquierda -> nodo -> derecha)."""
        raise NotImplementedError("Flow 1: BinarySearchTree.inorder")

    def height(self) -> int:
        """Árbol vacío -> 0, un solo nodo -> 1."""
        raise NotImplementedError("Flow 1: BinarySearchTree.height")

    def is_empty(self) -> bool:
        raise NotImplementedError("Flow 1: BinarySearchTree.is_empty")

    def __len__(self) -> int:
        raise NotImplementedError("Flow 1: BinarySearchTree.__len__")
