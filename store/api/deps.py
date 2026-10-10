"""FastAPI dependencies. Shared code — already implemented."""

import secrets

from fastapi import Header, HTTPException

from store import config
from store.container import Container, build_default_container

_container: Container | None = None


def get_container() -> Container:
    """The app's single Container, built on first use. Tests override this dependency."""
    global _container
    if _container is None:
        _container = build_default_container()
    return _container


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    """Guard for /admin/* routes: 401 without the X-Admin-Token header, 403 if it's wrong."""
    if x_admin_token is None:
        raise HTTPException(status_code=401, detail="Missing X-Admin-Token header")
    if not secrets.compare_digest(x_admin_token, config.admin_token()):
        raise HTTPException(status_code=403, detail="Invalid admin token")
