"""Opciones de consola de navegación y búsqueda del catálogo — FLUJO 1.

Cada handler recibe el Container y habla con el usuario usando las funciones de
store/cli/prompts.py. Usá los mismos servicios que la API (container.catalog...),
nunca las estructuras directamente.
"""

from store.cli import prompts
from store.container import Container
from store.errors import ValidationError


def search_products(c: Container) -> None:
    """Pide un nombre y/o una marca (en blanco = no usar), hace la búsqueda, registra cada
    criterio en c.search_history e imprime los resultados y la cantidad de comparaciones."""
    prompts.title("Buscar productos")
    name = prompts.ask_text("Nombre (dejar en blanco para omitir)", optional=True)
    brand = prompts.ask_text("Marca (dejar en blanco para omitir)", optional=True)

    try:
        results, comparisons = c.catalog.search(name=name, brand=brand)
    except ValidationError as err:
        print(f"  Error: {err}")
        return

    if name:
        c.search_history.record(name)
    if brand:
        c.search_history.record(brand)

    prompts.print_products(results)
    print(f"\n  Comparaciones realizadas: {comparisons}")


def list_products(c: Container) -> None:
    """Pregunta "¿ordenar por código o por nombre?" e imprime los productos activos en ese orden."""
    prompts.title("Listado de productos")
    while True:
        choice = prompts.ask_text("¿Ordenar por código o por nombre? [code/name]", optional=True)
        sort = (choice or "code").lower()
        if sort in ("code", "codigo", "código"):
            sort = "code"
            break
        if sort in ("name", "nombre"):
            sort = "name"
            break
        print("  Opción inválida. Escribí 'code' o 'name'.")

    products = c.catalog.list_products(sort=sort)
    prompts.print_products(products)


def compare_search(c: Container) -> None:
    """Pide un código y muestra las comparaciones de la lista y del árbol lado a lado.

    Extra: mostrar también el promedio sobre todos los códigos, que es el número
    para citar en la defensa oral.
    """
    prompts.title("Comparar búsqueda (Lista vs BST)")
    code = prompts.ask_int("Código del producto", minimum=1)
    assert code is not None

    result = c.catalog.compare_search(code)
    estado = "Encontrado" if result["found"] else "No encontrado"
    print(f"\n  Producto {result['code']} ({estado}):")
    print(f"    - Comparaciones en Lista secuencial: {result['list_comparisons']}")
    print(f"    - Comparaciones en Árbol (BST):      {result['tree_comparisons']}")

    all_prods = c.catalog.all_products()
    if all_prods:
        total_list = 0
        total_tree = 0
        for p in all_prods:
            stats = c.catalog.compare_search(p.code)
            total_list += stats["list_comparisons"]
            total_tree += stats["tree_comparisons"]

        n = len(all_prods)
        print(f"\n  Promedio sobre todo el catálogo ({n} productos):")
        print(f"    - Promedio Lista: {total_list / n:.2f} comparaciones")
        print(f"    - Promedio Árbol: {total_tree / n:.2f} comparaciones")
