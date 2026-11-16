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
    if not path.strip():
        return []
    segments = [segment.strip() for segment in path.split("/")]
    for segment in segments:
        if not segment:
            raise ValueError(f"Invalid category path: {path!r} has an empty segment")
    return segments


def _check_name(name: str) -> str:
    """Devuelve el nombre sin espacios en los extremos, o ValueError si no sirve como nombre de categoría."""
    if not isinstance(name, str) or not name.strip():
        raise ValueError("category name must be a non-empty string")
    if "/" in name:
        raise ValueError("category name cannot contain '/'")
    return name.strip()


class CategoryNode:
    def __init__(self, name: str, parent: "CategoryNode | None" = None) -> None:
        self.name = name
        self.parent = parent
        self.children: list[CategoryNode] = []
        self.items: list[Any] = []

    @property
    def path(self) -> str:
        """Ruta completa desde la raíz: "" para la raíz, "Grocery/Drinks" para un nodo anidado."""
        # Subimos por los padres juntando nombres (queda al revés) y los damos vuelta al final.
        names = []
        node = self
        while node.parent is not None:  # la raíz no tiene padre y no aporta su nombre
            names.append(node.name)
            node = node.parent
        return "/".join(names[::-1])

    def find_child(self, name: str) -> "CategoryNode | None":
        for child in self.children:
            if child.name == name:
                return child
        return None

    def add_child(self, name: str) -> "CategoryNode":
        """Crea, agrega y devuelve un hijo nuevo.

        ValueError si ya existe un hijo con ese nombre, o si el nombre está vacío
        o contiene "/".
        """
        name = _check_name(name)
        if self.find_child(name) is not None:
            raise ValueError(f"'{name}' already exists under '{self.path or self.name}'")
        child = CategoryNode(name, parent=self)
        self.children.append(child)
        return child

    def remove_child(self, name: str) -> bool:
        """Elimina el hijo (con todo su subárbol). False si no existe."""
        for index in range(len(self.children)):
            if self.children[index].name == name:
                removed = self.children.pop(index)
                removed.parent = None  # el subárbol queda desconectado
                return True
        return False


class CategoryTree:
    ROOT_NAME = "Store"

    def __init__(self) -> None:
        self.root = CategoryNode(self.ROOT_NAME)

    def find(self, path: str) -> CategoryNode | None:
        """Nodo en `path` ("" -> raíz), o None si no existe."""
        node = self.root
        for name in split_path(path):
            node = node.find_child(name)
            if node is None:
                return None
        return node

    def exists(self, path: str) -> bool:
        return self.find(path) is not None

    def add_path(self, path: str) -> CategoryNode:
        """Crea todos los nodos que falten a lo largo de `path` y devuelve el último.

        Si la ruta ya existe completa, no cambia nada y devuelve el nodo existente.
        """
        node = self.root
        for name in split_path(path):  # si la ruta es inválida falla acá, antes de crear nada
            child = node.find_child(name)
            node = child if child is not None else node.add_child(name)
        return node

    def remove(self, path: str) -> bool:
        """Elimina el nodo y su subárbol. False si no existe. ValueError para la raíz."""
        if not split_path(path):
            raise ValueError("the root category cannot be removed")
        node = self.find(path)
        if node is None:
            return False
        return node.parent.remove_child(node.name)

    def rename(self, path: str, new_name: str) -> CategoryNode:
        """Renombra el nodo en `path` (las rutas de sus descendientes cambian con él).

        KeyError si no existe. ValueError para la raíz, para un nombre inválido o
        si un hermano ya se llama `new_name`.
        """
        if not split_path(path):
            raise ValueError("the root category cannot be renamed")
        node = self.find(path)
        if node is None:
            raise KeyError(path)
        new_name = _check_name(new_name)
        sibling = node.parent.find_child(new_name)
        if sibling is not None and sibling is not node:
            raise ValueError(f"a sibling is already named '{new_name}'")
        # Las rutas se calculan subiendo por los padres, así que los descendientes
        # "se enteran" solos del cambio de nombre.
        node.name = new_name
        return node

    def add_item(self, path: str, item: Any) -> None:
        """Agrega `item` al nodo en `path`. KeyError si la ruta no existe."""
        node = self.find(path)
        if node is None:
            raise KeyError(path)
        node.items.append(item)

    def remove_item(self, path: str, item: Any) -> bool:
        """Saca de ese nodo el primer item == `item`. False si falta el nodo o el item."""
        node = self.find(path)
        if node is None:
            return False
        for index in range(len(node.items)):
            if node.items[index] == item:
                node.items.pop(index)
                return True
        return False

    def items(self, path: str = "", include_subcategories: bool = True) -> list[Any]:
        """Items del nodo en `path`; KeyError si no existe.

        Con include_subcategories, recorre el subárbol en *preorden*: primero los
        items del propio nodo y después cada hijo (en orden de inserción) recursivamente.
        """
        node = self.find(path)
        if node is None:
            raise KeyError(path)
        if not include_subcategories:
            return list(node.items)  # copia: modificar el resultado no toca el árbol
        result: list[Any] = []
        self._collect(node, result)
        return result

    def _collect(self, node: CategoryNode, result: list[Any]) -> None:
        """Preorden: items del nodo y después cada hijo."""
        for item in node.items:
            result.append(item)
        for child in node.children:
            self._collect(child, result)

    def count(self, path: str = "", item_filter: Callable[[Any], bool] | None = None) -> int:
        """Cantidad de items del subárbol en `path` que pasan `item_filter` (todos si es None)."""
        total = 0
        for item in self.items(path):  # KeyError si no existe
            if item_filter is None or item_filter(item):
                total += 1
        return total

    def depth(self) -> int:
        """Niveles debajo de la raíz: solo raíz -> 0, "A" -> 1, "A/B/C" -> 3."""
        return self._depth(self.root)

    def _depth(self, node: CategoryNode) -> int:
        deepest = 0
        for child in node.children:
            level = 1 + self._depth(child)
            if level > deepest:
                deepest = level
        return deepest

    def paths(self) -> list[str]:
        """Todas las rutas en preorden, sin la raíz: ["A", "A/B", "A/C", "D"]."""
        result: list[str] = []
        for child in self.root.children:
            self._collect_paths(child, result)
        return result

    def _collect_paths(self, node: CategoryNode, result: list[str]) -> None:
        result.append(node.path)
        for child in node.children:
            self._collect_paths(child, result)

    def to_dict(self, path: str = "", item_filter: Callable[[Any], bool] | None = None) -> dict:
        """Representación anidada del subárbol en `path` (KeyError si no existe):

        {"name": "Store", "path": "", "product_count": 7, "children": [ {...}, ... ]}

        product_count = items del nodo Y de todos sus descendientes que pasan `item_filter`.
        """
        node = self.find(path)
        if node is None:
            raise KeyError(path)
        return self._node_to_dict(node, item_filter)

    def _node_to_dict(self, node: CategoryNode, item_filter: Callable[[Any], bool] | None) -> dict:
        count = 0
        for item in node.items:
            if item_filter is None or item_filter(item):
                count += 1
        children = []
        for child in node.children:
            child_dict = self._node_to_dict(child, item_filter)
            count += child_dict["product_count"]  # el conteo de un nodo incluye a sus descendientes
            children.append(child_dict)
        return {"name": node.name, "path": node.path, "product_count": count, "children": children}
