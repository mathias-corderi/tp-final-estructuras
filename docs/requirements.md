# Requerimientos

## Actores

- **Cliente** (sin login): navega y busca en el catálogo, cotiza un carrito, hace pedidos y consulta su estado.
- **Dueño / administrador** (con token): gestiona la tienda completa.

## Requerimientos funcionales

### Cliente

| ID | Requerimiento | Endpoint | Flujo |
|---|---|---|---|
| RF-01 | Listar los productos activos ordenados por código o por nombre | `GET /products` | 1 |
| RF-02 | Ver un producto por código | `GET /products/{code}` | 1 |
| RF-03 | Buscar por nombre y/o marca (substring, sin distinguir mayúsculas) viendo cuántas comparaciones hizo | `GET /products/search` | 1 |
| RF-04 | Comparar la búsqueda por código en la lista vs. en el árbol | `GET /products/compare-search` | 1 |
| RF-05 | Explorar el árbol de categorías y ver los productos de una rama | `GET /categories`, `GET /categories/products` | 3 |
| RF-06 | Cotizar un carrito con descuentos aplicados, viendo qué no está disponible | `POST /cart/quote` | 4 |
| RF-07 | Hacer un pedido: se reserva el stock y el pedido queda pendiente | `POST /orders` | 4 |
| RF-08 | Consultar el estado de un pedido | `GET /orders/{id}` | 4 |

### Dueño

| ID | Requerimiento | Endpoint | Flujo |
|---|---|---|---|
| RF-10 | Ver todos los productos, inactivos incluidos | `GET /admin/products` | 2 |
| RF-11 | Dar de alta, modificar (precio, descuento, categoría, activo...) y dar de baja productos | `POST/PATCH/DELETE /admin/products` | 2 |
| RF-12 | Reponer stock y registrar ajustes con motivo (roturas, conteo) | `.../restock`, `.../stock-adjustment` | 2 |
| RF-13 | Deshacer la última operación sobre el catálogo | `POST /admin/undo` | 2 |
| RF-14 | Crear, renombrar y borrar categorías | `POST/PATCH/DELETE /admin/categories` | 3 |
| RF-15 | Subir o bajar por porcentaje los precios de toda una categoría | `POST /admin/categories/price-adjustment` | 3 |
| RF-16 | Ver los pedidos, atender el más antiguo y cancelar pendientes (devuelve stock) | `/admin/orders...` | 4 |
| RF-17 | Ver facturación, pedidos por estado, ticket promedio y valor del inventario | `GET /admin/reports/summary` | 5 |
| RF-18 | Ver los productos más vendidos | `GET /admin/reports/best-sellers` | 5 |
| RF-19 | Ver qué productos hay que reponer | `GET /admin/reports/low-stock` | 5 |
| RF-20 | Ver estadísticas por categoría y de las estructuras (profundidad, alturas) | `GET /admin/reports/categories` | 5 |
| RF-21 | Ver qué buscan los clientes | `GET /admin/reports/searches` | 5 |
| RF-22 | Exportar el catálogo ordenado a texto | `GET /admin/export/catalog` | 5 |
| RF-23 | Configurar nombre, moneda, stock mínimo por defecto y tamaño del historial | `GET/PATCH /admin/settings` | 5 |

Todos los RF también están disponibles desde el menú de consola.

## Requerimientos no funcionales

| ID | Requerimiento |
|---|---|
| RNF-01 | Estructuras de datos implementadas a mano: no se reemplazan por librerías ni diccionarios. |
| RNF-02 | Persistencia en JSON: todo sobrevive a reiniciar el programa. |
| RNF-03 | Cada cambio se guarda en el momento, con escritura atómica (archivo temporal + reemplazo). |
| RNF-04 | Operaciones del dueño protegidas con un token (header `X-Admin-Token`). |
| RNF-05 | Errores consistentes: `{"detail": "..."}` con 404, 409 o 422 según el caso. |
| RNF-06 | Un único núcleo de lógica compartido por la consola y la API. |
| RNF-07 | Código, endpoints y datos en inglés; documentación para la cátedra en español. |
| RNF-08 | Suite de tests automática (pytest) que define el comportamiento de cada flujo. |

## Cobertura de la consigna

| Consigna | Dónde se cumple |
|---|---|
| E1: clase con encapsulamiento (`@property`) | `Product`, `Order`, `OrderItem`, `StoreSettings` |
| E1: al menos 30 elementos de prueba | `data/seed.json` (38 productos) |
| E1: insertar, buscar, modificar y eliminar sobre una lista | `ProductList` + `CatalogService` |
| E1: búsqueda secuencial por 2 criterios contando comparaciones | `search_by_name`, `search_by_brand` |
| E1: menú de consola | `python main.py` |
| E2: árbol de categorías + "Explorar por categorías" | `CategoryTree` + opción 2 del menú |
| E2: BST con insertar y buscar | `BinarySearchTree` (además tiene `delete`) |
| E2: inorden para listar ordenado | `GET /products?sort=...` |
| E2: comparar lista vs. árbol | `GET /products/compare-search` + `docs/decisiones.md` |
| E3: JSON (obligatorio) | `JsonStorage` |
| E3: deshacer con pila | `Stack` + `POST /admin/undo` |
| E3: historial con cola | `SearchHistory` (cola acotada) |
| E3: estadísticas | `ReportService` |
| E3: exportar a texto | `GET /admin/export/catalog` / opción 11 de admin |
| E3: funcionalidad propia | pedidos con cola FIFO, stock bajo, ajuste de precios por categoría |
| E4: GitHub, README, USO-DE-IA | este repositorio |
