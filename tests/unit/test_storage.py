import json

import pytest

from store.services.storage import EMPTY_DATA, JsonStorage

pytestmark = pytest.mark.flow_reports


def test_load_missing_file_returns_empty_data(tmp_path):
    storage = JsonStorage(tmp_path / "missing.json")
    data = storage.load()
    assert data == EMPTY_DATA
    data["products"].append({"code": 1})
    assert EMPTY_DATA["products"] == []
    assert storage.load()["products"] == []


def test_path_property(tmp_path):
    assert JsonStorage(str(tmp_path / "x.json")).path == tmp_path / "x.json"


def test_save_then_load_round_trip(tmp_path):
    storage = JsonStorage(tmp_path / "store.json")
    data = {
        "settings": {"store_name": "Kiosco"},
        "categories": ["Grocery"],
        "products": [{"code": 1, "name": "Ayudín"}],
        "orders": [],
        "search_history": ["cola"],
    }
    storage.save(data)
    assert storage.load() == data


def test_save_writes_readable_utf8(tmp_path):
    path = tmp_path / "store.json"
    JsonStorage(path).save({**EMPTY_DATA, "products": [{"name": "Ayudín"}]})
    raw = path.read_text(encoding="utf-8")
    assert "Ayudín" in raw
    assert "\n  " in raw  # indented


def test_save_creates_parent_dirs_and_leaves_no_temp_files(tmp_path):
    path = tmp_path / "nested" / "dir" / "store.json"
    JsonStorage(path).save(EMPTY_DATA)
    assert path.exists()
    assert [p.name for p in path.parent.iterdir()] == ["store.json"]


def test_missing_keys_are_filled(tmp_path):
    path = tmp_path / "store.json"
    path.write_text(json.dumps({"products": [{"code": 1}]}), encoding="utf-8")
    data = JsonStorage(path).load()
    assert data["products"] == [{"code": 1}]
    assert data["orders"] == []
    assert data["settings"] == {}


@pytest.mark.parametrize("content", ["not json", "[1, 2]"])
def test_invalid_file_raises_value_error(tmp_path, content):
    path = tmp_path / "store.json"
    path.write_text(content, encoding="utf-8")
    with pytest.raises(ValueError):
        JsonStorage(path).load()
