"""Main console menu. Shared code — already implemented.

Each option calls a function `handler(container)` that lives in the menu file
of its flow (catalog_menu.py, category_menu.py, ...). Those handlers are what
each member implements. Business errors (StoreError) are printed here, so
handlers don't need to catch them.
"""

from typing import Callable

from store import config
from store.cli import admin_products_menu, admin_reports_menu, catalog_menu, category_menu, order_menu
from store.cli.prompts import pause, title
from store.container import Container, build_default_container
from store.errors import StoreError

Handler = Callable[[Container], None]
Action = Callable[[], None]
MenuEntries = list[tuple[str, str, Action | None]]


class ConsoleApp:
    def __init__(self) -> None:
        self._container: Container | None = None

    @property
    def container(self) -> Container:
        if self._container is None:
            self._container = build_default_container()
        return self._container

    def store_name(self) -> str:
        try:
            return self.container.settings.store_name
        except NotImplementedError:
            return "STORE"

    # --- menus -------------------------------------------------------------------
    def main_menu(self) -> MenuEntries:
        flow = self.flow
        return [
            ("1", "Search products", flow(catalog_menu.search_products)),
            ("2", "Browse by category", flow(category_menu.browse_categories)),
            ("3", "List all products (sorted)", flow(catalog_menu.list_products)),
            ("4", "Compare search efficiency (list vs tree)", flow(catalog_menu.compare_search)),
            ("5", "Shopping cart / place order", flow(order_menu.shopping_cart)),
            ("6", "Track an order", flow(order_menu.track_order)),
            ("9", "Admin mode", self.admin_mode),
            ("0", "Exit", None),
        ]

    def admin_menu(self) -> MenuEntries:
        flow = self.flow
        return [
            ("1", "List all products (incl. inactive)", flow(admin_products_menu.list_all_products)),
            ("2", "Add product", flow(admin_products_menu.add_product)),
            ("3", "Edit product", flow(admin_products_menu.edit_product)),
            ("4", "Delete product", flow(admin_products_menu.delete_product)),
            ("5", "Restock / adjust stock", flow(admin_products_menu.manage_stock)),
            ("6", "Undo last operation", flow(admin_products_menu.undo_last)),
            ("7", "Manage categories", flow(category_menu.manage_categories)),
            ("8", "Bulk price adjustment by category", flow(category_menu.price_adjustment)),
            ("9", "Orders: list / process next / cancel", flow(order_menu.manage_orders)),
            ("10", "Reports & statistics", flow(admin_reports_menu.show_reports)),
            ("11", "Export catalog to a text file", flow(admin_reports_menu.export_catalog)),
            ("12", "Store settings", flow(admin_reports_menu.edit_settings)),
            ("0", "Back", None),
        ]

    def admin_mode(self) -> None:
        token = input("Admin token: ").strip()
        if token != config.admin_token():
            print("Wrong token.")
            pause()
            return
        self.loop(lambda: f"{self.store_name()} — ADMIN", self.admin_menu)

    # --- loop --------------------------------------------------------------------
    def flow(self, handler: Handler) -> Action:
        """Wrap a flow handler: give it the container, print errors, then pause."""

        def action() -> None:
            try:
                handler(self.container)
            except StoreError as exc:
                print(f"\n  Error: {exc}")
            except NotImplementedError as exc:
                print(f"\n  [not implemented yet] {exc}")
            pause()

        return action

    def loop(self, heading: Callable[[], str], options: Callable[[], MenuEntries]) -> None:
        while True:
            title(heading())
            entries = options()
            for key, label, _ in entries:
                print(f" {key:>2}. {label}")
            print("-" * 50)
            choice = input("Option: ").strip()
            selected = next((entry for entry in entries if entry[0] == choice), None)
            if selected is None:
                print("Invalid option.")
                continue
            action = selected[2]
            if action is None:
                return
            action()

    def run(self) -> None:
        try:
            self.loop(lambda: f"{self.store_name()} — MAIN MENU", self.main_menu)
        except (KeyboardInterrupt, EOFError):
            print()
        print("Bye!")
