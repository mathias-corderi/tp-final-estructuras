"""Catalog service — FLOW 1 (queries) + FLOW 2 (administration).

Facade over every structure that holds products. It must keep them IN SYNC on
every add / update / delete:

  self._list      ProductList           insertion order, sequential search      (Flow 1)
  self._by_code   BinarySearchTree      key = product.code                      (Flow 1)
  self._by_name   BinarySearchTree      key = (product.name.lower(), product.code)
  self._categories  CategoryTree        each product is an item of the node
                                        at product.category                     (Flow 3)
  self._undo      Stack of Operation    one entry per admin change              (Flow 2)

Those attribute names are the contract between Flow 1 and Flow 2: Flow 2
creates them in __init__, Flow 1 reads them in the query methods.

All structures hold the SAME Product objects (references), so changing
product.stock in one place is visible everywhere. Only changes to the *keys*
(name, category) need extra work: remove with the old key, insert with the new one.

`on_change` is called after every successful change so the container saves the
JSON file. load() and change_stock() must NOT call it.
Errors: raise the classes in store/errors.py, never return None for "not found".
"""

from typing import Any, Callable, Iterable

from store.models.product import Product
from store.models.settings import StoreSettings
from store.services.undo import Operation
from store.structures.category_tree import CategoryTree


class CatalogService:
    UPDATABLE_FIELDS = ("name", "brand", "price", "category", "min_stock", "discount_percent", "active")

    def __init__(
        self,
        categories: CategoryTree,
        settings: StoreSettings,
        on_change: Callable[[], None] | None = None,
    ) -> None:
        """FLOW 2. Create the structures listed above (empty) and keep the arguments."""
        raise NotImplementedError("Flow 2: CatalogService.__init__")

    # ======================================================================
    # FLOW 2 — administration
    # ======================================================================
    def load(self, products: Iterable[Product]) -> None:
        """Insert products read from storage: no undo record, no on_change.

        DuplicateCode if a code repeats, CategoryNotFound if its category doesn't exist.
        """
        raise NotImplementedError("Flow 2: CatalogService.load")

    def all_products(self) -> list[Product]:
        """Every product (inactive too) in list order. Used by reports and storage."""
        raise NotImplementedError("Flow 2: CatalogService.all_products")

    def add(self, data: dict[str, Any]) -> Product:
        """Create a product from a dict with Product's constructor fields.

        - min_stock missing or None -> settings.default_min_stock.
        - Invalid data -> ValidationError. Duplicate code -> DuplicateCode.
          Category doesn't exist -> CategoryNotFound.
        - Push an ADD Operation and call on_change.
        """
        raise NotImplementedError("Flow 2: CatalogService.add")

    def update(self, code: int, changes: dict[str, Any]) -> Product:
        """Change some fields of a product (only UPDATABLE_FIELDS; code and stock can't change here).

        - ProductNotFound; empty changes or unknown field -> ValidationError.
        - Validate EVERYTHING first: if any value is invalid (ValidationError) or the new
          category doesn't exist (CategoryNotFound), nothing changes.
        - Re-sync _by_name if the name changed and the category tree if the category changed.
        - Push an UPDATE Operation (before/after with only the changed fields) and call on_change.
        """
        raise NotImplementedError("Flow 2: CatalogService.update")

    def delete(self, code: int) -> Product:
        """Remove from every structure. ProductNotFound. Push a DELETE Operation, call on_change."""
        raise NotImplementedError("Flow 2: CatalogService.delete")

    def restock(self, code: int, quantity: int) -> Product:
        """Add units. quantity must be an int > 0 (ValidationError). Push a STOCK Operation."""
        raise NotImplementedError("Flow 2: CatalogService.restock")

    def adjust_stock(self, code: int, delta: int, reason: str) -> Product:
        """Correct the stock (breakage, inventory count...). delta may be negative.

        - delta must be a non-zero int and reason a non-blank str (ValidationError).
        - If the stock would go below 0 -> InsufficientStock and nothing changes.
        - Push a STOCK Operation (the description includes the reason) and call on_change.
        """
        raise NotImplementedError("Flow 2: CatalogService.adjust_stock")

    def change_stock(self, code: int, delta: int) -> Product:
        """Used by OrderService to reserve/release stock. NOT undoable, does NOT call on_change.

        ProductNotFound (inactive products are found too). InsufficientStock if it would go below 0.
        """
        raise NotImplementedError("Flow 2: CatalogService.change_stock")

    def undo(self) -> Operation:
        """Revert the most recent operation and return it. NothingToUndo if the stack is empty.

        If reverting fails (e.g. the stock is now too low), raise and keep the
        operation on the stack. Reverting does NOT push a new operation.
        """
        raise NotImplementedError("Flow 2: CatalogService.undo")

    def undo_history(self) -> list[Operation]:
        """Pending operations, most recent first."""
        raise NotImplementedError("Flow 2: CatalogService.undo_history")

    # ======================================================================
    # FLOW 1 — queries
    # ======================================================================
    def list_products(self, sort: str = "code", include_inactive: bool = False) -> list[Product]:
        """Products in BST inorder: sort="code" uses _by_code, sort="name" uses _by_name.

        Any other sort -> ValidationError. Inactive products only if include_inactive.
        """
        raise NotImplementedError("Flow 1: CatalogService.list_products")

    def get(self, code: int, include_inactive: bool = False) -> Product:
        """Look the code up in _by_code. ProductNotFound if missing, or inactive and not include_inactive."""
        raise NotImplementedError("Flow 1: CatalogService.get")

    def search(self, name: str | None = None, brand: str | None = None) -> tuple[list[Product], int]:
        """Sequential search in _list. Returns (active results in list order, comparisons).

        - At least one non-blank criterion, otherwise ValidationError.
        - Only name: search_by_name. Only brand: search_by_brand.
        - Both: products matching BOTH; comparisons = the two searches added.
        """
        raise NotImplementedError("Flow 1: CatalogService.search")

    def compare_search(self, code: int) -> dict[str, Any]:
        """Search the same code in the list and in the BST (inactive products count as found).

        {"code": 80, "found": True, "list_comparisons": 7, "tree_comparisons": 3}
        """
        raise NotImplementedError("Flow 1: CatalogService.compare_search")

    def tree_heights(self) -> dict[str, int]:
        """{"by_code": _by_code.height(), "by_name": _by_name.height()} (used by reports)."""
        raise NotImplementedError("Flow 1: CatalogService.tree_heights")
