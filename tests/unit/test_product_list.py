import pytest

from helpers import item
from store.structures.product_list import ProductList

pytestmark = pytest.mark.flow_catalog


def make(*items):
    product_list = ProductList()
    for element in items:
        product_list.append(element)
    return product_list


@pytest.fixture
def sample():
    return make(
        item(5, "Coca-Cola 1.5L", "Coca-Cola"),
        item(3, "Sprite 1.5L", "Coca-Cola"),
        item(9, "coca light", "Other"),
    )


def test_append_keeps_insertion_order(sample):
    assert len(sample) == 3
    assert [element.code for element in sample] == [5, 3, 9]
    assert [element.code for element in sample.to_list()] == [5, 3, 9]


def test_to_list_returns_a_copy(sample):
    sample.to_list().clear()
    assert len(sample) == 3


@pytest.mark.parametrize("code, comparisons", [(5, 1), (3, 2), (9, 3)])
def test_find_by_code_stops_at_first_match(sample, code, comparisons):
    found, count = sample.find_by_code(code)
    assert found.code == code
    assert count == comparisons


def test_find_by_code_missing_examines_everything(sample):
    assert sample.find_by_code(42) == (None, 3)
    assert ProductList().find_by_code(1) == (None, 0)


def test_search_by_name_is_case_insensitive_substring(sample):
    results, comparisons = sample.search_by_name("COCA")
    assert [element.code for element in results] == [5, 9]
    assert comparisons == 3


def test_search_by_brand(sample):
    results, comparisons = sample.search_by_brand("coca-cola")
    assert [element.code for element in results] == [5, 3]
    assert comparisons == 3


def test_search_without_matches(sample):
    assert sample.search_by_name("pepsi") == ([], 3)
    assert sample.search_by_brand("pepsi") == ([], 3)


def test_remove_returns_the_item(sample):
    removed = sample.remove(3)
    assert removed.code == 3
    assert [element.code for element in sample] == [5, 9]
    assert sample.remove(3) is None
    assert len(sample) == 2
