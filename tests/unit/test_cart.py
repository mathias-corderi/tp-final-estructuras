import pytest

from store.models.cart import Cart

pytestmark = pytest.mark.flow_orders


def test_new_cart_is_empty():
    cart = Cart()
    assert cart.is_empty()
    assert len(cart) == 0
    assert cart.lines() == []


def test_add_merges_repeated_codes_and_keeps_order():
    cart = Cart()
    cart.add(50, 1)
    cart.add(20)
    cart.add(50, 2)
    assert cart.lines() == [(50, 3), (20, 1)]
    assert len(cart) == 2


@pytest.mark.parametrize("quantity", [0, -1, 1.5, True])
def test_add_invalid_quantity(quantity):
    with pytest.raises(ValueError):
        Cart().add(50, quantity)


def test_remove_and_clear():
    cart = Cart()
    cart.add(50, 1)
    cart.add(20, 1)
    assert cart.remove(50) is True
    assert cart.remove(50) is False
    assert cart.lines() == [(20, 1)]
    cart.clear()
    assert cart.is_empty()
