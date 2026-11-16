"""El front compilado y la API en un solo servidor, para presentar la tienda.

Se levanta con:  python demo.py     (o:  uvicorn store.web:app)

- /api/...   la API de siempre (store/api/app.py), con su documentación en /api/docs.
- /assets/   los archivos que genera `npm run build` en front/dist.
- el resto   index.html: las rutas del front (/productos, /admin/reportes...) las resuelve React en el navegador.

Como el navegador ve un solo origen, no hace falta habilitar CORS. Para desarrollar el front se sigue
usando `npm run dev`, que reenvía /api a uvicorn de la misma forma.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from store import config
from store.api.app import create_app

FRONT_DIST = config.PROJECT_ROOT / "front" / "dist"

MISSING_BUILD = """<!doctype html>
<html lang="es"><meta charset="utf-8"><title>Falta compilar el front</title>
<body style="font-family: sans-serif; max-width: 40rem; margin: 3rem auto">
<h1>Falta compilar el front</h1>
<p>La API funciona en <a href="/api/docs">/api/docs</a>, pero no hay un front compilado en <code>front/dist</code>.</p>
<p>Corré <code>python demo.py</code>, que lo compila, o a mano: <code>cd front &amp;&amp; npm install &amp;&amp; npm run build</code>.</p>
</body></html>"""


def create_web_app(dist: Path = FRONT_DIST, api: FastAPI | None = None) -> FastAPI:
    dist = dist.resolve()
    app = FastAPI(title="Store", docs_url=None, redoc_url=None, openapi_url=None)
    app.mount("/api", api if api is not None else create_app())

    if not (dist / "index.html").is_file():

        @app.get("/{path:path}", include_in_schema=False)
        def missing_build(path: str) -> HTMLResponse:
            return HTMLResponse(MISSING_BUILD, status_code=503)

        return app

    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def front(path: str) -> FileResponse:
        """Un archivo de dist (favicon...) si existe; si no, index.html para que React resuelva la ruta."""
        candidate = (dist / path).resolve()
        if path and candidate.is_relative_to(dist) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(dist / "index.html")

    return app


app = create_web_app()
