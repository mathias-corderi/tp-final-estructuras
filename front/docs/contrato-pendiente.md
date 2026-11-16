# Pendientes del contrato de la API

Lo que apareció al construir el front. Ninguno bloquea: la app ya resuelve cada caso como puede y acá queda qué cambiaría
si se ajusta el contrato. Cada punto dice cómo se sabe: **verificado** es que se probó, **por lectura** es que sale de
leer el código o la documentación, y hay que confirmarlo cuando el flujo correspondiente esté implementado.

## Resuelto en la API

- **Un token con caracteres no ASCII daba 500:** ahora `store/api/deps.py` compara bytes y responde 403. El front igual
  rechaza esos tokens antes de llamar.
- **Deshacer y categorías (#8 de abajo):** si la categoría se renombró, el producto vuelve a la ruta nueva; si se borró,
  se vuelve a crear.
- **Deshacer y ajuste masivo (#9 de abajo):** deshacer una modificación ya no pisa los campos cambiados después.
- **CORS (#2 de abajo):** `python demo.py` sirve el front y la API desde el mismo origen, así que no hace falta.

## Para decidir en el grupo

| # | Tema | Qué pasa hoy | Propuesta |
|---|---|---|---|
| 1 | **Nombre y moneda públicos** | `GET /admin/settings` pide token, así que la tienda muestra los de `src/config.ts` y puede no coincidir con lo que guarda el dueño. | `GET /store` público con `store_name` y `currency`. |
| 2 | **CORS** | La API no lo habilita; en desarrollo el front pasa por el proxy de Vite. | Para publicarlo, servir ambos en el mismo dominio o sumar `CORSMiddleware`. |
| 3 | **Fotos de productos** | `Product` no tiene imagen; se ilustra con el ícono de la categoría. | Campo opcional `image_url`. |
| 4 | **Precio al comprar** | `POST /orders` no recibe lo cotizado: si el precio cambia en el medio, el cliente paga otro monto sin aviso. | Mandar el total esperado y responder 409 si difiere. |
| 5 | **Reintentos de compra** | Si se pierde la respuesta del `POST /orders`, reintentar duplica el pedido y el stock reservado. El front solo evita el doble clic. | Clave de idempotencia. |
| 6 | **Privacidad de pedidos** | `GET /orders/{id}` es público y los ids son correlativos: se pueden recorrer nombres y compras de todos. | Código de seguimiento no adivinable. |
| 7 | **Atender siguiente** | `POST /admin/orders/next/complete` no sabe qué pedido se vio en pantalla: con dos pestañas se puede atender otro. El front informa cuál atendió. | Mandar el id esperado y responder 409 si no es el primero. |
| 8 | **Deshacer y categorías** (por lectura) | Deshacer una baja o un cambio de categoría guarda la ruta vieja: si después se renombró o borró, no hay dónde volver. `docs/api.md` solo prevé 409. | Definir la respuesta; el front ya contempla 404 y 409. |
| 9 | **Deshacer y ajuste masivo** (por lectura) | Revertir una modificación o una baja restaura el precio viejo y pisa un ajuste masivo posterior, que figura como no deshacible. | Documentarlo o restaurar solo los campos tocados. |
| 10 | **Pila de deshacer** (por lectura) | No se guarda en `store.json`, así que se pierde al reiniciar aunque RNF-02 dice que todo sobrevive. | Aclarar la excepción en el requerimiento. |
| 11 | **`null` en el PATCH de productos** | El schema lo acepta pero no está definido qué significa, y no hay forma de volver a `default_min_stock`. | Definir `min_stock: null` como "usar el valor por defecto". |
| 12 | **Tipos abiertos** | `UnavailableOut.reason` y `OperationOut.kind` son `str`, y `description` es texto libre. El front traduce las descripciones con patrones y, si no coinciden, muestra el original en inglés. | `Literal` en los schemas. |
| 13 | **Datos faltantes** | `UnavailableOut` no trae el nombre (un inactivo se ve como "Producto 962"). `Order` no guarda cuándo se atendió o canceló. `OperationOut` no tiene fecha. `customer_name` no tiene largo máximo. | Sumarlos si hacen falta. |

## Para corregir en `docs/api.md`

- Dice que los errores son siempre `{"detail": "mensaje"}`, pero los 422 del schema de FastAPI traen una lista de campos (verificado).
- `GET /products/{code}`, `compare-search` y `GET /orders/{id}` dan 422 con un valor que no sea entero (verificado), y no se menciona.
- `comparisons` se describe como "elementos revisados", pero con dos criterios vale el doble de la cantidad de productos (verificado).
- `compare-search` da `found: true` para un inactivo, mientras `GET /products/{code}` da 404 (verificado). Es correcto, pero conviene tener la explicación para la defensa.
- `top_terms` no son "los 5 más buscados" a secas: solo cuenta lo que sigue en el historial, y achicarlo cambia el ranking (verificado).
- `tree_depth` y la altura de los BST no están definidas; la altura solo se aclara en el docstring de `bst.py`.
- No se define qué pasa con `GET /categories/products` con `path` vacío, ni con un criterio en blanco junto a uno válido (`name=%20&brand=coca`).
- El 404 del `PATCH /admin/products/{code}` no distingue producto de categoría por código: el front busca "categor" en el mensaje, así que depende de cómo lo redacte el Flujo 2.

## Si cambia algo

```bash
npm run contract:sync   # regenera los tipos desde la API
npm run typecheck       # marca las pantallas afectadas
```
