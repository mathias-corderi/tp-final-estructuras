# Contrato de la API

Base: `http://127.0.0.1:8000`. Hay documentación interactiva en `/docs`, que permite probar cada endpoint desde el navegador.

## Convenciones

- **Formato:** JSON en el request y en la respuesta. La única excepción es `/admin/export/catalog`, que devuelve `text/plain`.
- **Autenticación:** toda ruta `/admin/*` requiere el header `X-Admin-Token`. Sin él devuelve **401**; con un valor incorrecto, **403**.
- **Errores:** siempre `{"detail": "mensaje"}`.

| Código | Cuándo |
|---|---|
| 404 | No existe (producto, categoría, pedido) |
| 409 | Conflicto con el estado actual (código duplicado, sin stock, categoría no vacía, nada que deshacer, pedido no pendiente) |
| 422 | Datos inválidos (los detecta el schema de FastAPI o la validación del dominio) |
| 501 | Ese endpoint todavía no está implementado (solo mientras se desarrolla) |

- **Clientes vs. dueño:** las rutas públicas **nunca** muestran productos inactivos. Las de admin muestran todo.
- **Montos:** siempre con 2 decimales. `final_price = price × (1 − discount_percent / 100)`.

### Objeto `Product` (respuesta)

```json
{
  "code": 20,
  "name": "Pepsi 1.5L",
  "brand": "PepsiCo",
  "price": 2200.0,
  "final_price": 1980.0,
  "stock": 10,
  "category": "Grocery/Drinks/Sodas",
  "min_stock": 5,
  "discount_percent": 10.0,
  "active": true
}
```

### Objeto `Order` (respuesta)

```json
{
  "id": 1,
  "customer_name": "Ana",
  "status": "pending",
  "created_at": "2026-10-10T16:23:45",
  "items": [
    {"code": 20, "name": "Pepsi 1.5L", "quantity": 2, "unit_price": 1980.0, "subtotal": 3960.0}
  ],
  "total": 3960.0
}
```

`status` puede ser `pending`, `completed` o `cancelled`. `unit_price` es el precio final **al momento de la compra**: si después cambia el precio, el pedido no cambia.

---

## Flujo 1: catálogo (público)

### `GET /products?sort=code|name`
Productos activos ordenados (recorrido inorden del BST por código o por nombre). `sort` por defecto es `code`; cualquier otro valor da 422.
→ `200 [Product, ...]`

### `GET /products/{code}`
Búsqueda en el BST por código.
→ `200 Product` · `404` si no existe o está inactivo.

### `GET /products/search?name=&brand=`
Búsqueda **secuencial** en la lista: substring, sin distinguir mayúsculas.

- Si llegan los dos criterios, el producto tiene que cumplir ambos y las comparaciones se suman.
- Se registra cada criterio en el historial de búsquedas (primero `name`, después `brand`).
- Sin criterios, o con criterios en blanco → 422.

```json
GET /products/search?name=1.5&brand=coca
200 {"results": [Product 50, Product 30], "comparisons": 16}
```

`comparisons` = elementos revisados. Los inactivos también se revisan, aunque no se devuelven.

### `GET /products/compare-search?code=80`
Busca el mismo código en la lista y en el BST. Un producto inactivo cuenta como encontrado.

```json
200 {"code": 80, "found": true, "list_comparisons": 7, "tree_comparisons": 3}
```

## Flujo 2: administración de productos (admin)

### `GET /admin/products?sort=code|name`
Igual que `GET /products`, pero **incluye los inactivos**.

### `POST /admin/products`
```json
{"code": 90, "name": "Mr. Músculo Kitchen 500ml", "brand": "SC Johnson",
 "price": 1900, "stock": 12, "category": "Cleaning",
 "min_stock": null, "discount_percent": 0, "active": true}
```
`stock`, `min_stock`, `discount_percent` y `active` son opcionales. Si falta `min_stock`, se usa `default_min_stock` de la configuración.

| Respuesta | Cuándo |
|---|---|
| `201 Product` | alta correcta |
| `409` | código duplicado |
| `404` | la categoría no existe |
| `422` | datos inválidos (precio ≤ 0, descuento fuera de 0–90, texto vacío, campos desconocidos) |

### `PATCH /admin/products/{code}`
Body con **solo** los campos a cambiar: `name`, `brand`, `price`, `category`, `min_stock`, `discount_percent`, `active`.

- `code` y `stock` no se pueden cambiar por acá: dan 422.
- Body vacío → 422.
- Si algo es inválido, **no cambia nada**.
- Cambiar el nombre reubica el producto en el BST por nombre; cambiar la categoría lo mueve en el árbol.

→ `200 Product` · `404` (producto o categoría) · `422`

### `DELETE /admin/products/{code}`
Lo saca de la lista, de los dos BST y del árbol de categorías.
→ `204` sin body · `404`

### `POST /admin/products/{code}/restock`
```json
{"quantity": 10}
```
`quantity` tiene que ser mayor a 0.
→ `200 Product` · `404` · `422`

### `POST /admin/products/{code}/stock-adjustment`
```json
{"delta": -2, "reason": "broken bottles"}
```
`delta` ≠ 0 y `reason` no vacío.
→ `200 Product` · `409` si el stock quedaría negativo · `404` · `422`

### `POST /admin/undo`
Deshace la última operación de catálogo (alta, modificación, baja o stock), en orden LIFO.

```json
200 {"undone": {"kind": "stock", "code": 30, "description": "Restocked 5 units of product 30"}}
```

→ `409` si no hay nada para deshacer.

No se deshacen: los pedidos, los cambios de categorías, el ajuste masivo de precios ni la configuración.

### `GET /admin/undo/history`
Lo que se puede deshacer, de lo más reciente a lo más viejo.

```json
200 [{"kind": "stock", "code": 80, "description": "Stock adjustment -2 on product 80: broken bottles"}]
```

## Flujo 3: categorías

Las rutas son nombres separados por `/`, sin la raíz: `"Grocery/Drinks/Sodas"`. Distinguen mayúsculas.

### `GET /categories` (público)
Árbol completo. `product_count` cuenta los productos **activos** del nodo y de todos sus descendientes.

```json
{"name": "Store", "path": "", "product_count": 7, "children": [
  {"name": "Grocery", "path": "Grocery", "product_count": 6, "children": [
    {"name": "Drinks", "path": "Grocery/Drinks", "product_count": 4, "children": ["..."]},
    {"name": "Snacks", "path": "Grocery/Snacks", "product_count": 2, "children": []}
  ]},
  {"name": "Cleaning", "path": "Cleaning", "product_count": 1, "children": []},
  {"name": "Electronics", "path": "Electronics", "product_count": 0, "children": []}
]}
```

### `GET /categories/products?path=Grocery/Drinks&include_subcategories=true` (público)
Productos activos de la rama, en **preorden**: primero los del nodo y después cada hijo, en orden de creación.
→ `200 [Product, ...]` · `404`

### `POST /admin/categories`
```json
{"path": "Electronics/Phones/Android"}
```
Crea los nodos intermedios que falten.
→ `201` (nodo como en `GET /categories`) · `409` si ya existe · `422` si la ruta es inválida (`"A//B"`, en blanco)

### `PATCH /admin/categories`
```json
{"path": "Grocery/Snacks", "new_name": "Treats"}
```
Renombra el último segmento y actualiza la `category` de todos los productos del subárbol: `Grocery/Snacks` pasa a ser `Grocery/Treats`.
→ `200` nodo · `404` · `409` si ya hay un hermano con ese nombre · `422` si es la raíz o el nombre es inválido

### `DELETE /admin/categories?path=Electronics`
Solo si está **vacía**: sin subcategorías ni productos (los inactivos también cuentan).
→ `204` · `409` si no está vacía · `404` · `422` si es la raíz

### `POST /admin/categories/price-adjustment`
```json
{"path": "Grocery/Drinks", "percent": 10}
```
Aplica `round(price × (1 + percent/100), 2)` a **todos** los productos de la rama, inactivos incluidos. `percent` va de −90 a 500 y no puede ser 0.

```json
200 {"updated": [Product, ...]}
```

→ `404` · `422`

## Flujo 4: carrito y pedidos

### `POST /cart/quote` (público)
No modifica nada. Los códigos repetidos se suman.

```json
{"items": [{"code": 20, "quantity": 2}, {"code": 40, "quantity": 1}]}
```

```json
200 {
  "lines": [{"code": 20, "name": "Pepsi 1.5L", "quantity": 2, "unit_price": 1980.0, "subtotal": 3960.0}],
  "total": 3960.0,
  "unavailable": [{"code": 40, "requested": 1, "available": 0, "reason": "insufficient_stock"}]
}
```

`reason` es `not_found` (no existe o está inactivo) o `insufficient_stock`. `items` vacío o `quantity` ≤ 0 → 422.

### `POST /orders` (público)
```json
{"customer_name": "Ana", "items": [{"code": 20, "quantity": 2}]}
```
Crea el pedido `pending`, **reserva el stock** y lo pone al final de la cola. Si falta stock en cualquier línea, no se reserva nada. Los ids arrancan en 1 y son correlativos.

| Respuesta | Cuándo |
|---|---|
| `201 Order` | pedido creado |
| `409` | falta stock |
| `404` | producto inexistente o inactivo |
| `422` | sin items, cantidad ≤ 0 o nombre en blanco |

### `GET /orders/{id}` (público)
→ `200 Order` · `404`

### `GET /admin/orders?status=pending|completed|cancelled`
Todos los pedidos por id ascendente, o filtrados por estado.
→ `200 [Order, ...]` · `422` si el estado es inválido

### `POST /admin/orders/next/complete`
Desencola el pedido pendiente **más antiguo** y lo marca `completed`. No vuelve a tocar el stock.
→ `200 Order` · `409` si no hay pendientes

### `POST /admin/orders/{id}/cancel`
Solo pedidos `pending`: lo saca de la cola, devuelve el stock (si el producto fue borrado, se saltea) y lo marca `cancelled`.
→ `200 Order` · `404` · `409` si no está pendiente

## Flujo 5: reportes y configuración (admin)

### `GET /admin/reports/summary`
```json
{"revenue": 6980.0,
 "orders": {"pending": 1, "completed": 1, "cancelled": 1},
 "average_ticket": 6980.0,
 "inventory_value": 139000.0,
 "product_count": 8}
```

- `revenue` suma solo los pedidos completados.
- `inventory_value` = Σ precio de lista × stock, inactivos incluidos.

### `GET /admin/reports/best-sellers?limit=10`
Solo pedidos completados, ordenados por unidades (descendente) y después por código.

```json
[{"code": 50, "name": "Coca-Cola 1.5L", "units_sold": 3, "revenue": 7500.0}]
```

`limit` < 1 → 422.

### `GET /admin/reports/low-stock`
Productos activos con `stock <= min_stock`, ordenados por stock y después por código.
→ `[Product, ...]`

### `GET /admin/reports/categories`
`categories` incluye cada categoría en preorden y cuenta todo su subárbol, con inactivos.

```json
{"tree_depth": 3, "bst_height_by_code": 4, "bst_height_by_name": 5,
 "categories": [{"path": "Grocery", "product_count": 7, "stock_value": 138900.0}, "..."]}
```

### `GET /admin/reports/searches`
```json
{"recent": ["coca-cola", "cola", "pepsico"],
 "top_terms": [{"term": "cola", "count": 2}, {"term": "coca-cola", "count": 1}]}
```

- `recent`: de la más nueva a la más vieja. Guarda solo las últimas `search_history_size`.
- `top_terms`: los 5 más buscados.

### `GET /admin/export/catalog`
`text/plain` con los productos activos ordenados por nombre:

```
Test Store — Catalog (7 products)

80 | Ayudín Bleach 1L | Clorox | Cleaning | ARS 1100.00 | stock 8
50 | Coca-Cola 1.5L | Coca-Cola | Grocery/Drinks/Sodas | ARS 2500.00 | stock 20
...
```

### `GET /admin/settings` · `PATCH /admin/settings`
```json
{"store_name": "Almacén Grupo TP", "currency": "ARS", "default_min_stock": 5, "search_history_size": 10}
```

El PATCH cambia solo los campos que recibe, **todo o nada**:

- `currency` son 3 letras y se guarda en mayúsculas.
- `search_history_size` va de 1 a 100. Si se achica, se descartan las búsquedas más viejas.
- Body vacío o campo desconocido → 422.
