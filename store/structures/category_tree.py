"""Árbol de categorías (n-ario) — FLUJO 3 (categorías).

Cada nodo es una categoría que puede tener cualquier cantidad de subcategorías,
y los productos ("items") cuelgan del nodo de su categoría:

    Store                      <- raíz, ruta ""
    ├── Grocery                <- ruta "Grocery"
    │   ├── Drinks             <- ruta "Grocery/Drinks"
    │   │   └── Sodas  -> [Coca-Cola, Sprite]
    │   └── Snacks     -> [Oreo]
    └── Cleaning       -> [Bleach]

Las rutas son nombres unidos con "/", sin la raíz. Los nombres distinguen mayúsculas.
Los items se comparan con `==` (dos Product son iguales si tienen el mismo código).
Hijos e items mantienen el orden de inserción.
Tests: tests/unit/test_category_tree.py
"""

from typing import Any, Callable


def split_path(path: str) -> list[str]:
    """Convierte "Grocery / Drinks" en ["Grocery", "Drinks"].

    - A cada segmento se le sacan los espacios de los extremos.
    - Una ruta en blanco ("" o "   ") es la raíz -> [].
    - Un segmento vacío ("A//B", "/A", "A/") -> ValueError.
    """
    raise NotImplementedError("Flow 3: split_path")


class CategoryNode:
    def __init__(self, name: str, parent: "CategoryNode | None" = None) -> None:
        self.name = name
        self.parent = parent
        self.children: list[CategoryNode] = []
        self.items: list[Any] = []

    @property
    def path(self) -> str:
        """Ruta completa desde la raíz: "" para la raíz, "Grocery/Drinks" para un nodo anidado."""
        raise NotImplementedError("Flow 3: CategoryNode.path")

    def find_child(self, name: str) -> "CategoryNode | None":
        raise NotImplementedError("Flow 3: CategoryNode.find_child")

    def add_child(self, name: str) -> "CategoryNode":
        """Crea, agrega y devuelve un hijo nuevo.

        ValueError si ya existe un hijo con ese nombre, o si el nombre está vacío
        o contiene "/".
        """
        raise NotImplementedError("Flow 3: CategoryNode.add_child")

    def remove_child(self, name: str) -> bool:
        """Elimina el hijo (con todo su subárbol). False si no existe."""
        raise NotImplementedError("Flow 3: CategoryNode.remove_child")


class CategoryTree:
    ROOT_NAME = "Store"

    def __init__(self) -> None:
        self.root = CategoryNode(self.ROOT_NAME)

    def find(self, path: str) -> CategoryNode | None:
        """Nodo en `path` ("" -> raíz), o None si no existe."""
        raise NotImplementedError("Flow 3: CategoryTree.find")

    def exists(self, path: str) -> bool:
        raise NotImplementedError("Flow 3: CategoryTree.exists")

    def add_path(self, path: str) -> CategoryNode:
        """Crea todos los nodos que falten a lo largo de `path` y devuelve el último.

        Si la ruta ya existe completa, no cambia nada y devuelve el nodo existente.
        """
        raise NotImplementedError("Flow 3: CategoryTree.add_path")

    def remove(self, path: str) -> bool:
        """Elimina el nodo y su subárbol. False si no existe. ValueError para la raíz."""
        raise NotImplementedError("Flow 3: CategoryTree.remove")

    def rename(self, path: str, new_name: str) -> CategoryNode:
        """Renombra el nodo en `path` (las rutas de sus descendientes cambian con él).

        KeyError si no existe. ValueError para la raíz, para un nombre inválido o
        si un hermano ya se llama `new_name`.
        """
        raise NotImplementedError("Flow 3: CategoryTree.rename")

    def add_item(self, path: str, item: Any) -> None:
        """Agrega `item` al nodo en `path`. KeyError si la ruta no existe."""
        raise NotImplementedError("Flow 3: CategoryTree.add_item")

    def remove_item(self, path: str, item: Any) -> bool:
        """Saca de ese nodo el primer item == `item`. False si falta el nodo o el item."""
        raise NotImplementedError("Flow 3: CategoryTree.remove_item")

    def items(self, path: str = "", include_subcategories: bool = True) -> list[Any]:
        """Items del nodo en `path`; KeyError si no existe.

        Con include_subcategories, recorre el subárbol en *preorden*: primero los
        items del propio nodo y después cada hijo (en orden de inserción) recursivamente.
        """
        raise NotImplementedError("Flow 3: CategoryTree.items")

    def count(self, path: str = "", item_filter: Callable[[Any], bool] | None = None) -> int:
        """Cantidad de items del subárbol en `path` que pasan `item_filter` (todos si es None)."""
        raise NotImplementedError("Flow 3: CategoryTree.count")

    def depth(self) -> int:
        """Niveles debajo de la raíz: solo raíz -> 0, "A" -> 1, "A/B/C" -> 3."""
        raise NotImplementedError("Flow 3: CategoryTree.depth")

    def paths(self) -> list[str]:
        """Todas las rutas en preorden, sin la raíz: ["A", "A/B", "A/C", "D"]."""
        raise NotImplementedError("Flow 3: CategoryTree.paths")

    def to_dict(self, path: str = "", item_filter: Callable[[Any], bool] | None = None) -> dict:
        """Representación anidada del subárbol en `path` (KeyError si no existe):

        {"name": "Store", "path": "", "product_count": 7, "children": [ {...}, ... ]}

        product_count = items del nodo Y de todos sus descendientes que pasan `item_filter`.
        """
        raise NotImplementedError("Flow 3: CategoryTree.to_dict")
