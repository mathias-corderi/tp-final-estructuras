"""FLUJO 5 — opciones de consola: reportes, exportación y configuración.

Corren contra el Container real de los fixtures; solo se reemplaza input() por respuestas escritas acá.
"""

import json

import pytest

from store import config, errors
from store.cli import admin_reports_menu

pytestmark = pytest.mark.flow_reports


def feed(monkeypatch, *answers):
    """Hace que input() devuelva `answers` en orden. Si se piden de más, el test falla."""
    pending = iter(answers)
    monkeypatch.setattr("builtins.input", lambda prompt="": next(pending))
    return pending


def test_show_reports_prints_each_report(container, monkeypatch, capsys):
    container.orders.place_order("Ana", [(50, 2)])
    container.orders.complete_next()
    container.search_history.record("cola")

    pending = feed(monkeypatch, "1", "", "2", "", "3", "", "4", "", "5", "", "7", "0")
    admin_reports_menu.show_reports(container)

    output = capsys.readouterr().out
    assert next(pending, None) is None
    assert "5000.00" in output  # facturación
    assert "142700.00" in output  # valor del inventario: 147700 - 2 * 2500
    assert "Coca-Cola 1.5L" in output  # más vendido
    assert "Sprite 1.5L" in output  # stock bajo
    assert "Grocery/Drinks/Sodas" in output  # categorías
    assert "depth: 3" in output
    assert "by code: 4" in output
    assert "by name: 5" in output
    assert "cola" in output  # búsquedas
    assert "Invalid option." in output


def test_show_reports_handles_a_store_without_activity(container, monkeypatch, capsys):
    feed(monkeypatch, "2", "", "5", "", "0")
    admin_reports_menu.show_reports(container)
    output = capsys.readouterr().out
    assert "(no sales yet)" in output
    assert "(no searches yet)" in output


def test_export_catalog_creates_the_folder_and_writes_the_file(container, monkeypatch, tmp_path, capsys):
    exports = tmp_path / "exports"
    monkeypatch.setattr(config, "EXPORTS_DIR", exports)
    admin_reports_menu.export_catalog(container)
    target = exports / "catalog.txt"
    assert target.read_text(encoding="utf-8").startswith("Test Store — Catalog (7 products)\n")
    assert str(target) in capsys.readouterr().out


def test_edit_settings_keeps_blank_answers_and_saves(container, data_file, monkeypatch):
    pending = feed(monkeypatch, "", "usd", "0", "3")  # 0 es válido: no es lo mismo que dejarlo en blanco
    admin_reports_menu.edit_settings(container)
    assert next(pending, None) is None
    expected = {"store_name": "Test Store", "currency": "USD", "default_min_stock": 0, "search_history_size": 3}
    assert container.settings.to_dict() == expected
    assert json.loads(data_file.read_text(encoding="utf-8"))["settings"] == expected


def test_edit_settings_with_all_blank_answers_changes_nothing(container, monkeypatch, capsys):
    before = container.settings.to_dict()
    feed(monkeypatch, "", "", "", "")
    admin_reports_menu.edit_settings(container)
    assert container.settings.to_dict() == before
    assert "No changes" in capsys.readouterr().out


def test_edit_settings_lets_the_menu_report_invalid_values(container, monkeypatch):
    feed(monkeypatch, "", "us", "", "")
    with pytest.raises(errors.ValidationError):  # el menú imprime los StoreError
        admin_reports_menu.edit_settings(container)
    assert container.settings.currency == "ARS"
