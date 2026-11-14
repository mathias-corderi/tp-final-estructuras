# Decisiones de diseño: para la defensa

> Cada integrante completa la sección de su flujo **con números medidos** (por ejemplo, con `GET /products/compare-search` o con la opción "Compare search efficiency" de la consola). La pregunta segura de la defensa es: *"¿por qué usaron esta estructura y no otra?"*

## Decisiones generales

- **Un núcleo, dos interfaces.** La consola y la API llaman a los mismos servicios. Así no hay lógica duplicada, y lo que se prueba por la API vale para la consola.
- **Los servicios lanzan errores, no devuelven `None`.** Cada error de `store/errors.py` ya sabe qué código HTTP le corresponde.
- **Todas las estructuras comparten los mismos objetos `Product`.** Cambiar el stock en un lugar se ve en todos. Solo hay que reacomodar cuando cambia una **clave**: el nombre (BST por nombre) o la categoría (árbol).

## Flujo 1: lista vs. árbol binario de búsqueda

- **Por qué un BST por código:** _(completar con la medición: comparaciones promedio en la lista vs. en el árbol sobre los 38 productos del seed)_.
- **Por qué hay dos BST:** el inorden ordena por la clave con la que se armó el árbol (lo advierte la consigna, pág. 8). Para listar por nombre hace falta otro árbol con clave `(name.lower(), code)`. El código va en la clave para desempatar nombres repetidos.
- **Por qué la búsqueda por nombre sigue en la lista:** buscamos *substrings* ("cola" encuentra "Coca-Cola"). El BST solo sirve para claves exactas o prefijos, así que hay que revisar todos los elementos.
- **Orden de carga:** si los códigos se insertan ordenados, el BST degenera en una lista (altura = n). El seed tiene los códigos mezclados. _(completar: altura real del BST por código vs. el mínimo teórico ⌈log₂(n+1)⌉)_.

## Flujo 2: clase Product y pila para deshacer

- **Encapsulamiento:** _(completar: qué valida cada setter y por qué `code` no tiene setter)_.
- **Por qué una pila:** deshacer siempre revierte la **última** operación, que es la más reciente (LIFO). _(completar: qué guarda cada `Operation` y por qué el ajuste de stock se deshace como un delta y no restaurando el valor viejo)_.

## Flujo 3: árbol n-ario de categorías

- **Por qué un árbol y no una lista de categorías:** _(completar: jerarquía de profundidad variable, contar productos de una rama completa, ajustar precios por rama)_.
- **Recorrido en preorden:** _(completar)_.

## Flujo 4: cola de pedidos

- **Por qué una cola:** los pedidos se atienden en orden de llegada (FIFO): el dueño siempre completa el pendiente más viejo. Con nodos enlazados y referencias al frente (`_front`) y al final (`_back`), `enqueue` y `dequeue` son O(1). Con una lista de Python, `list.pop(0)` es O(n) porque corre todos los elementos un lugar. Medido vaciando la cola entera:

  | Pedidos en cola | `Queue.dequeue` | `list.pop(0)` |
  |---|---|---|
  | 10.000 | 5,9 ms | 32,8 ms |
  | 100.000 | 60,3 ms | 4.603 ms |

  La cola crece lineal (10× pedidos → 10× tiempo); la lista crece cuadrático (10× pedidos → ~140× tiempo).
- **Cancelar un pedido del medio de la cola:** `remove_first(predicado)` recorre los nodos con dos referencias, `previous` y `current`. Cuando `current` cumple el predicado, se "puentea": `previous.next = current.next`. Hay dos casos borde: si era el frente, avanza `_front`; si era el final, `_back` pasa a ser `previous`. Es O(n), pero cancelar es mucho menos frecuente que atender.
- **Todos los pedidos en una lista + los pendientes en la cola:** las dos guardan los mismos objetos `Order`. La lista queda ordenada por id solo con `append` (los ids son crecientes), así que `get(id)` usa **búsqueda binaria**: O(log n).
- **Comprar sin dejar stock a medias:** `place_order` primero junta los códigos repetidos con un `Cart` (`[(30, 2), (30, 2)]` → 4 unidades), después revisa el stock de **todas** las líneas y recién ahí reserva. Si una línea falla, no se tocó nada.
- **Precio congelado:** `OrderItem.unit_price` guarda el `final_price` (con descuento) del momento de la compra; si después el dueño cambia el precio, el pedido no cambia.
- **Encapsulamiento:** `Order` y `OrderItem` exponen todo con `@property`; `items` devuelve una copia y solo `status` tiene setter (valida con `OrderStatus`).

## Flujo 5: persistencia, historial y reportes

- **JSON con escritura atómica:** _(completar: por qué archivo temporal + `os.replace`)_.
- **Historial con cola acotada:** _(completar: qué pasa al llenarse)_.
- **Estadísticas de las estructuras:** _(completar: altura de cada BST y profundidad del árbol en el seed)_.
