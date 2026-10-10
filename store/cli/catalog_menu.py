"""Console options for catalog browsing and search — FLOW 1.

Each handler receives the Container and talks to the user with the helpers in
store/cli/prompts.py. Use the same services as the API (container.catalog...),
never the structures directly.
"""

from store.cli import prompts  # noqa: F401  (helpers you will need)
from store.container import Container


def search_products(c: Container) -> None:
    """Ask for a name and/or a brand (blank = skip), run the search, record each criterion
    in c.search_history, and print the results and the number of comparisons."""
    raise NotImplementedError("Flow 1: search_products (console)")


def list_products(c: Container) -> None:
    """Ask "sort by code or name?" and print the active products in that order."""
    raise NotImplementedError("Flow 1: list_products (console)")


def compare_search(c: Container) -> None:
    """Ask for a code and show list comparisons vs tree comparisons side by side.

    Bonus: also show the average over every product code, which is the number
    to quote in the oral defense.
    """
    raise NotImplementedError("Flow 1: compare_search (console)")
