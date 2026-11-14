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

- **Por qué una cola:** los pedidos se atienden en orden de llegada (FIFO). _(completar: por qué nodos enlazados y no `list.pop(0)`, que es O(n))_.
- **Cancelar un pedido del medio de la cola:** _(completar: cómo funciona `remove_first`)_.

## Flujo 5: persistencia, historial y reportes

- **JSON con escritura atómica:** `save()` escribe en un archivo temporal de la misma carpeta y recién al final lo pone en su lugar con `os.replace`, que cambia un archivo por otro en un solo paso. Así, quien lee `store.json` ve la versión vieja completa o la nueva completa, nunca una mezcla. Va en la misma carpeta porque `os.replace` solo es atómico dentro de un mismo sistema de archivos, y el nombre lo da `mkstemp` porque la API atiende en varios hilos y dos guardados no pueden compartir el temporal. Lo comprobamos: con un `open(path, "w")` directo, un guardado que falla a mitad de camino (un dato que no se puede convertir a JSON) dejó un `store.json` truncado que ya no cargaba, y los tests de `test_storage.py` pasaban igual; por eso existe `tests/unit/test_storage_atomic.py`. **Límite conocido:** esto protege de una falla del programa. Para resistir también un corte de luz habría que llamar a `os.fsync` antes del reemplazo, y hoy no está.
- **Historial con cola acotada:** queremos las últimas N búsquedas, y eso es FIFO: al llenarse, `enqueue` descarta la más vieja antes de agregar la nueva, en O(1) y sin que la memoria crezca (N = `search_history_size`: 10 por defecto, entre 1 y 100). `top_terms` cuenta solo lo que sigue en la cola, así que una búsqueda descartada deja de contar. Si el dueño achica el tamaño, `resize` descarta las más viejas. El historial llega al archivo con el siguiente cambio de la tienda y no con cada búsqueda, porque buscar es una lectura (`GET`) y no dispara `on_change`.
- **Estadísticas de las estructuras:** medido sobre el seed (38 productos, 25 categorías): el BST por código y el BST por nombre tienen altura **11**, y el árbol de categorías tiene profundidad **3**. El mínimo teórico es ⌈log₂(38+1)⌉ = **6** y el peor caso (códigos insertados en orden) sería **38**. O sea que el orden mezclado del seed evita la degeneración, pero el árbol no está balanceado: casi duplica el mínimo.
- **Por qué los reportes usan `dict` y `sorted()`:** la regla de "todo a mano" es para las estructuras que se evalúan (lista, árboles, pila, cola). Un reporte es un servicio que acumula totales de un recorrido, no reemplaza a ninguna de ellas.
- **Las ventas salen del pedido, no del catálogo:** `best_sellers` usa el nombre y el precio guardados en cada `OrderItem`. Si después cambia el precio o se borra el producto, lo facturado no cambia.
