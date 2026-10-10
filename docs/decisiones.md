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

- **JSON con escritura atómica:** _(completar: por qué archivo temporal + `os.replace`)_.
- **Historial con cola acotada:** _(completar: qué pasa al llenarse)_.
- **Estadísticas de las estructuras:** _(completar: altura de cada BST y profundidad del árbol en el seed)_.
