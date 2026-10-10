"""Global configuration. Every value can be overridden with an environment variable."""

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SEED_PATH = PROJECT_ROOT / "data" / "seed.json"
EXPORTS_DIR = PROJECT_ROOT / "exports"


def data_path() -> Path:
    """JSON file where the store state is persisted (STORE_DATA_PATH)."""
    return Path(os.environ.get("STORE_DATA_PATH", PROJECT_ROOT / "data" / "store.json"))


def admin_token() -> str:
    """Token required for admin operations (STORE_ADMIN_TOKEN)."""
    return os.environ.get("STORE_ADMIN_TOKEN", "change-me")
