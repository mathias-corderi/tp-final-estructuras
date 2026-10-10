"""Binary search tree — FLOW 1 (catalog browsing and search).

The catalog keeps two of these:
  - key = product.code                   -> fast lookup by code
  - key = (product.name.lower(), code)   -> alphabetical listing (inorder)

Keys can be anything comparable with `<` and `==` (ints, tuples...).
Write it by hand (recursive or iterative, your call). No sorted(), bisect or dicts.
Tests: tests/unit/test_bst.py
"""

from typing import Any


class BSTNode:
    """One node of the tree. Already implemented."""

    def __init__(self, key: Any, value: Any) -> None:
        self.key = key
        self.value = value
        self.left: "BSTNode | None" = None
        self.right: "BSTNode | None" = None


class BinarySearchTree:
    """Smaller keys go left, greater keys go right. Keys are unique."""

    def __init__(self) -> None:
        raise NotImplementedError("Flow 1: BinarySearchTree.__init__")

    def insert(self, key: Any, value: Any) -> None:
        """Insert `value` under `key`. If the key already exists, replace its value (size unchanged)."""
        raise NotImplementedError("Flow 1: BinarySearchTree.insert")

    def search(self, key: Any) -> tuple[Any | None, int]:
        """Return (value, comparisons).

        comparisons = number of nodes visited (each visited node counts 1).
        If the key is missing, return (None, nodes visited until falling off the tree).
        Empty tree -> (None, 0).
        """
        raise NotImplementedError("Flow 1: BinarySearchTree.search")

    def contains(self, key: Any) -> bool:
        raise NotImplementedError("Flow 1: BinarySearchTree.contains")

    def delete(self, key: Any) -> bool:
        """Remove the node with `key`. Return True if it was removed, False if missing.

        Three cases: leaf, one child, two children (replace with the inorder successor).
        """
        raise NotImplementedError("Flow 1: BinarySearchTree.delete")

    def inorder(self) -> list[Any]:
        """Values in ascending key order (left -> node -> right)."""
        raise NotImplementedError("Flow 1: BinarySearchTree.inorder")

    def height(self) -> int:
        """Empty tree -> 0, a single node -> 1."""
        raise NotImplementedError("Flow 1: BinarySearchTree.height")

    def is_empty(self) -> bool:
        raise NotImplementedError("Flow 1: BinarySearchTree.is_empty")

    def __len__(self) -> int:
        raise NotImplementedError("Flow 1: BinarySearchTree.__len__")
