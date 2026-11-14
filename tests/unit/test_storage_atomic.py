"""FLUJO 5 — escritura atómica (RNF-03): un guardado que falla no puede dañar el archivo anterior."""

import pytest

from store.services.storage import EMPTY_DATA, JsonStorage

pytestmark = pytest.mark.flow_reports


def test_failed_save_keeps_previous_file_and_leaves_no_temp_files(tmp_path):
    path = tmp_path / "store.json"
    storage = JsonStorage(path)
    storage.save({**EMPTY_DATA, "search_history": ["cola"]})

    with pytest.raises(TypeError):
        storage.save({**EMPTY_DATA, "search_history": ["oreo", object()]})  # object() no es serializable

    assert storage.load()["search_history"] == ["cola"]
    assert [p.name for p in tmp_path.iterdir()] == ["store.json"]
