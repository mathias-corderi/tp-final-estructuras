"""Historial de búsquedas — FLUJO 5 (reportes, configuración y persistencia).

Recuerda los últimos N términos que buscaron los clientes, para que el dueño vea
qué se busca. Usa la Queue acotada (store/structures/linked_queue.py): cuando
se llena, se descarta la búsqueda más vieja.

GET /products/search (Flujo 1) llama a `record()` por cada criterio que recibe.
Tests: tests/unit/test_search_history.py
"""

from typing import Any


class SearchHistory:
    def __init__(self, max_size: int) -> None:
        raise NotImplementedError("Flow 5: SearchHistory.__init__")

    def record(self, term: str | None) -> None:
        """Guarda el término sin espacios en los extremos y en minúsculas. Ignora None o términos en blanco."""
        raise NotImplementedError("Flow 5: SearchHistory.record")

    def recent(self) -> list[str]:
        """Términos recordados, el más reciente primero."""
        raise NotImplementedError("Flow 5: SearchHistory.recent")

    def top_terms(self, limit: int = 5) -> list[dict[str, Any]]:
        """[{"term": "cola", "count": 3}, ...] contando solo las búsquedas recordadas.

        Orden: count descendente y después term alfabético. Como máximo `limit` entradas.
        """
        raise NotImplementedError("Flow 5: SearchHistory.top_terms")

    def resize(self, max_size: int) -> None:
        """Cambia cuántas búsquedas se recuerdan (descarta las más viejas si hace falta)."""
        raise NotImplementedError("Flow 5: SearchHistory.resize")

    def load(self, terms: list[str]) -> None:
        """Restaura desde el archivo. `terms` viene con el más viejo primero (el formato de to_list)."""
        raise NotImplementedError("Flow 5: SearchHistory.load")

    def to_list(self) -> list[str]:
        """Términos recordados, el MÁS VIEJO primero (es lo que se guarda en el archivo)."""
        raise NotImplementedError("Flow 5: SearchHistory.to_list")
