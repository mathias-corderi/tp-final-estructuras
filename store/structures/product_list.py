"""Sequential product list — FLOW 1 (catalog browsing and search).

Keeps the products in insertion order and searches them one by one, counting
comparisons. It is the "slow" structure that we compare against the BST.

Items are any objects with `code`, `name` and `brand` attributes (in the app
they are `Product`s; in the unit tests, simple stand-ins).
Use a Python list internally, but write every search as an explicit `for` loop:
no `x in list`, no list.index(), no dicts.
Tests: tests/unit/test_product_list.py
"""

from typing import Any, Iterator


class ProductList:
    def __init__(self) -> None:
        raise NotImplementedError("Flow 1: ProductList.__init__")

    def append(self, product: Any) -> None:
        """Add at the end. Does NOT check duplicates (CatalogService does it with the BST)."""
        raise NotImplementedError("Flow 1: ProductList.append")

    def remove(self, code: int) -> Any | None:
        """Remove and return the product with that code, or None if missing."""
        raise NotImplementedError("Flow 1: ProductList.remove")

    def find_by_code(self, code: int) -> tuple[Any | None, int]:
        """Sequential search that stops at the first match.

        Return (product or None, comparisons), comparisons = items examined.
        """
        raise NotImplementedError("Flow 1: ProductList.find_by_code")

    def search_by_name(self, text: str) -> tuple[list[Any], int]:
        """Case-insensitive *substring* match on `name`.

        Walks the whole list, so comparisons == len(self).
        Results keep list order.
        """
        raise NotImplementedError("Flow 1: ProductList.search_by_name")

    def search_by_brand(self, text: str) -> tuple[list[Any], int]:
        """Same as search_by_name, but on `brand`."""
        raise NotImplementedError("Flow 1: ProductList.search_by_brand")

    def to_list(self) -> list[Any]:
        """A copy of the items in list order (changing the copy must not affect the list)."""
        raise NotImplementedError("Flow 1: ProductList.to_list")

    def __len__(self) -> int:
        raise NotImplementedError("Flow 1: ProductList.__len__")

    def __iter__(self) -> Iterator[Any]:
        raise NotImplementedError("Flow 1: ProductList.__iter__")
