"""FLUJO 5 — reglas de SettingsService que no se ven desde la API.

La API convierte cualquier ValueError en 422, pero la consola solo imprime StoreError:
si el servicio dejara escapar un ValueError, el menú se caería.
"""

import pytest

from store import errors
from store.models.settings import StoreSettings
from store.services.search_history import SearchHistory
from store.services.settings_service import SettingsService

pytestmark = pytest.mark.flow_reports


def build_service():
    settings = StoreSettings(store_name="Kiosco")
    history = SearchHistory(settings.search_history_size)
    saved_names = []
    service = SettingsService(settings, history, on_change=lambda: saved_names.append(settings.store_name))
    return service, history, saved_names


@pytest.mark.parametrize(
    "changes",
    [
        {},
        {"color": "red"},
        {"store_name": "   "},  # pasa el min_length del schema, pero en blanco es inválido
        {"currency": None},  # el schema acepta null
        {"store_name": "Ok", "default_min_stock": -1},
    ],
)
def test_invalid_changes_raise_validation_error_and_do_not_save(changes):
    service, _, saved_names = build_service()
    with pytest.raises(errors.ValidationError):
        service.update(changes)
    assert service.get().store_name == "Kiosco"
    assert saved_names == []


def test_successful_update_saves_once_after_applying_the_change():
    service, _, saved_names = build_service()
    updated = service.update({"store_name": "Don Pepe"})
    assert updated.store_name == "Don Pepe"
    assert saved_names == ["Don Pepe"]


def test_shrinking_history_size_discards_oldest_terms():
    service, history, _ = build_service()
    for term in ("a", "b", "c"):
        history.record(term)
    service.update({"search_history_size": 2})
    assert history.to_list() == ["b", "c"]


def test_update_works_without_on_change():
    service = SettingsService(StoreSettings(), SearchHistory(3))
    assert service.update({"currency": "usd"}).currency == "USD"


def failing_save():
    raise OSError("disk full")


def test_failed_save_restores_the_previous_settings():
    # Si guardar falla, lo que quedó en memoria tiene que coincidir con lo que está en el archivo.
    settings = StoreSettings(store_name="Kiosco", currency="ARS")
    service = SettingsService(settings, SearchHistory(settings.search_history_size), on_change=failing_save)

    with pytest.raises(OSError):
        service.update({"store_name": "Don Pepe", "currency": "USD"})

    assert settings.to_dict() == StoreSettings(store_name="Kiosco", currency="ARS").to_dict()


def test_failed_save_keeps_the_search_history():
    settings = StoreSettings()
    history = SearchHistory(settings.search_history_size)
    for term in ("a", "b", "c"):
        history.record(term)
    service = SettingsService(settings, history, on_change=failing_save)

    with pytest.raises(OSError):
        service.update({"search_history_size": 2})

    assert settings.search_history_size == 10
    assert history.to_list() == ["a", "b", "c"]
