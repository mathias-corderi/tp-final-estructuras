import pytest

from store.structures.bst import BinarySearchTree

pytestmark = pytest.mark.flow_catalog

BALANCED = [50, 30, 70, 20, 40, 60, 80]


def build(keys):
    tree = BinarySearchTree()
    for key in keys:
        tree.insert(key, f"v{key}")
    return tree


def test_empty_tree():
    tree = BinarySearchTree()
    assert tree.is_empty()
    assert len(tree) == 0
    assert tree.height() == 0
    assert tree.inorder() == []
    assert tree.search(1) == (None, 0)
    assert not tree.contains(1)


def test_inorder_returns_values_sorted_by_key():
    tree = build(BALANCED)
    assert tree.inorder() == ["v20", "v30", "v40", "v50", "v60", "v70", "v80"]
    assert len(tree) == 7


@pytest.mark.parametrize(
    "key, expected",
    [
        (50, ("v50", 1)),  # raíz
        (30, ("v30", 2)),
        (20, ("v20", 3)),
        (80, ("v80", 3)),
        (65, (None, 3)),  # 50 -> 70 -> 60 -> se sale del árbol
        (99, (None, 3)),  # 50 -> 70 -> 80 -> se sale del árbol
        (1, (None, 3)),
    ],
)
def test_search_counts_visited_nodes(key, expected):
    assert build(BALANCED).search(key) == expected


def test_contains():
    tree = build(BALANCED)
    assert tree.contains(40)
    assert not tree.contains(45)


def test_insert_existing_key_replaces_value():
    tree = build(BALANCED)
    tree.insert(40, "new")
    assert tree.search(40) == ("new", 3)
    assert len(tree) == 7


def test_height_of_balanced_tree():
    assert build([50]).height() == 1
    assert build([50, 30, 70]).height() == 2
    assert build(BALANCED).height() == 3


def test_sorted_insertion_degenerates_into_a_list():
    tree = build(range(1, 11))
    assert tree.height() == 10
    assert tree.search(10) == ("v10", 10)


def test_tuple_keys_sort_like_names():
    tree = BinarySearchTree()
    tree.insert(("sprite", 30), "Sprite")
    tree.insert(("coca-cola", 50), "Coca")
    tree.insert(("coca-cola", 12), "Coca 12")
    assert tree.inorder() == ["Coca 12", "Coca", "Sprite"]


def test_delete_leaf():
    tree = build(BALANCED)
    assert tree.delete(20) is True
    assert tree.inorder() == ["v30", "v40", "v50", "v60", "v70", "v80"]
    assert len(tree) == 6
    assert tree.search(20)[0] is None


def test_delete_node_with_one_child():
    tree = build(BALANCED + [10])
    assert tree.delete(20) is True  # el 20 solo tiene el hijo izquierdo 10
    assert tree.inorder() == ["v10", "v30", "v40", "v50", "v60", "v70", "v80"]
    assert tree.search(10) == ("v10", 3)


def test_delete_node_with_two_children_and_root():
    tree = build(BALANCED)
    assert tree.delete(50) is True
    assert tree.inorder() == ["v20", "v30", "v40", "v60", "v70", "v80"]
    assert tree.search(60)[0] == "v60"
    assert tree.delete(30) is True
    assert tree.inorder() == ["v20", "v40", "v60", "v70", "v80"]
    assert len(tree) == 5


def test_delete_missing_key_returns_false():
    tree = build(BALANCED)
    assert tree.delete(99) is False
    assert len(tree) == 7


def test_delete_everything():
    tree = build(BALANCED)
    for key in BALANCED:
        assert tree.delete(key)
    assert tree.is_empty()
    assert tree.height() == 0
    tree.insert(5, "v5")
    assert tree.inorder() == ["v5"]
