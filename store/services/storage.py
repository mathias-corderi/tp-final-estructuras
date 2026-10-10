"""JSON persistence — FLOW 5 (reports, settings and persistence).

Reads and writes the whole store state as ONE JSON file. It doesn't know about
products or orders: it receives and returns plain dicts (Container builds them).

File format (see data/seed.json):
{
  "settings":       {...StoreSettings.to_dict()},
  "categories":     ["Grocery", "Grocery/Drinks", ...],      # preorder
  "products":       [{...Product.to_dict()}, ...],
  "orders":         [{...Order.to_dict()}, ...],              # id ascending
  "search_history": ["cola", "oreo", ...]                     # oldest first
}
Tests: tests/unit/test_storage.py
"""

from pathlib import Path
from typing import Any

EMPTY_DATA: dict[str, Any] = {
    "settings": {},
    "categories": [],
    "products": [],
    "orders": [],
    "search_history": [],
}


class JsonStorage:
    def __init__(self, path: Path | str) -> None:
        raise NotImplementedError("Flow 5: JsonStorage.__init__")

    @property
    def path(self) -> Path:
        raise NotImplementedError("Flow 5: JsonStorage.path")

    def load(self) -> dict[str, Any]:
        """Read the file and return its data.

        - Missing file -> a fresh copy of EMPTY_DATA (never the same object twice:
          modifying the result must not modify EMPTY_DATA).
        - Missing keys are filled with the EMPTY_DATA defaults.
        - Invalid JSON, or JSON that isn't an object -> ValueError.
        """
        raise NotImplementedError("Flow 5: JsonStorage.load")

    def save(self, data: dict[str, Any]) -> None:
        """Write `data` as UTF-8 JSON (indent=2, ensure_ascii=False so "Ayudín" stays readable).

        - Create the parent directory if needed.
        - Write to a temporary file next to the target and then os.replace() it,
          so a crash in the middle never leaves a half-written store.json.
        """
        raise NotImplementedError("Flow 5: JsonStorage.save")
