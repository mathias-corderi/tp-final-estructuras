"""Dependencias de FastAPI. Código compartido — ya implementado."""

import secrets

from fastapi import Header, HTTPException

from store import config
from store.container import Container, build_default_container

_container: Container | None = None


def get_container() -> Container:
    """El único Container de la app, se crea en el primer uso. Los tests reemplazan esta dependencia."""
    global _container
    if _container is None:
        _container = build_default_container()
    return _container


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    """Protección de las rutas /admin/*: 401 sin el header X-Admin-Token, 403 si es incorrecto."""
    if x_admin_token is None:
        raise HTTPException(status_code=401, detail="Missing X-Admin-Token header")
    if not secrets.compare_digest(x_admin_token, config.admin_token()):
        raise HTTPException(status_code=403, detail="Invalid admin token")
