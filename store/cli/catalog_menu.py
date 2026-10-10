"""Opciones de consola de navegación y búsqueda del catálogo — FLUJO 1.

Cada handler recibe el Container y habla con el usuario usando las funciones de
store/cli/prompts.py. Usá los mismos servicios que la API (container.catalog...),
nunca las estructuras directamente.
"""

from store.cli import prompts  # noqa: F401  (funciones que vas a necesitar)
from store.container import Container


def search_products(c: Container) -> None:
    """Pide un nombre y/o una marca (en blanco = no usar), hace la búsqueda, registra cada
    criterio en c.search_history e imprime los resultados y la cantidad de comparaciones."""
    raise NotImplementedError("Flow 1: search_products (console)")


def list_products(c: Container) -> None:
    """Pregunta "¿ordenar por código o por nombre?" e imprime los productos activos en ese orden."""
    raise NotImplementedError("Flow 1: list_products (console)")


def compare_search(c: Container) -> None:
    """Pide un código y muestra las comparaciones de la lista y del árbol lado a lado.

    Extra: mostrar también el promedio sobre todos los códigos, que es el número
    para citar en la defensa oral.
    """
    raise NotImplementedError("Flow 1: compare_search (console)")
