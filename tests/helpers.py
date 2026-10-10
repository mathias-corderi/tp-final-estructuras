"""Small helpers shared by the tests."""

from types import SimpleNamespace


def codes(items):
    """[{"code": 50, ...}, ...] -> [50, ...]"""
    return [item["code"] for item in items]


def item(code, name="Item", brand="Brand"):
    """Stand-in for a Product in structure tests (only code, name and brand)."""
    return SimpleNamespace(code=code, name=name, brand=brand)
