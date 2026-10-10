import pytest

from store.structures.category_tree import CategoryNode, CategoryTree, split_path

pytestmark = pytest.mark.flow_categories


@pytest.fixture
def tree():
    """
    Store
    ├── A  [x]
    │   ├── B  [y, w]
    │   └── C  [z]
    └── D
    """
    t = CategoryTree()
    for path in ("A", "A/B", "A/C", "D"):
        t.add_path(path)
    t.add_item("A", "x")
    t.add_item("A/B", "y")
    t.add_item("A/C", "z")
    t.add_item("A/B", "w")
    return t


# --- split_path ----------------------------------------------------------------
def test_split_path():
    assert split_path("A/B") == ["A", "B"]
    assert split_path(" A / B ") == ["A", "B"]
    assert split_path("") == []
    assert split_path("   ") == []


@pytest.mark.parametrize("bad", ["A//B", "/A", "A/", "/"])
def test_split_path_rejects_empty_segments(bad):
    with pytest.raises(ValueError):
        split_path(bad)


# --- nodos ---------------------------------------------------------------------
def test_node_children():
    root = CategoryNode("Store")
    child = root.add_child("A")
    assert child.parent is root
    assert root.find_child("A") is child
    assert root.find_child("Z") is None
    with pytest.raises(ValueError):
        root.add_child("A")
    with pytest.raises(ValueError):
        root.add_child("X/Y")
    assert root.remove_child("A") is True
    assert root.remove_child("A") is False


def test_node_path():
    tree = CategoryTree()
    node = tree.add_path("A/B/C")
    assert tree.root.path == ""
    assert node.path == "A/B/C"
    assert node.parent.path == "A/B"


# --- árbol ----------------------------------------------------------------------
def test_new_tree_has_only_root():
    tree = CategoryTree()
    assert tree.root.name == "Store"
    assert tree.depth() == 0
    assert tree.paths() == []
    assert tree.find("") is tree.root


def test_add_path_creates_intermediate_nodes():
    tree = CategoryTree()
    node = tree.add_path("A/B/C")
    assert node.name == "C"
    assert tree.paths() == ["A", "A/B", "A/B/C"]
    assert tree.depth() == 3


def test_add_existing_path_returns_same_node():
    tree = CategoryTree()
    first = tree.add_path("A/B")
    assert tree.add_path("A/B") is first
    assert tree.paths() == ["A", "A/B"]


def test_find_and_exists(tree):
    assert tree.find("A/B").name == "B"
    assert tree.find("A/Z") is None
    assert tree.exists("A/C")
    assert not tree.exists("D/E")


def test_paths_are_preorder_in_insertion_order(tree):
    assert tree.paths() == ["A", "A/B", "A/C", "D"]
    assert tree.depth() == 2


def test_items_preorder(tree):
    assert tree.items("A") == ["x", "y", "w", "z"]
    assert tree.items("A", include_subcategories=False) == ["x"]
    assert tree.items("") == ["x", "y", "w", "z"]
    assert tree.items("D") == []


def test_items_of_missing_path_raises_key_error(tree):
    with pytest.raises(KeyError):
        tree.items("Nope")
    with pytest.raises(KeyError):
        tree.add_item("Nope", "q")


def test_remove_item(tree):
    assert tree.remove_item("A/B", "y") is True
    assert tree.items("A/B") == ["w"]
    assert tree.remove_item("A/B", "y") is False
    assert tree.remove_item("Nope", "w") is False


def test_count_with_filter(tree):
    assert tree.count("A") == 4
    assert tree.count("A", item_filter=lambda value: value != "y") == 3
    assert tree.count() == 4


def test_remove_subtree(tree):
    assert tree.remove("A") is True
    assert tree.paths() == ["D"]
    assert tree.remove("A") is False
    with pytest.raises(ValueError):
        tree.remove("")


def test_rename_updates_descendant_paths(tree):
    tree.add_path("A/B/Deep")
    node = tree.rename("A", "Z")
    assert node.path == "Z"
    assert tree.find("A") is None
    assert tree.find("Z/B/Deep").path == "Z/B/Deep"
    assert tree.items("Z/B") == ["y", "w"]


def test_rename_errors(tree):
    with pytest.raises(KeyError):
        tree.rename("Nope", "X")
    with pytest.raises(ValueError):
        tree.rename("", "X")
    with pytest.raises(ValueError):
        tree.rename("A/B", "C")  # ya existe un hermano con ese nombre
    with pytest.raises(ValueError):
        tree.rename("A/B", "X/Y")


def test_to_dict(tree):
    data = tree.to_dict()
    assert data["name"] == "Store"
    assert data["path"] == ""
    assert data["product_count"] == 4
    assert [child["name"] for child in data["children"]] == ["A", "D"]
    a = data["children"][0]
    assert a == {
        "name": "A",
        "path": "A",
        "product_count": 4,
        "children": [
            {"name": "B", "path": "A/B", "product_count": 2, "children": []},
            {"name": "C", "path": "A/C", "product_count": 1, "children": []},
        ],
    }


def test_to_dict_with_filter_and_subtree(tree):
    data = tree.to_dict("A/B", item_filter=lambda value: value == "w")
    assert data == {"name": "B", "path": "A/B", "product_count": 1, "children": []}
    with pytest.raises(KeyError):
        tree.to_dict("Nope")
