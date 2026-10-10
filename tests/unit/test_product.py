import pytest

from store.models.product import Product

pytestmark = pytest.mark.flow_products

VALID = dict(code=7, name="Oreo 118g", brand="Mondelez", price=1500, stock=25, category="Grocery/Snacks")


def make(**overrides):
    return Product(**{**VALID, **overrides})


def test_valid_product_exposes_properties():
    product = make(min_stock=3, discount_percent=10, active=False)
    assert product.code == 7
    assert product.name == "Oreo 118g"
    assert product.brand == "Mondelez"
    assert product.price == 1500.0
    assert isinstance(product.price, float)
    assert product.stock == 25
    assert product.category == "Grocery/Snacks"
    assert product.min_stock == 3
    assert product.discount_percent == 10.0
    assert product.active is False


def test_defaults():
    product = make()
    assert product.min_stock == 5
    assert product.discount_percent == 0.0
    assert product.active is True


def test_attributes_are_private():
    assert all(name.startswith("_") for name in vars(make()))


def test_text_fields_are_stripped():
    product = make(name="  Oreo  ", brand=" Mondelez ", category=" Grocery/Snacks ")
    assert (product.name, product.brand, product.category) == ("Oreo", "Mondelez", "Grocery/Snacks")


def test_final_price_applies_discount():
    assert make(price=1000, discount_percent=15).final_price == 850.0
    assert make(price=2200, discount_percent=10).final_price == 1980.0
    assert make(price=999.99).final_price == 999.99
    assert make(price=10, discount_percent=33.333).final_price == 6.67


def test_code_is_read_only():
    product = make()
    with pytest.raises(AttributeError):
        product.code = 8


@pytest.mark.parametrize(
    "field, value",
    [
        ("code", 0),
        ("code", -3),
        ("code", "7"),
        ("name", ""),
        ("name", "   "),
        ("brand", ""),
        ("price", 0),
        ("price", -1),
        ("price", "100"),
        ("price", True),
        ("stock", -1),
        ("stock", 1.5),
        ("stock", True),
        ("category", ""),
        ("min_stock", -1),
        ("discount_percent", -1),
        ("discount_percent", 91),
        ("active", "yes"),
    ],
)
def test_invalid_values_raise_value_error(field, value):
    with pytest.raises(ValueError):
        make(**{field: value})


def test_setter_validates_and_keeps_old_value():
    product = make()
    with pytest.raises(ValueError):
        product.price = -5
    assert product.price == 1500.0
    with pytest.raises(ValueError):
        product.stock = -1
    assert product.stock == 25


def test_setters_change_values():
    product = make()
    product.name = "Oreo Golden"
    product.price = 1700
    product.stock = 0
    product.discount_percent = 90
    product.active = False
    assert (product.name, product.price, product.stock, product.final_price, product.active) == (
        "Oreo Golden", 1700.0, 0, 170.0, False,
    )


def test_to_dict():
    assert make().to_dict() == {
        "code": 7,
        "name": "Oreo 118g",
        "brand": "Mondelez",
        "price": 1500.0,
        "stock": 25,
        "category": "Grocery/Snacks",
        "min_stock": 5,
        "discount_percent": 0.0,
        "active": True,
    }


def test_from_dict_round_trip_and_defaults():
    original = make(min_stock=2, discount_percent=5, active=False)
    copy = Product.from_dict(original.to_dict())
    assert copy.to_dict() == original.to_dict()

    minimal = Product.from_dict({**VALID, "final_price": 123})
    assert minimal.min_stock == 5
    assert minimal.active is True


def test_equality_and_hash_by_code():
    assert make() == make(name="Other name")
    assert make() != make(code=8)
    assert make() != "not a product"
    assert hash(make()) == hash(make(price=1))
