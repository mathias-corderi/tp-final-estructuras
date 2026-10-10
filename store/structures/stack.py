"""Pila (LIFO) — FLUJO 2 (administración de productos).

La usa CatalogService para deshacer la última operación sobre el catálogo.

Implementala a mano. Guardar los elementos en una lista de Python y tocar
solo su final (append / pop) está bien. NO uses collections.deque ni queue.LifoQueue.
Tests: tests/unit/test_stack.py
"""

from typing import Any


class Stack:
    """Colección Last-In, First-Out: el último que entra es el primero que sale."""

    def __init__(self) -> None:
        raise NotImplementedError("Flow 2: Stack.__init__")

    def push(self, item: Any) -> None:
        """Pone `item` en el tope de la pila."""
        raise NotImplementedError("Flow 2: Stack.push")

    def pop(self) -> Any:
        """Saca y devuelve el elemento del tope. IndexError si la pila está vacía."""
        raise NotImplementedError("Flow 2: Stack.pop")

    def peek(self) -> Any:
        """Devuelve el elemento del tope sin sacarlo. IndexError si está vacía."""
        raise NotImplementedError("Flow 2: Stack.peek")

    def is_empty(self) -> bool:
        raise NotImplementedError("Flow 2: Stack.is_empty")

    def __len__(self) -> int:
        raise NotImplementedError("Flow 2: Stack.__len__")

    def to_list(self) -> list[Any]:
        """Elementos del tope a la base (el más reciente primero). No debe modificar la pila."""
        raise NotImplementedError("Flow 2: Stack.to_list")
