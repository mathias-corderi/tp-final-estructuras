"""FLUJO 5 — load() restaura el historial del archivo: reemplaza lo que hubiera, no lo suma."""

import pytest

from store.services.search_history import SearchHistory

pytestmark = pytest.mark.flow_reports


def test_load_replaces_the_current_terms():
    history = SearchHistory(5)
    history.record("pepsi")

    history.load(["cola", "oreo"])

    assert history.to_list() == ["cola", "oreo"]


def test_loading_twice_does_not_duplicate_terms():
    history = SearchHistory(5)

    history.load(["cola", "oreo"])
    history.load(["cola", "oreo"])

    assert history.to_list() == ["cola", "oreo"]
