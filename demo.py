"""Levanta la tienda completa (API + front) con un solo comando, para probarla o presentarla.

    python demo.py            usa data/store.json (lo crea desde el seed la primera vez)
    python demo.py --fresh    arranca de cero con una copia del seed, sin tocar data/store.json
    python demo.py --port 9000 --no-browser

Si el front no está compilado (o cambió desde la última vez), lo compila con npm antes de arrancar.
Necesita Python con requirements.txt instalado y, solo para compilar el front, Node 20 o superior.
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONT = ROOT / "front"
DIST_INDEX = FRONT / "dist" / "index.html"
FRONT_SOURCES = ("src", "public", "index.html", "package.json", "package-lock.json", "vite.config.ts", "tsconfig.json")


def fail(message: str) -> None:
    print(f"\n  {message}\n", file=sys.stderr)
    sys.exit(1)


def newest_source_time() -> float:
    newest = 0.0
    for name in FRONT_SOURCES:
        path = FRONT / name
        files = path.rglob("*") if path.is_dir() else [path]
        for file in files:
            if file.is_file():
                newest = max(newest, file.stat().st_mtime)
    return newest


def build_front() -> None:
    """Compila el front si falta dist/ o si algún archivo fuente es más nuevo que la última compilación."""
    built = DIST_INDEX.is_file()
    if built and DIST_INDEX.stat().st_mtime >= newest_source_time():
        print("  Front: ya está compilado.")
        return

    npm = shutil.which("npm")
    if npm is None:
        if built:
            print("  Front: cambió desde la última compilación, pero no encontré npm. Uso la versión compilada.")
            return
        fail("Para compilar el front hace falta Node 20 o superior (https://nodejs.org). Después corré de nuevo este comando.")

    if not (FRONT / "node_modules").is_dir():
        print("  Front: instalando dependencias (npm ci, solo la primera vez)...")
        subprocess.run([npm, "ci"], cwd=FRONT, check=True)
    print("  Front: compilando (npm run build)...")
    subprocess.run([npm, "run", "build"], cwd=FRONT, check=True)


def open_browser_when_ready(url: str) -> None:
    for _ in range(100):
        try:
            urllib.request.urlopen(url + "/api/openapi.json", timeout=1)
            webbrowser.open(url)
            return
        except OSError:
            time.sleep(0.1)


def main() -> None:
    sys.stdout.reconfigure(line_buffering=True)  # que los mensajes salgan en orden aunque se redirija la salida
    parser = argparse.ArgumentParser(description="Tienda completa: API + front en un solo servidor.")
    parser.add_argument("--fresh", action="store_true", help="arrancar con una copia limpia del seed")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true", help="no abrir el navegador")
    args = parser.parse_args()

    try:
        import uvicorn  # noqa: F401
        import fastapi  # noqa: F401
    except ImportError:
        fail("Faltan dependencias de Python: corré  pip install -r requirements.txt  (con el entorno virtual activado).")

    os.chdir(ROOT)
    sys.path.insert(0, str(ROOT))
    try:
        build_front()
    except subprocess.CalledProcessError as error:
        fail(f"Falló la compilación del front ({error}). Revisá el mensaje de npm de arriba.")

    if args.fresh:
        data = Path(tempfile.mkdtemp(prefix="tienda-demo-")) / "store.json"
        shutil.copyfile(ROOT / "data" / "seed.json", data)
        os.environ["STORE_DATA_PATH"] = str(data)

    from store import config

    url = f"http://127.0.0.1:{args.port}"
    print()
    print(f"  Tienda:            {url}")
    print(f"  Panel del dueño:   {url}/admin   (token: {config.admin_token()})")
    print(f"  API (Swagger):     {url}/api/docs")
    print(f"  Datos:             {config.data_path()}" + ("   (copia limpia del seed)" if args.fresh else ""))
    print("  Para cortar: Ctrl+C")
    print()

    if not args.no_browser:
        threading.Thread(target=open_browser_when_ready, args=(url,), daemon=True).start()

    import uvicorn

    uvicorn.run("store.web:app", host="127.0.0.1", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
