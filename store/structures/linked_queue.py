"""Queue (FIFO) built with linked nodes — FLOW 4 (orders).

Used for:
  - pending orders: the owner always processes the oldest one first (Flow 4);
  - search history: a *bounded* queue that keeps the last N searches (Flow 5).

Implement it with `_Node` objects and references to the front and the back,
so enqueue and dequeue are O(1). Do NOT use a Python list, collections.deque
or queue.Queue.
Tests: tests/unit/test_linked_queue.py
"""

from typing import Any, Callable


class _Node:
    """One element of the queue. Already implemented."""

    __slots__ = ("value", "next")

    def __init__(self, value: Any) -> None:
        self.value = value
        self.next: "_Node | None" = None


class Queue:
    """First-In, First-Out collection, optionally bounded.

    `max_size=None` means unbounded. If given it must be >= 1 (ValueError otherwise).
    """

    def __init__(self, max_size: int | None = None) -> None:
        raise NotImplementedError("Flow 4: Queue.__init__")

    @property
    def max_size(self) -> int | None:
        raise NotImplementedError("Flow 4: Queue.max_size")

    def enqueue(self, item: Any) -> Any | None:
        """Add `item` at the back.

        If the queue is bounded and already full, first drop the front item and
        return it. Otherwise return None.
        """
        raise NotImplementedError("Flow 4: Queue.enqueue")

    def dequeue(self) -> Any:
        """Remove and return the front item. Raise IndexError if empty."""
        raise NotImplementedError("Flow 4: Queue.dequeue")

    def peek(self) -> Any:
        """Return the front item without removing it. Raise IndexError if empty."""
        raise NotImplementedError("Flow 4: Queue.peek")

    def remove_first(self, predicate: Callable[[Any], bool]) -> Any | None:
        """Remove the first item (starting at the front) for which predicate(item) is True.

        Return the removed item, or None if no item matches. Watch out for the
        front and back references when the removed node is the first or the last.
        """
        raise NotImplementedError("Flow 4: Queue.remove_first")

    def resize(self, max_size: int | None) -> None:
        """Change the capacity. If there are more items than the new size, drop from the front."""
        raise NotImplementedError("Flow 4: Queue.resize")

    def is_empty(self) -> bool:
        raise NotImplementedError("Flow 4: Queue.is_empty")

    def __len__(self) -> int:
        raise NotImplementedError("Flow 4: Queue.__len__")

    def to_list(self) -> list[Any]:
        """Items from front to back. Must not modify the queue."""
        raise NotImplementedError("Flow 4: Queue.to_list")
