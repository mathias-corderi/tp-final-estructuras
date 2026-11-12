from typing import Any

class Stack:
    """Colección Last-In, First-Out: el último que entra es el primero que sale."""

    def __init__(self) -> None:
        self._items = []

    def push(self, item: Any) -> None:
        """Pone `item` en el tope de la pila."""
        self._items.append(item)

    def pop(self) -> Any:
        """Saca y devuelve el elemento del tope. IndexError si la pila está vacía."""
        if self.is_empty():
            raise IndexError("La pila está vacía")
        return self._items.pop()

    def peek(self) -> Any:
        """Devuelve el elemento del tope sin sacarlo. IndexError si está vacía."""
        if self.is_empty():
            raise IndexError("La pila está vacía")
        return self._items[-1]

    def is_empty(self) -> bool:
        return len(self._items) == 0

    def __len__(self) -> int:
        return len(self._items)

    def to_list(self) -> list[Any]:
        """Elementos del tope a la base (el más reciente primero). No debe modificar la pila."""
        # Al invertir la lista con [::-1] creamos una copia ordenada desde el tope a la base
        return self._items[::-1]
