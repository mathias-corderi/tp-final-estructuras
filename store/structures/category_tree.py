"""Category tree (n-ary) — FLOW 3 (categories).

Each node is a category that can have any number of subcategories, and the
products ("items") hang from the node of their category:

    Store                      <- root, path ""
    ├── Grocery                <- path "Grocery"
    │   ├── Drinks             <- path "Grocery/Drinks"
    │   │   └── Sodas  -> [Coca-Cola, Sprite]
    │   └── Snacks     -> [Oreo]
    └── Cleaning       -> [Bleach]

Paths are names joined with "/", without the root. Names are case-sensitive.
Items are compared with `==` (Products are equal when their codes are equal).
Children and items keep insertion order.
Tests: tests/unit/test_category_tree.py
"""

from typing import Any, Callable


def split_path(path: str) -> list[str]:
    """Turn "Grocery / Drinks" into ["Grocery", "Drinks"].

    - Each segment is stripped.
    - A blank path ("" or "   ") means the root -> [].
    - An empty segment ("A//B", "/A", "A/") -> ValueError.
    """
    raise NotImplementedError("Flow 3: split_path")


class CategoryNode:
    def __init__(self, name: str, parent: "CategoryNode | None" = None) -> None:
        self.name = name
        self.parent = parent
        self.children: list[CategoryNode] = []
        self.items: list[Any] = []

    @property
    def path(self) -> str:
        """Full path from the root: "" for the root, "Grocery/Drinks" for a nested node."""
        raise NotImplementedError("Flow 3: CategoryNode.path")

    def find_child(self, name: str) -> "CategoryNode | None":
        raise NotImplementedError("Flow 3: CategoryNode.find_child")

    def add_child(self, name: str) -> "CategoryNode":
        """Create, append and return a new child.

        ValueError if a child with that name already exists, or if the name is
        empty or contains "/".
        """
        raise NotImplementedError("Flow 3: CategoryNode.add_child")

    def remove_child(self, name: str) -> bool:
        """Remove the child (and its whole subtree). Return False if missing."""
        raise NotImplementedError("Flow 3: CategoryNode.remove_child")


class CategoryTree:
    ROOT_NAME = "Store"

    def __init__(self) -> None:
        self.root = CategoryNode(self.ROOT_NAME)

    def find(self, path: str) -> CategoryNode | None:
        """Node at `path` ("" -> root), or None if it doesn't exist."""
        raise NotImplementedError("Flow 3: CategoryTree.find")

    def exists(self, path: str) -> bool:
        raise NotImplementedError("Flow 3: CategoryTree.exists")

    def add_path(self, path: str) -> CategoryNode:
        """Create every missing node along `path` and return the last one.

        If the whole path already exists, nothing changes and the existing node
        is returned.
        """
        raise NotImplementedError("Flow 3: CategoryTree.add_path")

    def remove(self, path: str) -> bool:
        """Remove the node and its subtree. False if missing. ValueError for the root."""
        raise NotImplementedError("Flow 3: CategoryTree.remove")

    def rename(self, path: str, new_name: str) -> CategoryNode:
        """Rename the node at `path` (its descendants' paths change with it).

        KeyError if missing. ValueError for the root, an invalid name, or if a
        sibling already has `new_name`.
        """
        raise NotImplementedError("Flow 3: CategoryTree.rename")

    def add_item(self, path: str, item: Any) -> None:
        """Append `item` to the node at `path`. KeyError if the path doesn't exist."""
        raise NotImplementedError("Flow 3: CategoryTree.add_item")

    def remove_item(self, path: str, item: Any) -> bool:
        """Remove the first item == `item` from that node. False if node or item is missing."""
        raise NotImplementedError("Flow 3: CategoryTree.remove_item")

    def items(self, path: str = "", include_subcategories: bool = True) -> list[Any]:
        """Items of the node at `path`, KeyError if it doesn't exist.

        With include_subcategories, walk the subtree in *preorder*: the node's own
        items first, then each child (in insertion order) recursively.
        """
        raise NotImplementedError("Flow 3: CategoryTree.items")

    def count(self, path: str = "", item_filter: Callable[[Any], bool] | None = None) -> int:
        """Number of items in the subtree at `path` that pass `item_filter` (all if None)."""
        raise NotImplementedError("Flow 3: CategoryTree.count")

    def depth(self) -> int:
        """Levels below the root: only root -> 0, "A" -> 1, "A/B/C" -> 3."""
        raise NotImplementedError("Flow 3: CategoryTree.depth")

    def paths(self) -> list[str]:
        """Every category path in preorder, root excluded: ["A", "A/B", "A/C", "D"]."""
        raise NotImplementedError("Flow 3: CategoryTree.paths")

    def to_dict(self, path: str = "", item_filter: Callable[[Any], bool] | None = None) -> dict:
        """Nested representation of the subtree at `path` (KeyError if missing):

        {"name": "Store", "path": "", "product_count": 7, "children": [ {...}, ... ]}

        product_count = items in the node AND all its descendants that pass `item_filter`.
        """
        raise NotImplementedError("Flow 3: CategoryTree.to_dict")
