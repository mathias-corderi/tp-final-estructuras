"""Historial de búsquedas — FLUJO 5 (reportes, configuración y persistencia).

Recuerda los últimos N términos que buscaron los clientes, para que el dueño vea
qué se busca. Usa la Queue acotada (store/structures/linked_queue.py): cuando
se llena, se descarta la búsqueda más vieja.

GET /products/search (Flujo 1) llama a `record()` por cada criterio que recibe.
Tests: tests/unit/test_search_history.py
"""

from typing import Any

from store.structures.linked_queue import Queue


class SearchHistory:
    def __init__(self, max_size: int) -> None:
        self._terms = Queue(max_size)

    def record(self, term: str | None) -> None:
        """Guarda el término sin espacios en los extremos y en minúsculas. Ignora None o términos en blanco."""
        if term is None:
            return
        normalized = term.strip().lower()
        if normalized:
            self._terms.enqueue(normalized)  # si está llena, la cola descarta sola la más vieja

    def recent(self) -> list[str]:
        """Términos recordados, el más reciente primero."""
        return self.to_list()[::-1]

    def top_terms(self, limit: int = 5) -> list[dict[str, Any]]:
        """[{"term": "cola", "count": 3}, ...] contando solo las búsquedas recordadas.

        Orden: count descendente y después term alfabético. Como máximo `limit` entradas.
        """
        counts: dict[str, int] = {}
        for term in self._terms.to_list():
            counts[term] = counts.get(term, 0) + 1
        ranking = sorted(counts.items(), key=lambda entry: (-entry[1], entry[0]))
        return [{"term": term, "count": count} for term, count in ranking[:limit]]

    def resize(self, max_size: int) -> None:
        """Cambia cuántas búsquedas se recuerdan (descarta las más viejas si hace falta)."""
        self._terms.resize(max_size)

    def load(self, terms: list[str]) -> None:
        """Restaura desde el archivo. `terms` viene con el más viejo primero (el formato de to_list)."""
        for term in terms:
            self._terms.enqueue(term)

    def to_list(self) -> list[str]:
        """Términos recordados, el MÁS VIEJO primero (es lo que se guarda en el archivo)."""
        return self._terms.to_list()
