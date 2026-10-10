import pytest

from store.models.settings import StoreSettings

pytestmark = pytest.mark.flow_reports


def test_defaults():
    settings = StoreSettings()
    assert settings.to_dict() == {
        "store_name": "My Store",
        "currency": "ARS",
        "default_min_stock": 5,
        "search_history_size": 10,
    }


def test_currency_is_uppercased_and_name_stripped():
    settings = StoreSettings(store_name="  Kiosco  ", currency="usd")
    assert settings.store_name == "Kiosco"
    assert settings.currency == "USD"


@pytest.mark.parametrize(
    "field, value",
    [
        ("store_name", ""),
        ("currency", "US"),
        ("currency", "EURO"),
        ("currency", "U$D"),
        ("default_min_stock", -1),
        ("default_min_stock", True),
        ("search_history_size", 0),
        ("search_history_size", 101),
    ],
)
def test_invalid_values(field, value):
    with pytest.raises(ValueError):
        StoreSettings(**{field: value})
    settings = StoreSettings()
    with pytest.raises(ValueError):
        setattr(settings, field, value)


def test_update_is_all_or_nothing():
    settings = StoreSettings()
    with pytest.raises(ValueError):
        settings.update(store_name="New name", search_history_size=0)
    assert settings.store_name == "My Store"
    with pytest.raises(ValueError):
        settings.update(color="red")
    settings.update(store_name="New name", currency="eur")
    assert (settings.store_name, settings.currency) == ("New name", "EUR")


def test_from_dict():
    settings = StoreSettings.from_dict({"store_name": "Kiosco"})
    assert settings.store_name == "Kiosco"
    assert settings.search_history_size == 10
    assert StoreSettings.from_dict(settings.to_dict()).to_dict() == settings.to_dict()
