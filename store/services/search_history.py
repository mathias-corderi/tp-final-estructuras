"""Search history — FLOW 5 (reports, settings and persistence).

Remembers the last N search terms customers used, so the owner can see what
people look for. Built on the bounded Queue (store/structures/linked_queue.py):
when it is full, the oldest search is dropped.

GET /products/search (Flow 1) calls `record()` for every criterion it receives.
Tests: tests/unit/test_search_history.py
"""

from typing import Any


class SearchHistory:
    def __init__(self, max_size: int) -> None:
        raise NotImplementedError("Flow 5: SearchHistory.__init__")

    def record(self, term: str | None) -> None:
        """Store the term stripped and lowercased. Blank or None terms are ignored."""
        raise NotImplementedError("Flow 5: SearchHistory.record")

    def recent(self) -> list[str]:
        """Remembered terms, most recent first."""
        raise NotImplementedError("Flow 5: SearchHistory.recent")

    def top_terms(self, limit: int = 5) -> list[dict[str, Any]]:
        """[{"term": "cola", "count": 3}, ...] counting only the remembered searches.

        Order: count descending, then term alphabetically. At most `limit` entries.
        """
        raise NotImplementedError("Flow 5: SearchHistory.top_terms")

    def resize(self, max_size: int) -> None:
        """Change how many searches are remembered (drops the oldest if needed)."""
        raise NotImplementedError("Flow 5: SearchHistory.resize")

    def load(self, terms: list[str]) -> None:
        """Restore from storage. `terms` come oldest first (the format of to_list)."""
        raise NotImplementedError("Flow 5: SearchHistory.load")

    def to_list(self) -> list[str]:
        """Remembered terms, OLDEST first (this is what gets persisted)."""
        raise NotImplementedError("Flow 5: SearchHistory.to_list")
