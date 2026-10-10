import pytest

from store.services.search_history import SearchHistory

pytestmark = pytest.mark.flow_reports


def test_record_normalizes_and_ignores_blank():
    history = SearchHistory(5)
    history.record("  Cola ")
    history.record("")
    history.record("   ")
    history.record(None)
    assert history.recent() == ["cola"]


def test_recent_is_most_recent_first_and_to_list_oldest_first():
    history = SearchHistory(5)
    for term in ("a", "b", "c"):
        history.record(term)
    assert history.recent() == ["c", "b", "a"]
    assert history.to_list() == ["a", "b", "c"]


def test_keeps_only_the_last_n():
    history = SearchHistory(3)
    for term in ("a", "b", "c", "d"):
        history.record(term)
    assert history.to_list() == ["b", "c", "d"]


def test_top_terms():
    history = SearchHistory(10)
    for term in ("oreo", "cola", "pepsi", "cola", "oreo", "cola"):
        history.record(term)
    assert history.top_terms() == [
        {"term": "cola", "count": 3},
        {"term": "oreo", "count": 2},
        {"term": "pepsi", "count": 1},
    ]
    assert history.top_terms(limit=1) == [{"term": "cola", "count": 3}]


def test_top_terms_ties_are_alphabetical():
    history = SearchHistory(10)
    for term in ("b", "a", "c"):
        history.record(term)
    assert [entry["term"] for entry in history.top_terms()] == ["a", "b", "c"]


def test_resize_and_load():
    history = SearchHistory(5)
    history.load(["a", "b", "c", "d"])
    assert history.recent() == ["d", "c", "b", "a"]
    history.resize(2)
    assert history.to_list() == ["c", "d"]
    history.record("e")
    assert history.to_list() == ["d", "e"]
