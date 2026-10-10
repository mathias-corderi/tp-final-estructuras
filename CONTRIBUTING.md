# Cómo trabajamos

## La idea: TDD

El repo arranca con **todo el contrato definido y nada implementado**:

- Cada clase, método y endpoint ya existe con su firma, y su docstring explica qué tiene que hacer. El cuerpo es `raise NotImplementedError("Flow N: ...")`.
- Los tests (`tests/`) son la especificación. Hoy fallan; tu trabajo es ponerlos en verde.
- Ya están hechos solo los "cables": `config`, `errors`, `container`, `api/app.py`, `api/deps.py`, los schemas, `cli/menu.py` y `cli/prompts.py`.

Ciclo de trabajo:

1. Elegí el siguiente test rojo de tu flujo: `pytest -m flow_catalog -x`.
2. Leé el test y el docstring del método.
3. Escribí lo mínimo para que pase.
4. Corré de nuevo. Cuando pase, mejorá el código si hace falta y hacé commit.

```bash
pytest -m flow_catalog                       # todo tu flujo
pytest tests/unit/test_bst.py                # un archivo
pytest tests/unit/test_bst.py::test_delete_leaf -x -vv   # un test, con detalle
pytest -m shared                             # infraestructura: tiene que pasar SIEMPRE
```

Si al probar la API ves `501 Not implemented yet: Flow 4: ...`, todavía falta esa parte y el mensaje dice de quién es.

## Reglas

1. **Las estructuras van a mano.** Nada de `collections.deque`, `queue`, `bisect`, `sorted()` dentro de las estructuras, ni diccionarios en lugar de árboles. Es lo que se evalúa (30 %).
2. **No se cambian los tests ni el contrato sin acordarlo.** Esto incluye schemas, firmas, nombres de atributos y rutas. Si un test parece estar mal, se habla en el grupo y se cambia en un PR propio.
3. **Capas:**
   - `structures/` no importa nada del proyecto.
   - `services/` lanza errores de `store/errors.py`; nunca devuelve `None` para decir "no encontrado".
   - `api/` y `cli/` no tienen lógica: llaman a los servicios.
4. **Todo en inglés en el código:** variables, funciones, clases, endpoints, campos JSON y mensajes. La documentación para la cátedra va en español.
5. **Tenés que poder explicar todo lo que subís.** En la defensa preguntan sobre cualquier parte del código.

## Git

- `main` siempre tiene que estar verde en `pytest -m shared`. No se pushea directo a `main`.
- Una rama por tarea, con el prefijo del flujo: `flow-catalog/bst-insert`, `flow-orders/queue`, `flow-reports/storage`.
- **Commits chicos y seguidos**, cada uno con un mensaje que se entienda, por ejemplo `implement BST insert and search`. La cátedra mira el historial: si alguien sube todo el día antes, se nota.
- Pull Request a `main` con al menos **una review de otro integrante**. Revisar el código de otro también sirve para preparar la defensa.
- Antes de abrir el PR, actualizá tu rama con main y corré `pytest -m shared` y `pytest -m <tu flujo>`.

```bash
git switch main && git pull
git switch -c flow-catalog/bst-insert
# ... trabajo + commits ...
git push -u origin flow-catalog/bst-insert       # y abrís el PR en GitHub
```

## Definición de "terminado"

Un flujo está terminado cuando cumple todo esto:

- [ ] `pytest -m <flujo>` pasa completo y `pytest -m shared` sigue en verde.
- [ ] Las opciones de consola del flujo funcionan (`python main.py`).
- [ ] Los endpoints andan desde `/docs`.
- [ ] Tu sección de `docs/decisiones.md` está completa, con números medidos.
- [ ] Anotaste tu uso de IA en `USO-DE-IA.md`.
