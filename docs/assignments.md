# Reparto del trabajo

Cada integrante es dueño de un **flujo completo**: sus estructuras, su servicio, sus endpoints y sus opciones de consola. Así cada uno tiene al menos una estructura propia para defender.

| Flujo | Integrante | Estructuras que defiende | Marker de tests |
|---|---|---|---|
| 1 — Navegación y búsqueda del catálogo | _completar_ | Lista (búsqueda secuencial) + BST | `flow_catalog` |
| 2 — Administración de productos | _completar_ | Clase `Product` (POO, @property) + Pila (deshacer) | `flow_products` |
| 3 — Categorías | _completar_ | Árbol n-ario | `flow_categories` |
| 4 — Carrito y pedidos | _completar_ | Cola enlazada | `flow_orders` |
| 5 — Reportes, configuración y persistencia | _completar_ | JSON + cola acotada (historial) + estadísticas | `flow_reports` |

---

## Orden de trabajo

Los flujos se tocan en un solo lugar: el `Container` (`store/container.py`) construye **todos** los servicios y carga el JSON. Por eso los tests de la API (`tests/api/`) recién pueden correr cuando están todas las piezas de la etapa 1. Los tests unitarios (`tests/unit/`), en cambio, son independientes desde el primer día.

### Etapa 1 — Estructuras y modelos (tests unitarios, todos en paralelo)

| Flujo | Qué hacer | Tests |
|---|---|---|
| 1 | `BinarySearchTree`, `ProductList` | `tests/unit/test_bst.py`, `test_product_list.py` |
| 2 | `Product`, `Stack` | `test_product.py`, `test_stack.py` |
| 3 | `split_path`, `CategoryNode`, `CategoryTree` | `test_category_tree.py` |
| 4 | `Queue`, `OrderItem`, `Order`, `Cart` | `test_linked_queue.py`, `test_order_models.py`, `test_cart.py` |
| 5 | `StoreSettings`, `JsonStorage`, `SearchHistory` (usa la `Queue` del flujo 4) | `test_settings_model.py`, `test_storage.py`, `test_search_history.py` |

### Hito — "el Container arranca"

Para que la API y la consola funcionen, cada flujo tiene que tener además estos métodos de servicio, que son cortos:

| Flujo | Métodos |
|---|---|
| 1 | — (su etapa 1 alcanza) |
| 2 | `CatalogService.__init__`, `load`, `all_products` |
| 3 | `CategoryService.__init__`, `load`, `paths` |
| 4 | `OrderService.__init__`, `load`, `all_orders` |
| 5 | `SettingsService.__init__`, `ReportService.__init__` |

**Cómo comprobarlo:** `pytest tests/test_seed.py::test_seed_loads_into_a_container` pasa (necesita además `tree_heights` del flujo 1) y `python main.py` muestra "Almacén Grupo TP — MAIN MENU".

### Etapa 2 — Servicios y endpoints (tests de API)

Cada flujo completa su servicio y los cuerpos de sus rutas: `pytest -m <flujo>`.

### Etapa 3 — Consola

Cada flujo completa sus funciones en `store/cli/*_menu.py`. No tienen tests automáticos: se prueban con `python main.py`.

### Etapa 4 — Cierre

Hay que dejar `pytest` en verde completo, sumar cada uno su parte a `docs/decisiones.md` y a `USO-DE-IA.md`, y ensayar la defensa. En el ensayo, cada uno explica el flujo de **otro**.

---

## Flujo 1 — Navegación y búsqueda del catálogo

**Archivos**
- `store/structures/bst.py`
- `store/structures/product_list.py`
- `store/services/catalog_service.py`, sección "FLOW 1": `list_products`, `get`, `search`, `compare_search`, `tree_heights`
- `store/api/routes/products.py`
- `store/cli/catalog_menu.py`

**Endpoints**

| Método | Ruta | Resumen |
|---|---|---|
| GET | `/products?sort=code\|name` | activos, en orden inorden del BST |
| GET | `/products/{code}` | búsqueda en el BST; 404 si no existe o está inactivo |
| GET | `/products/search?name=&brand=` | búsqueda secuencial + comparaciones; registra los términos en el historial |
| GET | `/products/compare-search?code=` | comparaciones de la lista vs. el BST |

**Consola:** "Search products", "List all products (sorted)" y "Compare search efficiency".

**Tests:** `pytest -m flow_catalog`

## Flujo 2 — Administración de productos

**Archivos**
- `store/models/product.py`
- `store/structures/stack.py`
- `store/services/catalog_service.py`, sección "FLOW 2": `__init__`, `load`, `all_products`, `add`, `update`, `delete`, `restock`, `adjust_stock`, `change_stock`, `undo`, `undo_history`
- `store/api/routes/admin_products.py`
- `store/cli/admin_products_menu.py`
- `store/services/undo.py` ya está hecho: es la clase `Operation` que se apila.

**Endpoints** (requieren el token de admin)

| Método | Ruta | Resumen |
|---|---|---|
| GET | `/admin/products?sort=` | todos, inactivos incluidos |
| POST | `/admin/products` | alta (409 si el código está duplicado, 404 si la categoría no existe, 422 si los datos son inválidos) |
| PATCH | `/admin/products/{code}` | modificar campos; mantiene sincronizados los BST y el árbol |
| DELETE | `/admin/products/{code}` | baja (204) |
| POST | `/admin/products/{code}/restock` | sumar stock |
| POST | `/admin/products/{code}/stock-adjustment` | corregir stock con motivo (409 si quedaría negativo) |
| POST | `/admin/undo` | deshacer la última operación (pila; 409 si está vacía) |
| GET | `/admin/undo/history` | operaciones que se pueden deshacer |

**Consola:** las opciones 1 a 6 del menú de admin.

**Tests:** `pytest -m flow_products`

## Flujo 3 — Categorías

**Archivos**
- `store/structures/category_tree.py`
- `store/services/category_service.py`
- `store/api/routes/categories.py`, `store/api/routes/admin_categories.py`
- `store/cli/category_menu.py`

**Endpoints**

| Método | Ruta | Resumen |
|---|---|---|
| GET | `/categories` | árbol completo con cantidad de productos activos |
| GET | `/categories/products?path=&include_subcategories=` | productos de una rama, en preorden |
| POST | `/admin/categories` | crear (incluye los padres que falten) |
| PATCH | `/admin/categories` | renombrar; actualiza la categoría de los productos |
| DELETE | `/admin/categories?path=` | borrar solo si está vacía |
| POST | `/admin/categories/price-adjustment` | ajustar ± % los precios de toda una rama |

**Consola:** "Browse by category", y en admin "Manage categories" y "Bulk price adjustment".

**Tests:** `pytest -m flow_categories`

## Flujo 4 — Carrito y pedidos

**Archivos**
- `store/structures/linked_queue.py`
- `store/models/order.py`, `store/models/cart.py`
- `store/services/order_service.py`
- `store/api/routes/orders.py`, `store/api/routes/admin_orders.py`
- `store/cli/order_menu.py`

**Endpoints**

| Método | Ruta | Resumen |
|---|---|---|
| POST | `/cart/quote` | cotizar sin comprar |
| POST | `/orders` | comprar: pedido `pending`, reserva stock y lo encola |
| GET | `/orders/{id}` | seguimiento del pedido |
| GET | `/admin/orders?status=` | listado de pedidos |
| POST | `/admin/orders/next/complete` | atender el pedido pendiente más antiguo (cola) |
| POST | `/admin/orders/{id}/cancel` | cancelar un pendiente y devolver el stock |

**Consola:** "Shopping cart / place order", "Track an order", y en admin "Orders".

**Tests:** `pytest -m flow_orders`

## Flujo 5 — Reportes, configuración y persistencia

**Archivos**
- `store/services/storage.py`
- `store/services/search_history.py`
- `store/models/settings.py`
- `store/services/settings_service.py`
- `store/services/report_service.py`
- `store/api/routes/admin_reports.py`, `store/api/routes/admin_settings.py`
- `store/cli/admin_reports_menu.py`

**Endpoints** (requieren el token de admin)

| Método | Ruta | Resumen |
|---|---|---|
| GET | `/admin/reports/summary` | facturación, pedidos por estado, ticket promedio, valor del inventario |
| GET | `/admin/reports/best-sellers?limit=` | ranking de lo más vendido |
| GET | `/admin/reports/low-stock` | qué hay que reponer |
| GET | `/admin/reports/categories` | stock por categoría, profundidad del árbol, altura de los BST |
| GET | `/admin/reports/searches` | qué buscan los clientes |
| GET | `/admin/export/catalog` | catálogo ordenado en texto plano |
| GET / PATCH | `/admin/settings` | configuración de la tienda |

**Consola:** "Reports & statistics", "Export catalog" y "Store settings".

**Tests:** `pytest -m flow_reports`. Los de persistencia (`test_persistence_api.py`) recién pasan cuando todos los flujos guardan bien.
