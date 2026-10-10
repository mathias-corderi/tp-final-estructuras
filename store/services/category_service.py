"""Category service — FLOW 3 (categories).

Business rules on top of CategoryTree. The tree's items are the Product
objects themselves (CatalogService puts them there), so this service can read
and change them directly (product.category, product.price).

Translate the tree's exceptions: KeyError -> CategoryNotFound, bad paths or
names (ValueError) -> ValidationError.
Customers only see ACTIVE products; the owner (reports) sees all of them.
"""

from typing import Any, Callable

from store.models.product import Product
from store.structures.category_tree import CategoryTree


class CategoryService:
    def __init__(self, tree: CategoryTree, on_change: Callable[[], None] | None = None) -> None:
        raise NotImplementedError("Flow 3: CategoryService.__init__")

    def load(self, paths: list[str]) -> None:
        """Create the categories read from storage (no on_change)."""
        raise NotImplementedError("Flow 3: CategoryService.load")

    def paths(self) -> list[str]:
        """All category paths in preorder (this is what gets persisted)."""
        raise NotImplementedError("Flow 3: CategoryService.paths")

    def tree(self) -> dict[str, Any]:
        """Whole tree as a nested dict (CategoryTree.to_dict) counting only active products."""
        raise NotImplementedError("Flow 3: CategoryService.tree")

    def products(self, path: str, include_subcategories: bool = True) -> list[Product]:
        """Active products of the category (preorder if include_subcategories). CategoryNotFound."""
        raise NotImplementedError("Flow 3: CategoryService.products")

    def create(self, path: str) -> dict[str, Any]:
        """Create the category and any missing parent. Return its dict (like tree()).

        Blank or invalid path -> ValidationError. Already exists -> CategoryAlreadyExists.
        """
        raise NotImplementedError("Flow 3: CategoryService.create")

    def rename(self, path: str, new_name: str) -> dict[str, Any]:
        """Rename the LAST segment of `path` and return the renamed node's dict.

        - Root ("") or invalid new name (blank / contains "/") -> ValidationError.
        - Missing -> CategoryNotFound. A sibling already named new_name -> CategoryAlreadyExists.
        - Every product in the subtree must get its `category` updated:
          renaming "Grocery" to "Food" turns "Grocery/Drinks/Sodas" into "Food/Drinks/Sodas".
        """
        raise NotImplementedError("Flow 3: CategoryService.rename")

    def delete(self, path: str) -> None:
        """Remove an EMPTY category.

        Root -> ValidationError. Missing -> CategoryNotFound.
        Has subcategories or products (inactive ones too) -> CategoryNotEmpty.
        """
        raise NotImplementedError("Flow 3: CategoryService.delete")

    def adjust_prices(self, path: str, percent: float) -> list[Product]:
        """Raise or lower the price of EVERY product in the subtree (inactive too) by `percent`.

        - percent must be a number between -90 and 500 and not 0 (ValidationError).
        - new price = round(price * (1 + percent / 100), 2).
        - Return the updated products in preorder. CategoryNotFound if missing.
        - Not undoable (it's not a CatalogService operation).
        """
        raise NotImplementedError("Flow 3: CategoryService.adjust_prices")
