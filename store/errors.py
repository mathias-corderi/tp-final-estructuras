"""Business errors raised by the services.

Services never return HTTP codes or print messages: they raise one of these.
The API turns them into a response with `status_code` and {"detail": message};
the console prints the message.

Usage:  raise ProductNotFound(f"Product {code} not found")
"""


class StoreError(Exception):
    """Base class for every business error."""

    status_code = 400


class NotFoundError(StoreError):
    status_code = 404


class ConflictError(StoreError):
    status_code = 409


class ValidationError(StoreError):
    """Invalid input that passed the API schema but breaks a business rule."""

    status_code = 422


# --- 404 ---------------------------------------------------------------------
class ProductNotFound(NotFoundError):
    pass


class CategoryNotFound(NotFoundError):
    pass


class OrderNotFound(NotFoundError):
    pass


# --- 409 ---------------------------------------------------------------------
class DuplicateCode(ConflictError):
    pass


class InsufficientStock(ConflictError):
    pass


class CategoryAlreadyExists(ConflictError):
    pass


class CategoryNotEmpty(ConflictError):
    pass


class InvalidOrderState(ConflictError):
    pass


class NoPendingOrders(ConflictError):
    pass


class NothingToUndo(ConflictError):
    pass
