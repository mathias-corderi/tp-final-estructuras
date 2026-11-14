"""FLUJO 5 — from_dict tiene que leer los cuatro campos, no solo los que difieren del valor por defecto."""

import pytest

from store.models.settings import StoreSettings

pytestmark = pytest.mark.flow_reports


def test_from_dict_reads_every_field():
    data = {"store_name": "Kiosco", "currency": "USD", "default_min_stock": 2, "search_history_size": 30}
    assert StoreSettings.from_dict(data).to_dict() == data
