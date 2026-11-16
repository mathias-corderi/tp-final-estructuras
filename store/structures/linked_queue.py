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

    Guardamos referencias al primer nodo (`_front`) y al último (`_back`):
      - enqueue engancha un nodo nuevo detrás de `_back`  -> O(1)
      - dequeue avanza `_front` al siguiente nodo           -> O(1)
    `_size` evita recorrer la cola para saber cuántos elementos tiene.
    """

    def __init__(self, max_size: int | None = None) -> None:
        self._check_max_size(max_size)
        self._front: _Node | None = None
        self._back: _Node | None = None
        self._size = 0
        self._max_size = max_size

    @staticmethod
    def _check_max_size(max_size: int | None) -> None:
        if max_size is not None and (isinstance(max_size, bool) or not isinstance(max_size, int) or max_size < 1):
            raise ValueError("max_size must be None or an integer >= 1")

    @property
    def max_size(self) -> int | None:
        return self._max_size

    def enqueue(self, item: Any) -> Any | None:
        """Agrega `item` al final.

        Si la cola tiene límite y ya está llena, primero descarta el elemento del
        frente y lo devuelve. Si no, devuelve None.
        """
        dropped = None
        if self._max_size is not None and self._size >= self._max_size:
            dropped = self.dequeue()

        node = _Node(item)
        if self._back is None:  # cola vacía: el nodo nuevo es frente y final a la vez
            self._front = node
        else:
            self._back.next = node
        self._back = node
        self._size += 1
        return dropped

    def dequeue(self) -> Any:
        """Saca y devuelve el elemento del frente. IndexError si está vacía."""
        if self._front is None:
            raise IndexError("dequeue from an empty queue")
        node = self._front
        self._front = node.next
        if self._front is None:  # se vació: el final tampoco apunta a nada
            self._back = None
        self._size -= 1
        return node.value

    def peek(self) -> Any:
        """Devuelve el elemento del frente sin sacarlo. IndexError si está vacía."""
        if self._front is None:
            raise IndexError("peek from an empty queue")
        return self._front.value

    def remove_first(self, predicate: Callable[[Any], bool]) -> Any | None:
        """Saca el primer elemento (empezando por el frente) para el que predicate(elemento) es True.

        Devuelve el elemento sacado, o None si ninguno coincide. Recorre la cola con
        dos referencias (anterior y actual) para poder "puentear" el nodo sacado: O(n).
        """
        previous: _Node | None = None
        current = self._front
        while current is not None:
            if predicate(current.value):
                if previous is None:  # era el frente
                    self._front = current.next
                else:
                    previous.next = current.next
                if current is self._back:  # era el final
                    self._back = previous
                self._size -= 1
                return current.value
            previous = current
            current = current.next
        return None

    def resize(self, max_size: int | None) -> None:
        """Cambia la capacidad. Si hay más elementos que el nuevo tamaño, descarta desde el frente."""
        self._check_max_size(max_size)
        self._max_size = max_size
        if max_size is not None:
            while self._size > max_size:
                self.dequeue()

    def is_empty(self) -> bool:
        return self._size == 0

    def __len__(self) -> int:
        return self._size

    def to_list(self) -> list[Any]:
        """Elementos del frente al final. No debe modificar la cola."""
        result = []
        current = self._front
        while current is not None:
            result.append(current.value)
            current = current.next
        return result
