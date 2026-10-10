import pytest

from store.structures.stack import Stack

pytestmark = pytest.mark.flow_products


def test_new_stack_is_empty():
    stack = Stack()
    assert stack.is_empty()
    assert len(stack) == 0
    assert stack.to_list() == []


def test_push_and_pop_are_lifo():
    stack = Stack()
    for value in (1, 2, 3):
        stack.push(value)
    assert len(stack) == 3
    assert [stack.pop(), stack.pop(), stack.pop()] == [3, 2, 1]
    assert stack.is_empty()


def test_peek_returns_top_without_removing():
    stack = Stack()
    stack.push("a")
    stack.push("b")
    assert stack.peek() == "b"
    assert len(stack) == 2


def test_pop_on_empty_raises_index_error():
    with pytest.raises(IndexError):
        Stack().pop()


def test_peek_on_empty_raises_index_error():
    with pytest.raises(IndexError):
        Stack().peek()


def test_to_list_is_top_first_and_does_not_modify():
    stack = Stack()
    for value in ("a", "b", "c"):
        stack.push(value)
    assert stack.to_list() == ["c", "b", "a"]
    stack.to_list().clear()
    assert len(stack) == 3
