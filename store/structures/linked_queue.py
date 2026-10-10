"""Cola (FIFO) con nodos enlazados — FLUJO 4 (pedidos).

Se usa para:
  - los pedidos pendientes: el dueño siempre atiende primero el más viejo (Flujo 4);
  - el historial de búsquedas: una cola *acotada* que guarda las últimas N (Flujo 5).

Implementala con objetos `_Node` y referencias al frente y al final, para que
encolar y desencolar sean O(1). NO uses una lista de Python, collections.deque
ni queue.Queue.
Tests: tests/unit/test_linked_queue.py
"""

from typing import Any, Callable


class _Node:
    """Un elemento de la cola. Ya está implementado."""

    __slots__ = ("value", "next")

    def __init__(self, value: Any) -> None:
        self.value = value
        self.next: "_Node | None" = None


class Queue:
    """Colección First-In, First-Out, opcionalmente con tamaño máximo.

    `max_size=None` significa sin límite. Si se indica, tiene que ser >= 1 (si no, ValueError).
    """

    def __init__(self, max_size: int | None = None) -> None:
        raise NotImplementedError("Flow 4: Queue.__init__")

    @property
    def max_size(self) -> int | None:
        raise NotImplementedError("Flow 4: Queue.max_size")

    def enqueue(self, item: Any) -> Any | None:
        """Agrega `item` al final.

        Si la cola tiene límite y ya está llena, primero descarta el elemento del
        frente y lo devuelve. Si no, devuelve None.
        """
        raise NotImplementedError("Flow 4: Queue.enqueue")

    def dequeue(self) -> Any:
        """Saca y devuelve el elemento del frente. IndexError si está vacía."""
        raise NotImplementedError("Flow 4: Queue.dequeue")

    def peek(self) -> Any:
        """Devuelve el elemento del frente sin sacarlo. IndexError si está vacía."""
        raise NotImplementedError("Flow 4: Queue.peek")

    def remove_first(self, predicate: Callable[[Any], bool]) -> Any | None:
        """Saca el primer elemento (empezando por el frente) para el que predicate(elemento) es True.

        Devuelve el elemento sacado, o None si ninguno coincide. Ojo con las
        referencias al frente y al final cuando el nodo sacado es el primero o el último.
        """
        raise NotImplementedError("Flow 4: Queue.remove_first")

    def resize(self, max_size: int | None) -> None:
        """Cambia la capacidad. Si hay más elementos que el nuevo tamaño, descarta desde el frente."""
        raise NotImplementedError("Flow 4: Queue.resize")

    def is_empty(self) -> bool:
        raise NotImplementedError("Flow 4: Queue.is_empty")

    def __len__(self) -> int:
        raise NotImplementedError("Flow 4: Queue.__len__")

    def to_list(self) -> list[Any]:
        """Elementos del frente al final. No debe modificar la cola."""
        raise NotImplementedError("Flow 4: Queue.to_list")
