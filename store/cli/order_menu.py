"""Opciones de consola del carrito y los pedidos — FLUJO 4."""

from store.cli import prompts  # noqa: F401  (funciones que vas a necesitar)
from store.container import Container


def shopping_cart(c: Container) -> None:
    """Arma un Cart de forma interactiva: agregar código + cantidad, quitar, ver la cotización
    (c.orders.quote) y al final pedir el nombre del cliente y hacer el pedido. Imprimir el id del pedido."""
    raise NotImplementedError("Flow 4: shopping_cart (console)")


def track_order(c: Container) -> None:
    """Pide el id de un pedido e imprime su estado, sus items y el total."""
    raise NotImplementedError("Flow 4: track_order (console)")


def manage_orders(c: Container) -> None:
    """Submenú de admin: 1) listar (opcionalmente por estado)  2) completar el siguiente pendiente
    3) cancelar por id. Mostrar también cuántos pedidos esperan en la cola."""
    raise NotImplementedError("Flow 4: manage_orders (console)")
