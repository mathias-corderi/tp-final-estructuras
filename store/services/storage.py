"""Persistencia en JSON — FLUJO 5 (reportes, configuración y persistencia).

Lee y escribe todo el estado de la tienda en UN archivo JSON. No sabe nada de
productos ni pedidos: recibe y devuelve dicts simples (los arma el Container).

Formato del archivo (ver data/seed.json):
{
  "settings":       {...StoreSettings.to_dict()},
  "categories":     ["Grocery", "Grocery/Drinks", ...],      # en preorden
  "products":       [{...Product.to_dict()}, ...],
  "orders":         [{...Order.to_dict()}, ...],              # por id ascendente
  "search_history": ["cola", "oreo", ...]                     # la más vieja primero
}
Tests: tests/unit/test_storage.py
"""

import copy
import json
import os
import stat
import tempfile
from pathlib import Path
from typing import Any

EMPTY_DATA: dict[str, Any] = {
    "settings": {},
    "categories": [],
    "products": [],
    "orders": [],
    "search_history": [],
}


def _new_file_mode() -> int:
    """Permisos que tendría un archivo creado con open(): 0o666 menos la umask del proceso.

    La única forma de leer la umask es cambiarla y restaurarla, así que se hace una
    sola vez al importar el módulo, antes de que la API empiece a atender en varios hilos.
    """
    umask = os.umask(0)
    os.umask(umask)
    return 0o666 & ~umask


_NEW_FILE_MODE = _new_file_mode()


class JsonStorage:
    def __init__(self, path: Path | str) -> None:
        self._path = Path(path)

    @property
    def path(self) -> Path:
        return self._path

    def load(self) -> dict[str, Any]:
        """Lee el archivo y devuelve sus datos.

        - Si el archivo no existe -> una copia nueva de EMPTY_DATA (nunca el mismo
          objeto dos veces: modificar el resultado no debe modificar EMPTY_DATA).
        - Las claves que falten se completan con los valores de EMPTY_DATA.
        - JSON inválido, o un JSON que no es un objeto -> ValueError.
        """
        if not self._path.exists():
            return copy.deepcopy(EMPTY_DATA)
        # json.JSONDecodeError ya es un ValueError, no hace falta traducirlo.
        data = json.loads(self._path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError(f"{self._path} must contain a JSON object")
        return {**copy.deepcopy(EMPTY_DATA), **data}

    def save(self, data: dict[str, Any]) -> None:
        """Escribe `data` como JSON UTF-8 (indent=2, ensure_ascii=False para que "Ayudín" se lea bien).

        - Crea la carpeta si hace falta.
        - Escribe primero en un archivo temporal al lado del destino y después
          hace os.replace(), así un corte a mitad de camino nunca deja un store.json a medias.
        """
        self._path.parent.mkdir(parents=True, exist_ok=True)
        # mkstemp da un nombre único: la API atiende en varios hilos y dos guardados
        # simultáneos no pueden compartir el temporal.
        descriptor, temp_name = tempfile.mkstemp(dir=self._path.parent, prefix=self._path.name, suffix=".tmp")
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as file:
                json.dump(data, file, ensure_ascii=False, indent=2)
            # mkstemp crea el temporal con 0600 y os.replace conserva los permisos del
            # temporal: sin esto, store.json quedaría legible solo para el dueño.
            os.chmod(temp_name, self._target_mode())
            os.replace(temp_name, self._path)
        except BaseException:
            os.unlink(temp_name)
            raise

    def _target_mode(self) -> int:
        """Los permisos que ya tiene el archivo, o los de un archivo nuevo si todavía no existe."""
        try:
            return stat.S_IMODE(self._path.stat().st_mode)
        except FileNotFoundError:
            return _NEW_FILE_MODE
