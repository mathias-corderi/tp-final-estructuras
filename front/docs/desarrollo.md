# Guía de desarrollo

## Qué es esto

El front de la tienda del TP. Le habla a la API FastAPI de este mismo repo (la carpeta de arriba), cuyo contrato está en
`docs/api.md` de la raíz. Sin levantar la API se puede usar el **modo demo**: un backend simulado que corre
en el navegador con los mismos datos del seed.

## Estructura

```
contract/openapi.json   contrato real de la API (lo genera `npm run contract:sync`)
scripts/                sincronizar contrato, correr contra la API real, capturas
src/
  api/                  client.ts (HTTP y errores), endpoints.ts (una función por endpoint),
                        keys.ts (claves de TanStack Query), session.ts (token del dueño), schema.d.ts (generado)
  mocks/                backend simulado: store.ts (lógica), handlers.ts (rutas), browser.ts (modo demo), seed.json
  lib/                  lógica sin interfaz: carrito, formato, categorías, pedidos recientes
  ui/                   componentes compartidos (importar desde '@/ui')
  layouts/              encabezados, panel del dueño, protección por token
  pages/store/          pantallas del cliente
  pages/admin/          pantallas del dueño
  styles/               tokens.css (paleta y medidas) y global.css
  test/                 render.tsx (`renderRoute`), server.ts (backend simulado de los tests)
tests/contract/         el mismo escenario contra el simulado y contra la API real
e2e/                    recorridos completos en un navegador real
```

## Convenciones

- **Idioma:** código en inglés; textos de la interfaz en español rioplatense (voseo: "Agregá", "Seguí tu pedido");
  comentarios en español y solo cuando expliquen algo que no se ve en el código.
- **Datos:** toda llamada pasa por `api` de `@/api/endpoints` con TanStack Query y las claves de `@/api/keys`.
  Nada de `fetch` directo ni de tipos escritos a mano para lo que ya está en el contrato.
- **Pantallas con datos:** usar `QueryState` para carga y error, así el 501 ("falta ese flujo") y la API apagada se
  ven siempre igual.
- **Cambios:** `useMutation`; en `onSuccess`, `queryClient.invalidateQueries()` (un cambio toca stock, reportes e
  historial a la vez) y `useToast().success(...)`. En `onError`, `toast.error(error, mensajesPorEstado)` o error en el
  campo con `ApiError.fields`.
- **Búsqueda:** `api.products.search` registra cada llamada en el historial del dueño. Se busca solo al confirmar,
  nunca mientras se escribe, y la consulta usa `staleTime: 'static'` para que volver a los resultados no cuente como
  otra búsqueda.
- **Estilos:** CSS Modules por componente, usando solo las variables de `styles/tokens.css`. Nada de colores sueltos.
  Toda pantalla tiene que verse bien desde 360 px de ancho, sin scroll horizontal de la página.
- **Accesibilidad:** cada control con su etiqueta, foco visible, contraste de `tokens.test.ts`, y `aria-label` en los
  botones que son solo un ícono. Lo que se pueda hacer con un elemento nativo (`button`, `dialog`, `label`) se hace así.

## Tests

Primero el test, después el código: se escribe, se ve fallar por el motivo correcto y recién ahí se implementa.

```bash
npm test                          # tests de componentes y lógica
npx vitest run --project unit src/pages/store/CartPage.test.tsx
npm run test:contract             # contrato contra el backend simulado
npm run test:contract:real        # contrato contra FastAPI (necesita los flujos implementados)
npm run e2e                       # recorridos en navegador real, modo demo
npm run e2e:real                  # los mismos recorridos contra FastAPI
npm run typecheck
```

Los tests de pantalla montan la app real con `renderRoute('/ruta', { admin: true })` contra el backend simulado.
Para preparar un estado se usa `mockStore` de `@/test/server`, y para simular un error `server.use(...)` de MSW.
Las expectativas salen del contrato y del seed escritas a mano, nunca calculadas con el código que se prueba.

## Cuando cambia el contrato

```bash
npm run contract:sync   # trae el OpenAPI real y regenera src/api/schema.d.ts
npm run typecheck       # señala cada pantalla afectada
```

Después hay que actualizar `src/mocks/` y `tests/contract/` si cambió el comportamiento.
