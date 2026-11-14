

from typing import Any


class BSTNode:
    """Un nodo del árbol. Ya está implementado."""

    def __init__(self, key: Any, value: Any) -> None:
        self.key = key
        self.value = value
        self.left: "BSTNode | None" = None
        self.right: "BSTNode | None" = None


class BinarySearchTree:
    """Las claves menores van a la izquierda y las mayores a la derecha. No se repiten claves."""

    def __init__(self) -> None:
        self.root: BSTNode | None = None
        self._size = 0

    def insert(self, key: Any, value: Any) -> None:
        """Inserta `value` con la clave `key`. Si la clave ya existe, reemplaza el valor (el tamaño no cambia)."""
        if self.root is None:
            self.root = BSTNode(key, value)
            self._size = 1
            return
        
        current = self.root
        while True:
            if key == current.key:
                current.value = value
                return
                        
            elif key < current.key:
                if current.left is None:
                    current.left = BSTNode(key, value)
                    self._size += 1
                    return
                current = current.left
            else:
                if current.right is None:
                    current.right = BSTNode(key, value)
                    self._size += 1
                    return
                current = current.right
        
    

    def search(self, key: Any) -> tuple[Any | None, int]:
        """Devuelve (valor, comparaciones)."""
        comparisons = 0
        current = self.root
        
        while current is not None:
            comparisons += 1
            if key == current.key:
                return (current.value, comparisons)
            elif key < current.key:
                current = current.left
            else:
                current = current.right
                
        return (None, comparisons)
        

    def contains(self, key: Any) -> bool:
        value, _ = self.search(key)
        return value is not None

    def delete(self, key: Any) -> bool:
        """Elimina el nodo con `key`. Devuelve True si lo eliminó, False si no estaba.

        Tres casos: hoja, un hijo, dos hijos (se reemplaza por el sucesor inorden).
        """
        deleted = False
        
        def _deleted(node: BSTNode | None, k: Any) -> BSTNode | None:
            nonlocal deleted
            if node is None:
                return None
            
            if k < node.key:
                node.left = _deleted(node.left, k)
            elif k > node.key:
                node.right = _deleted(node.right, k)
            else:
                deleted = True
                if node.left is None:
                    return node.right
                if node.right is None:
                    return node.left
                    
                successor = node.right
                while successor.left is not None:
                    successor = successor.left
                    
                node.key = successor.key
                node.value = successor.value
                node.right = _deleted(node.right, successor.key)
                
            return node
        
        self.root = _deleted(self.root, key)
        if deleted:
            self._size -= 1
        return deleted
            

    def inorder(self) -> list[Any]:
        """Valores en orden ascendente de clave (izquierda -> nodo -> derecha)."""
        result = []
        
        def _traverse(node: BSTNode | None) -> None:
            if node is not None:
                _traverse(node.left)
                result.append(node.value)
                _traverse(node.right)
                
        _traverse(self.root)
        return result
        

    def height(self) -> int:
        """Árbol vacío -> 0, un solo nodo -> 1."""
        def _get_height(node: BSTNode | None) -> int:
            if node is None:
                return 0
            return 1 + max(_get_height(node.left), _get_height(node.right))
        return _get_height(self.root)

    def is_empty(self) -> bool:
        return self.root is None

    def __len__(self) -> int:
        return self._size
