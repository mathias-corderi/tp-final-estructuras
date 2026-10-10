"""Funciones chicas que comparten los tests."""

from types import SimpleNamespace


def codes(items):
    """[{"code": 50, ...}, ...] -> [50, ...]"""
    return [item["code"] for item in items]


def item(code, name="Item", brand="Brand"):
    """Reemplazo de un Product para los tests de estructuras (solo code, name y brand)."""
    return SimpleNamespace(code=code, name=name, brand=brand)
