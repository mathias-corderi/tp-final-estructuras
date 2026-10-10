# Propuesta de tema: tienda con gestión para el dueño

Es un tema propio: una tienda de barrio o almacén con venta a clientes y un panel de administración para el dueño. Se parece al tema 3 ("Kiosco o almacén"), pero suma pedidos y gestión del negocio. Respondemos las cuatro preguntas de la consigna.

## 1. ¿Qué es cada elemento del catálogo y qué datos tiene? → la clase

```
Product(code, name, brand, price, stock, category, min_stock, discount_percent, active)
```

Con atributos privados y `@property` que validan cada valor. Además, `final_price` se calcula con el descuento.

También modelamos el pedido de un cliente: `Order(id, customer_name, items, status, created_at)` con sus `OrderItem`.

## 2. ¿Cómo se agrupan en categorías y subcategorías? → el árbol

```
Store
├── Grocery
│   ├── Drinks → Sodas / Water / Juices
│   ├── Snacks → Cookies / Chips
│   └── Pantry → Pasta / Rice / Oils
├── Cleaning → Laundry / Kitchen / Floors
├── Personal Care → Hair / Oral
├── Electronics → Accessories → Chargers / Cables
└── Stationery → Notebooks
```

## 3. ¿Qué buscaría un usuario? → las búsquedas

- **Por código:** con el árbol binario de búsqueda.
- **Por nombre y por marca:** búsqueda secuencial en la lista, contando comparaciones.
- **Listado ordenado por código o por nombre:** con el recorrido inorden de los árboles.
- **Por categoría:** recorriendo una rama del árbol de categorías.

## 4. ¿Qué otra cosa útil podría hacer el sistema? → la funcionalidad extra

- **Pedidos atendidos en orden de llegada**, con una cola.
- **Alerta de stock bajo** y **ajuste de precios por categoría**.
- **Reportes para el dueño:** facturación, más vendidos, valor del inventario y qué buscan los clientes.

## Extras de la entrega 3 que cubrimos

- Guardar y cargar desde JSON (obligatorio).
- Deshacer con pila.
- Historial de búsquedas con cola.
- Estadísticas.
- Exportar el listado ordenado a texto.
- La funcionalidad propia: pedidos y stock bajo.

## Interfaz

El menú de consola cubre todo lo que pide la consigna. Además, la misma lógica se expone como API REST (FastAPI) para poder sumarle un front más adelante. La API usa exactamente los mismos servicios y estructuras: no hay lógica duplicada.
