"""FLUJO 5 — escritura atómica (RNF-03): un guardado que falla no puede dañar el archivo anterior."""

import stat

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


def permissions(path):
    return stat.S_IMODE(path.stat().st_mode)


def test_new_file_gets_the_same_permissions_as_any_other_file(tmp_path):
    # mkstemp crea el temporal con 0600; sin corregirlo, store.json quedaría solo para el dueño.
    reference = tmp_path / "reference.txt"
    reference.write_text("x")
    path = tmp_path / "store.json"

    JsonStorage(path).save(EMPTY_DATA)

    assert permissions(path) == permissions(reference)


def test_save_keeps_the_permissions_of_the_existing_file(tmp_path):
    path = tmp_path / "store.json"
    path.write_text("{}")
    path.chmod(0o640)

    JsonStorage(path).save(EMPTY_DATA)

    assert permissions(path) == 0o640
