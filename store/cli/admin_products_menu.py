from store.cli import prompts  # noqa: F401 (funciones que vas a necesitar)
from store.container import Container


def list_all_products(c: Container) -> None:
    """Imprime todos los productos, incluidos los inactivos, ordenados por código."""
    # Acá confiamos ciegamente en el método list_products del Flujo 1
    products = c.catalog.list_products(sort="code", include_inactive=True)
    
    if not products:
        print("El catálogo está vacío.")
        return
        
    for p in products:
        estado = "Activo" if p.active else "Inactivo"
        print(f"[{p.code}] {p.name} ({p.brand}) | Categoría: {p.category} | ${p.price:.2f} | Stock: {p.stock} ({estado})")


def add_product(c: Container) -> None:
    """Pide cada campo (min_stock y descuento opcionales) y crea el producto."""
    print("\n--- Alta de Producto ---")
    data = {
        "code": int(input("Código: ")),
        "name": input("Nombre: ").strip(),
        "brand": input("Marca: ").strip(),
        "price": float(input("Precio: ")),
        "stock": int(input("Stock inicial: ")),
        "category": input("Categoría: ").strip(),
    }
    
    ms = input("Stock mínimo (Enter para usar default): ").strip()
    if ms:
        data["min_stock"] = int(ms)
        
    dp = input("Descuento % (Enter para 0.0): ").strip()
    if dp:
        data["discount_percent"] = float(dp)
        
    act = input("¿Está activo? (s/n, default s): ").strip().lower()
    if act == "n":
        data["active"] = False

    # Si hay errores (ej. DuplicateCode), el menú principal lo ataja
    p = c.catalog.add(data)
    print(f"¡Producto {p.code} ({p.name}) creado con éxito!")


def edit_product(c: Container) -> None:
    """Pide un código, muestra el producto, pide cada campo (en blanco = mantener) y aplica solo los cambios."""
    code = int(input("\nCódigo del producto a editar: "))
    
    # Delegamos la búsqueda al Flujo 1. Si no existe, lanza ProductNotFound y corta acá.
    product = c.catalog.get(code, include_inactive=True)

    print(f"\nEditando: [{product.code}] {product.name}")
    print("Dejá el campo en blanco y apretá Enter si querés mantener el valor actual.")
    
    changes = {}
    
    name = input(f"Nombre [{product.name}]: ").strip()
    if name: changes["name"] = name
    
    brand = input(f"Marca [{product.brand}]: ").strip()
    if brand: changes["brand"] = brand
    
    price = input(f"Precio [{product.price}]: ").strip()
    if price: changes["price"] = float(price)
    
    cat = input(f"Categoría [{product.category}]: ").strip()
    if cat: changes["category"] = cat
    
    ms = input(f"Stock mínimo [{product.min_stock}]: ").strip()
    if ms: changes["min_stock"] = int(ms)
    
    dp = input(f"Descuento % [{product.discount_percent}]: ").strip()
    if dp: changes["discount_percent"] = float(dp)
    
    act = input(f"¿Activo? (s/n) [{'s' if product.active else 'n'}]: ").strip().lower()
    if act == 's':
        changes["active"] = True
    elif act == 'n':
        changes["active"] = False

    if changes:
        c.catalog.update(code, changes)
        print("¡Producto actualizado exitosamente!")
    else:
        print("No se detectaron cambios.")


def delete_product(c: Container) -> None:
    """Pide un código, muestra el producto y pide confirmación antes de borrarlo."""
    code = int(input("\nCódigo del producto a borrar: "))
    
    # Validamos que exista usando el Flujo 1
    product = c.catalog.get(code, include_inactive=True)

    print(f"\nATENCIÓN: Vas a borrar el producto [{product.code}] {product.name}")
    conf = input("¿Estás absolutamente seguro? (s/n): ").strip().lower()
    if conf == 's':
        c.catalog.delete(code)
        print("Producto eliminado del catálogo.")
    else:
        print("Operación cancelada.")


def manage_stock(c: Container) -> None:
    """Submenú: 1) reponer (cantidad) 2) ajustar (delta + motivo)."""
    print("\n--- Gestión de Stock ---")
    print("1) Reponer stock")
    print("2) Ajustar stock (roturas, etc.)")
    
    opcion = input("Elegí una opción (1 o 2): ").strip()
    
    if opcion == "1":
        code = int(input("Código del producto: "))
        qty = int(input("Cantidad a sumar: "))
        c.catalog.restock(code, qty)
        print("¡Stock repuesto con éxito!")
        
    elif opcion == "2":
        code = int(input("Código del producto: "))
        delta = int(input("Diferencia (ej. -3 para descontar, 5 para sumar): "))
        reason = input("Motivo del ajuste: ").strip()
        c.catalog.adjust_stock(code, delta, reason)
        print("¡Stock ajustado con éxito!")
        
    else:
        print("Opción inválida.")


def undo_last(c: Container) -> None:
    """Muestra qué se va a deshacer (el tope del historial), pide confirmación y deshace."""
    history = c.catalog.undo_history()
    if not history:
        print("\nNo hay ninguna operación reciente para deshacer.")
        return
        
    last_op = history[0]
    print(f"\nÚltima operación registrada: {last_op.description}")
    
    conf = input("¿Querés deshacer esta operación? (s/n): ").strip().lower()
    if conf == 's':
        c.catalog.undo()
        print("La operación fue deshecha exitosamente.")
    else:
        print("Cancelado.")