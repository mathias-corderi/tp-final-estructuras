"""Funciones de entrada/salida para los menús de consola. Código compartido — ya implementado.

Cada ask_* sigue preguntando hasta que la respuesta sea válida. Con `optional=True`,
una respuesta vacía devuelve None (útil para "dejar en blanco para mantener el valor actual").
"""

from typing import Iterable

from store.models.product import Product


def ask_text(prompt: str, optional: bool = False) -> str | None:
    while True:
        value = input(f"{prompt}: ").strip()
        if value or optional:
            return value or None
        print("  A value is required.")


def ask_int(prompt: str, minimum: int | None = None, optional: bool = False) -> int | None:
    while True:
        raw = input(f"{prompt}: ").strip()
        if not raw and optional:
            return None
        try:
            value = int(raw)
        except ValueError:
            print("  Enter a whole number.")
            continue
        if minimum is not None and value < minimum:
            print(f"  Must be at least {minimum}.")
            continue
        return value


def ask_float(prompt: str, minimum: float | None = None, optional: bool = False) -> float | None:
    while True:
        raw = input(f"{prompt}: ").strip().replace(",", ".")
        if not raw and optional:
            return None
        try:
            value = float(raw)
        except ValueError:
            print("  Enter a number.")
            continue
        if minimum is not None and value < minimum:
            print(f"  Must be at least {minimum}.")
            continue
        return value


def confirm(prompt: str) -> bool:
    return input(f"{prompt} [y/N]: ").strip().lower() in ("y", "yes", "s", "si", "sí")


def pause() -> None:
    input("\nPress Enter to continue...")


def title(text: str) -> None:
    print()
    print("=" * 50)
    print(f" {text}")
    print("=" * 50)


def print_products(products: Iterable[Product]) -> None:
    """Un producto por línea, como tabla."""
    products = list(products)
    if not products:
        print("  (no products)")
        return
    print(f"  {'CODE':>6}  {'NAME':<32} {'BRAND':<14} {'PRICE':>10} {'STOCK':>6}")
    for p in products:
        flag = "" if p.active else "  [inactive]"
        print(f"  {p.code:>6}  {p.name[:32]:<32} {p.brand[:14]:<14} {p.final_price:>10.2f} {p.stock:>6}{flag}")
