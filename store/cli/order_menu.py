"""Opciones de consola del carrito y los pedidos — FLUJO 4.

Como pide CONTRIBUTING.md, acá no hay lógica de negocio: todo pasa por c.orders
(OrderService) y c.catalog. Los StoreError los imprime cli/menu.py.
"""

from typing import Any

from store.cli import prompts
from store.container import Container
from store.errors import ProductNotFound, StoreError
from store.models.cart import Cart
from store.models.order import Order, OrderStatus

REASONS = {"not_found": "not available", "insufficient_stock": "not enough stock"}


# --- helpers de impresión ------------------------------------------------------
def _print_quote(quote: dict[str, Any], currency: str) -> None:
    if quote["lines"]:
        print(f"  {'CODE':>6}  {'NAME':<32} {'QTY':>4} {'UNIT':>10} {'SUBTOTAL':>11}")
        for line in quote["lines"]:
            print(
                f"  {line['code']:>6}  {line['name'][:32]:<32} {line['quantity']:>4}"
                f" {line['unit_price']:>10.2f} {line['subtotal']:>11.2f}"
            )
    for missing in quote["unavailable"]:
        reason = REASONS.get(missing["reason"], missing["reason"])
        print(
            f"  ! Product {missing['code']}: {reason}"
            f" (requested {missing['requested']}, available {missing['available']})"
        )
    print(f"  TOTAL: {quote['total']:.2f} {currency}")


def _print_order(order: Order, currency: str) -> None:
    print(f"  Order #{order.id} — {order.customer_name}")
    print(f"  Status: {order.status.value.upper()}    Created: {order.created_at}")
    for item in order.items:
        print(f"    {item.quantity:>3} x {item.name[:32]:<32} {item.unit_price:>10.2f} = {item.subtotal:>11.2f}")
    print(f"  TOTAL: {order.total:.2f} {currency}")


def _print_order_row(order: Order) -> None:
    print(
        f"  #{order.id:<5} {order.status.value:<10} {order.created_at:<20}"
        f" {order.customer_name[:20]:<20} {order.total:>11.2f}"
    )


# --- cliente -------------------------------------------------------------------
def shopping_cart(c: Container) -> None:
    """Arma un Cart de forma interactiva: agregar código + cantidad, quitar, ver la cotización
    (c.orders.quote) y al final pedir el nombre del cliente y hacer el pedido. Imprimir el id del pedido."""
    cart = Cart()
    currency = c.settings.currency

    while True:
        prompts.title(f"Shopping cart ({len(cart)} products)")
        print("  1. Add product")
        print("  2. Remove product")
        print("  3. View cart / quote")
        print("  4. Place order")
        print("  0. Back (discard cart)")
        choice = input("Option: ").strip()

        if choice == "1":
            code = prompts.ask_int("Product code", minimum=0)
            try:
                product = c.catalog.get(code)
            except ProductNotFound as exc:
                print(f"  {exc}")
                continue
            print(f"  {product.name} — {product.final_price:.2f} {currency} ({product.stock} in stock)")
            quantity = prompts.ask_int("Quantity", minimum=1)
            cart.add(code, quantity)
            print(f"  Added {quantity} x {product.name}.")

        elif choice == "2":
            if cart.is_empty():
                print("  The cart is empty.")
                continue
            code = prompts.ask_int("Product code to remove", minimum=0)
            print("  Removed." if cart.remove(code) else "  That product is not in the cart.")

        elif choice == "3":
            if cart.is_empty():
                print("  The cart is empty.")
                continue
            _print_quote(c.orders.quote(cart.lines()), currency)

        elif choice == "4":
            if cart.is_empty():
                print("  The cart is empty.")
                continue
            quote = c.orders.quote(cart.lines())
            _print_quote(quote, currency)
            if quote["unavailable"]:
                print("  Fix the unavailable products before placing the order.")
                continue
            if not prompts.confirm("Place this order?"):
                continue
            customer = prompts.ask_text("Your name")
            try:
                order = c.orders.place_order(customer, cart.lines())
            except StoreError as exc:  # p. ej. otro cliente compró el stock: no perdemos el carrito
                print(f"  Could not place the order: {exc}")
                continue
            print(f"\n  Order placed! Your order number is #{order.id} (status: {order.status.value}).")
            return

        elif choice == "0":
            return
        else:
            print("Invalid option.")


def track_order(c: Container) -> None:
    """Pide el id de un pedido e imprime su estado, sus items y el total."""
    order_id = prompts.ask_int("Order number", minimum=1)
    _print_order(c.orders.get(order_id), c.settings.currency)


# --- admin ---------------------------------------------------------------------
def manage_orders(c: Container) -> None:
    """Submenú de admin: 1) listar (opcionalmente por estado)  2) completar el siguiente pendiente
    3) cancelar por id. Mostrar también cuántos pedidos esperan en la cola."""
    currency = c.settings.currency
    while True:
        prompts.title(f"Orders — {c.orders.pending_count()} pending in the queue")
        print("  1. List orders")
        print("  2. Complete next pending order (oldest first)")
        print("  3. Cancel an order")
        print("  0. Back")
        choice = input("Option: ").strip()

        if choice == "1":
            valid = ", ".join(status.value for status in OrderStatus)
            status = prompts.ask_text(f"Status ({valid}) — blank for all", optional=True)
            orders = c.orders.list_orders(status)
            if not orders:
                print("  (no orders)")
            for order in orders:
                _print_order_row(order)
        elif choice == "2":
            order = c.orders.complete_next()
            print("  Completed:")
            _print_order(order, currency)
        elif choice == "3":
            order_id = prompts.ask_int("Order number to cancel", minimum=1)
            order = c.orders.cancel(order_id)
            print(f"  Order #{order.id} cancelled and its stock was returned.")
        elif choice == "0":
            return
        else:
            print("Invalid option.")
