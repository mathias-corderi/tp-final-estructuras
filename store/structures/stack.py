"""Stack (LIFO) — FLOW 2 (product administration).

Used by CatalogService to undo the last catalog operation.

Implement it by hand. Storing the items in a Python list and only touching
its end (append / pop) is fine. Do NOT use collections.deque or queue.LifoQueue.
Tests: tests/unit/test_stack.py
"""

from typing import Any


class Stack:
    """Last-In, First-Out collection."""

    def __init__(self) -> None:
        raise NotImplementedError("Flow 2: Stack.__init__")

    def push(self, item: Any) -> None:
        """Put `item` on top of the stack."""
        raise NotImplementedError("Flow 2: Stack.push")

    def pop(self) -> Any:
        """Remove and return the top item. Raise IndexError if the stack is empty."""
        raise NotImplementedError("Flow 2: Stack.pop")

    def peek(self) -> Any:
        """Return the top item without removing it. Raise IndexError if empty."""
        raise NotImplementedError("Flow 2: Stack.peek")

    def is_empty(self) -> bool:
        raise NotImplementedError("Flow 2: Stack.is_empty")

    def __len__(self) -> int:
        raise NotImplementedError("Flow 2: Stack.__len__")

    def to_list(self) -> list[Any]:
        """Items from top to bottom (most recent first). Must not modify the stack."""
        raise NotImplementedError("Flow 2: Stack.to_list")
