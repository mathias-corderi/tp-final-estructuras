import pytest

from store.structures.linked_queue import Queue

pytestmark = pytest.mark.flow_orders


def make(*values, max_size=None):
    queue = Queue(max_size)
    for value in values:
        queue.enqueue(value)
    return queue


def test_new_queue_is_empty():
    queue = Queue()
    assert queue.is_empty()
    assert len(queue) == 0
    assert queue.to_list() == []
    assert queue.max_size is None


def test_enqueue_and_dequeue_are_fifo():
    queue = make(1, 2, 3)
    assert [queue.dequeue(), queue.dequeue(), queue.dequeue()] == [1, 2, 3]
    assert queue.is_empty()


def test_peek_returns_front_without_removing():
    queue = make("a", "b")
    assert queue.peek() == "a"
    assert len(queue) == 2


def test_dequeue_and_peek_on_empty_raise_index_error():
    with pytest.raises(IndexError):
        Queue().dequeue()
    with pytest.raises(IndexError):
        Queue().peek()


def test_queue_can_be_reused_after_emptying():
    queue = make(1)
    queue.dequeue()
    queue.enqueue(2)
    queue.enqueue(3)
    assert queue.to_list() == [2, 3]


def test_to_list_is_front_first_and_does_not_modify():
    queue = make(1, 2, 3)
    assert queue.to_list() == [1, 2, 3]
    queue.to_list().clear()
    assert len(queue) == 3


def test_bounded_queue_drops_oldest_and_returns_it():
    queue = Queue(max_size=2)
    assert queue.enqueue(1) is None
    assert queue.enqueue(2) is None
    assert queue.enqueue(3) == 1
    assert queue.to_list() == [2, 3]
    assert len(queue) == 2


@pytest.mark.parametrize("bad_size", [0, -1])
def test_invalid_max_size_raises_value_error(bad_size):
    with pytest.raises(ValueError):
        Queue(max_size=bad_size)


def test_remove_first_removes_only_the_first_match():
    queue = make(1, 2, 3, 2)
    assert queue.remove_first(lambda value: value == 2) == 2
    assert queue.to_list() == [1, 3, 2]
    assert len(queue) == 3


def test_remove_first_without_match_returns_none():
    queue = make(1, 2)
    assert queue.remove_first(lambda value: value == 9) is None
    assert queue.to_list() == [1, 2]


def test_remove_first_keeps_front_and_back_consistent():
    queue = make(1, 2, 3)
    queue.remove_first(lambda value: value == 3)  # removes the back
    queue.enqueue(4)
    assert queue.to_list() == [1, 2, 4]
    queue.remove_first(lambda value: value == 1)  # removes the front
    assert queue.peek() == 2
    assert queue.dequeue() == 2
    assert queue.to_list() == [4]


def test_remove_only_item_then_enqueue():
    queue = make("x")
    assert queue.remove_first(lambda value: value == "x") == "x"
    assert queue.is_empty()
    queue.enqueue("y")
    assert queue.to_list() == ["y"]


def test_resize_drops_from_the_front():
    queue = make(1, 2, 3, 4)
    queue.resize(2)
    assert queue.to_list() == [3, 4]
    assert queue.max_size == 2
    queue.resize(None)
    for value in (5, 6, 7):
        queue.enqueue(value)
    assert queue.to_list() == [3, 4, 5, 6, 7]


def test_handles_many_items():
    queue = make(*range(10_000))
    assert len(queue) == 10_000
    assert queue.dequeue() == 0
    assert queue.peek() == 1
