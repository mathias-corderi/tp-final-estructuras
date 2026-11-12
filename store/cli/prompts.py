from store.cli import prompts
from store.container import Container


def list_all_products(c: Container) -> None:
    """Imprime todos los productos, incluidos los inactivos, ordenados por código."""
    prompts.title("Catálogo Completo (Flujo 2)")
    products = c.catalog.list_products(sort="code", include_inactive=True)
    prompts.print_products(products)


def add_product(c: Container) -> None:
    """Pide cada campo (min_stock y descuento opcionales) y crea el producto."""
    prompts.title("Alta de Producto")
    data = {
        "code": prompts.ask_int("Código", minimum=1),
        "name": prompts.ask_text("Nombre"),
        "brand": prompts.ask_text("Marca"),
        "price": prompts.ask_float("Precio", minimum=0.01),
        "stock": prompts.ask_int("Stock inicial", minimum=0),
        "category": prompts.ask_text("Categoría (ej. Almacén/Bebidas)"),
    }
    
    ms = prompts.ask_int("Stock mínimo (Enter para default)", minimum=0, optional=True)
    if ms is not None:
        data["min_stock"] = ms
        
    dp = prompts.ask_float("Descuento % (Enter para 0.0)", minimum=0.0, optional=True)
    if dp is not None:
        data["discount_percent"] = dp
        
    act = prompts.confirm("¿Está activo?")
    if not act:
        data["active"] = False

    p = c.catalog.add(data)
    print(f"\n¡Producto {p.code} ({p.name}) creado con éxito!")


def edit_product(c: Container) -> None:
    """Pide un código, muestra el producto, pide cada campo (en blanco = mantener) y aplica solo los cambios."""
    prompts.title("Editar Producto")
    code = prompts.ask_int("Código del producto a editar")
    
    product = c.catalog.get(code, include_inactive=True)

    print(f"\nEditando: [{product.code}] {product.name}")
    print("Dejá el campo en blanco y apretá Enter si querés mantener el valor actual.")
    
    changes = {}
    
    name = prompts.ask_text(f"Nombre [{product.name}]", optional=True)
    if name is not None: changes["name"] = name
    
    brand = prompts.ask_text(f"Marca [{product.brand}]", optional=True)
    if brand is not None: changes["brand"] = brand
    
    price = prompts.ask_float(f"Precio [{product.price}]", minimum=0.01, optional=True)
    if price is not None: changes["price"] = price
    
    cat = prompts.ask_text(f"Categoría [{product.category}]", optional=True)
    if cat is not None: changes["category"] = cat
    
    ms = prompts.ask_int(f"Stock mínimo [{product.min_stock}]", minimum=0, optional=True)
    if ms is not None: changes["min_stock"] = ms
    
    dp = prompts.ask_float(f"Descuento % [{product.discount_percent}]", minimum=0.0, optional=True)
    if dp is not None: changes["discount_percent"] = dp
    
    # Para active usamos ask_text y no confirm, para permitir dejarlo en blanco (optional=True)
    act = prompts.ask_text(f"¿Activo? (s/n) [{'s' if product.active else 'n'}]", optional=True)
    if act is not None:
        changes["active"] = act.lower() in ("y", "yes", "s", "si", "sí")

    if changes:
        c.catalog.update(code, changes)
        print("\n¡Producto actualizado exitosamente!")
    else:
        print("\nNo se detectaron cambios.")


def delete_product(c: Container) -> None:
    """Pide un código, muestra el producto y pide confirmación antes de borrarlo."""
    prompts.title("Eliminar Producto")
    code = prompts.ask_int("Código del producto a borrar")
    
    product = c.catalog.get(code, include_inactive=True)

    print(f"\nATENCIÓN: Vas a borrar el producto [{product.code}] {product.name}")
    if prompts.confirm("¿Estás absolutamente seguro?"):
        c.catalog.delete(code)
        print("\nProducto eliminado del catálogo de manera exitosa.")
    else:
        print("\nOperación cancelada. El producto sigue a salvo.")


def manage_stock(c: Container) -> None:
    """Submenú: 1) reponer (cantidad) 2) ajustar (delta + motivo)."""
    prompts.title("Gestión de Stock")
    print("1) Reponer stock (ingreso de nueva mercadería)")
    print("2) Ajustar stock (roturas, corrección de inventario, etc.)")
    
    opcion = prompts.ask_text("\nElegí una opción (1 o 2)")
    
    if opcion == "1":
        code = prompts.ask_int("\nCódigo del producto")
        qty = prompts.ask_int("Cantidad a sumar", minimum=1)
        c.catalog.restock(code, qty)
        print("\n¡Stock repuesto con éxito!")
        
    elif opcion == "2":
        code = prompts.ask_int("\nCódigo del producto")
        delta = prompts.ask_int("Diferencia (ej. -3 para descontar, 5 para sumar)")
        reason = prompts.ask_text("Motivo del ajuste")
        c.catalog.adjust_stock(code, delta, reason)
        print("\n¡Stock ajustado con éxito!")
        
    else:
        print("\nOpción inválida.")


def undo_last(c: Container) -> None:
    """Muestra qué se va a deshacer (el tope del historial), pide confirmación y deshace."""
    prompts.title("Deshacer Operación")
    history = c.catalog.undo_history()
    if not history:
        print("No hay ninguna operación reciente para deshacer.")
        return
        
    last_op = history[0]
    print(f"Última operación registrada: {last_op.description}")
    
    if prompts.confirm("\n¿Querés deshacer esta operación y volver al estado anterior?"):
        c.catalog.undo()
        print("\nLa operación fue deshecha exitosamente.")
    else:
        print("\nCancelado.")