"""Errores de negocio que lanzan los servicios.

Los servicios nunca devuelven códigos HTTP ni imprimen mensajes: lanzan uno de estos.
La API los convierte en una respuesta con `status_code` y {"detail": mensaje};
la consola imprime el mensaje.

Uso:  raise ProductNotFound(f"Product {code} not found")
"""


class StoreError(Exception):
    """Clase base de todos los errores de negocio."""

    status_code = 400


class NotFoundError(StoreError):
    status_code = 404


class ConflictError(StoreError):
    status_code = 409


class ValidationError(StoreError):
    """Dato inválido que pasó el schema de la API pero rompe una regla de negocio."""

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
