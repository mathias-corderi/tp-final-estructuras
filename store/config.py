"""Configuración global. Cada valor se puede cambiar con una variable de entorno."""

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = PROJECT_ROOT / "data" / "seed.json"
EXPORTS_DIR = PROJECT_ROOT / "exports"


def data_path() -> Path:
    """Archivo JSON donde se guarda el estado de la tienda (STORE_DATA_PATH)."""
    return Path(os.environ.get("STORE_DATA_PATH", PROJECT_ROOT / "data" / "store.json"))


def admin_token() -> str:
    """Token que exigen las operaciones de administrador (STORE_ADMIN_TOKEN)."""
    return os.environ.get("STORE_ADMIN_TOKEN", "change-me")
