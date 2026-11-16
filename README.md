# Store — TP Final Estructuras de Datos (UNaB 2025)

Sistema de gestión para una **tienda**: los clientes navegan el catálogo, buscan productos, cotizan un carrito y hacen pedidos; el **dueño** administra todo el negocio (productos, precios y descuentos, categorías, stock, pedidos, reportes, configuración y deshacer).

Toda la lógica vive en un núcleo propio con **estructuras de datos implementadas a mano**, y se usa desde tres interfaces:

- **Consola** (`python main.py`): el menú que pide la consigna.
- **API REST** (`uvicorn store.api.app:app`): la misma lógica expuesta por HTTP, que usa el front.
- **Front web** (`front/`): tienda para los clientes y panel del dueño, hecho con React. Ver [`front/README.md`](front/README.md).

## Integrantes

| Integrante | Flujo | GitHub |
|---|---|---|
| _completar_ | 1 — Navegación y búsqueda del catálogo | Ronnnnel |
| _completar_ | 2 — Administración de productos | |
| _completar_ | 3 — Categorías | |
| _completar_ | 4 — Carrito y pedidos | |
| _completar_ | 5 — Reportes, configuración y persistencia | |

## Cómo correrlo

Requiere Python 3.11 o superior.

```bash
python -m venv .venv
source .venv/bin/activate          # fish: source .venv/bin/activate.fish · Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Todo junto con un comando (para probar o presentar)

```bash
python demo.py            # usa data/store.json
python demo.py --fresh    # arranca de cero con una copia del seed, sin tocar data/store.json
```

Compila el front si hace falta (necesita [Node](https://nodejs.org) 20 o superior la primera vez), levanta un solo
servidor y abre el navegador:

- Tienda: http://127.0.0.1:8000
- Panel del dueño: http://127.0.0.1:8000/admin (token `change-me`)
- API con documentación interactiva: http://127.0.0.1:8000/api/docs

FastAPI sirve el front compilado (`front/dist`) y la API bajo `/api` (`store/web.py`), así que el navegador ve un
solo origen y no hace falta CORS.

### Cada parte por separado

| Qué | Comando |
|---|---|
| Menú de consola | `python main.py` |
| API + documentación interactiva | `uvicorn store.api.app:app --reload` → http://127.0.0.1:8000/docs |
| Todos los tests | `pytest` |
| Tests de un flujo | `pytest -m flow_orders` (ver `docs/assignments.md`) |
| Front conectado a la API (para desarrollarlo) | `uvicorn store.api.app:app --reload` y, en `front/`, `npm install` y `npm run dev` → http://localhost:5173 |
| Tests del front | en `front/`: `npm test`, `npm run test:contract:real`, `npm run e2e:real` |

- **Token de administrador:** se toma de la variable `STORE_ADMIN_TOKEN` (por defecto `change-me`). En la API se manda en el header `X-Admin-Token`; en la consola lo pide la opción "Admin mode".
- **Datos:** la primera vez se copia `data/seed.json` a `data/store.json`, que no se sube a git. Para volver a los datos iniciales, borrá `data/store.json`.

## Qué estructura resuelve cada funcionalidad

| Funcionalidad | Estructura | Dónde |
|---|---|---|
| Buscar por nombre o marca, contando comparaciones | **Lista** con búsqueda secuencial | `store/structures/product_list.py` |
| Buscar por código | **Árbol binario de búsqueda** (clave = código) | `store/structures/bst.py` |
| Listar ordenado por código o por nombre | **Recorrido inorden** de dos BST (clave = código / nombre) | `store/structures/bst.py` |
| Comparar eficiencia lista vs. árbol | Las dos anteriores, sobre el mismo código | `GET /products/compare-search` |
| Explorar por categorías, ajustar precios por rama | **Árbol n-ario** de categorías | `store/structures/category_tree.py` |
| Deshacer la última operación del dueño | **Pila** | `store/structures/stack.py` |
| Atender pedidos en orden de llegada | **Cola** (nodos enlazados) | `store/structures/linked_queue.py` |
| Historial de las últimas N búsquedas | **Cola acotada** | `store/services/search_history.py` |
| Guardar y cargar todo | **Archivo JSON** | `store/services/storage.py` |
| Estadísticas (altura de árboles, ventas, stock) | Recorridos de las estructuras | `store/services/report_service.py` |

Las justificaciones y las mediciones para la defensa están en [`docs/decisiones.md`](docs/decisiones.md).

## Organización del proyecto

```
store/
  structures/   estructuras de datos hechas a mano (no importan nada del proyecto)
  models/       clases del dominio: Product, Order, Cart, StoreSettings
  services/     reglas de negocio; usan las estructuras y lanzan errores de store/errors.py
  api/          FastAPI: rutas finas que llaman a los servicios
  cli/          menú de consola: también llama a los servicios
  container.py  arma todos los servicios una sola vez (lo comparten la API y la consola)
tests/          unit/ (estructuras y modelos) y api/ (un archivo por flujo)
docs/           requerimientos, contrato de la API, reparto y decisiones
data/seed.json  datos iniciales: 38 productos y 25 categorías
```

## Documentación

- [`docs/propuesta-tema.md`](docs/propuesta-tema.md): la propuesta de tema para el docente.
- [`docs/requirements.md`](docs/requirements.md): requerimientos y cómo cubren la consigna.
- [`docs/api.md`](docs/api.md): contrato de cada endpoint.
- [`docs/assignments.md`](docs/assignments.md): quién hace qué y en qué orden.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): cómo trabajamos con git y con los tests.
- [`USO-DE-IA.md`](USO-DE-IA.md): en qué usamos inteligencia artificial.
