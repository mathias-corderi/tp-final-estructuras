# Front de la tienda — TP Final Estructuras de Datos

Tienda online y panel del dueño para la API de este repo (la carpeta de arriba). Cubre todos los requerimientos del proyecto
(`docs/requirements.md` de la raíz): el cliente navega, busca, arma el carrito y sigue su pedido; el dueño administra
productos, categorías, pedidos, reportes, exportación y configuración.

Hecho con React, TypeScript y Vite. No hace falta tocar la API para usarlo.

## Verlo funcionando

Requiere Node 20 o superior.

**Todo junto (API + front en un solo servidor):** desde la raíz del repo, `python demo.py`. Ver el README de la raíz.

**Solo el front, sin la API:**

```bash
npm install
npm run dev:mock
```

Se abre en http://localhost:5173. Es el **modo demo**: un backend simulado corre en el navegador con los datos del seed,
así que funciona aunque la API todavía esté incompleta. Los cambios quedan guardados en ese navegador y el aviso de
arriba tiene un botón para reiniciarlos. El token del dueño es `change-me`.

## Desarrollar contra la API real

```bash
# En la raíz del repo
uvicorn store.api.app:app --reload

# En front/
npm run dev
```

Vite reenvía `/api` a `http://127.0.0.1:8000` (se cambia con la variable `API_URL`), así el navegador ve un solo origen
y no hace falta CORS. Con `python demo.py` pasa lo mismo: FastAPI sirve el front compilado y la API bajo `/api`.

El nombre de la tienda y la moneda que ven los clientes salen de `src/config.ts` o de las variables `VITE_STORE_NAME` y
`VITE_CURRENCY`, porque hoy no hay un endpoint público para leerlos.

## Pantallas

| Ruta | Pantalla | Requerimientos |
|---|---|---|
| `/` | Portada: categorías, ofertas, selección | |
| `/productos` | Catálogo con orden y filtros | RF-01 |
| `/productos/:code` | Detalle del producto | RF-02 |
| `/buscar` | Búsqueda por nombre y marca, con comparaciones | RF-03 |
| `/eficiencia` | Lista contra árbol binario, para la defensa | RF-04 |
| `/categorias` | Árbol de categorías y productos de cada rama | RF-05 |
| `/carrito` | Carrito, cotización y compra | RF-06, RF-07 |
| `/pedidos/:id`, `/seguimiento` | Estado del pedido | RF-08 |
| `/admin/ingresar` | Ingreso con token | RNF-04 |
| `/admin` | Resumen del negocio | RF-17 a RF-19 |
| `/admin/productos` | Productos, stock y deshacer | RF-10 a RF-13 |
| `/admin/categorias` | Categorías y ajuste de precios | RF-14, RF-15 |
| `/admin/pedidos` | Cola de pedidos | RF-16 |
| `/admin/reportes` | Ventas, más vendidos, stock bajo, estructuras, búsquedas | RF-17 a RF-21 |
| `/admin/exportar` | Catálogo en texto | RF-22 |
| `/admin/configuracion` | Configuración de la tienda | RF-23 |

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev:mock` | Front en modo demo |
| `npm run dev` | Front conectado a la API real |
| `npm run build` | Compila para producción |
| `npm test` | Tests de pantallas y lógica |
| `npm run test:contract` | Contrato contra el backend simulado |
| `npm run test:contract:real` | El mismo contrato contra FastAPI (necesita los flujos implementados) |
| `npm run e2e` | Recorridos en un navegador real, modo demo |
| `npm run e2e:real` | Los mismos recorridos contra FastAPI |
| `npm run contract:sync` | Trae el contrato de la API y regenera los tipos |

Los `e2e` usan Chromium, Chrome o Brave si están instalados; si no, `npx playwright install chromium`.
Por defecto usan la API de la carpeta de arriba; para otra copia: `API_REPO=/ruta/a/la/api npm run e2e:real`.

## Documentación

- [`docs/desarrollo.md`](docs/desarrollo.md): estructura del código y convenciones.
- [`docs/contrato-pendiente.md`](docs/contrato-pendiente.md): bug detectado en la API, decisiones de contrato para charlar
  en el grupo y correcciones para `docs/api.md`.
