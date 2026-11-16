import { Search, ShoppingBasket, ShoppingCart } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { config } from '@/config'
import { useCart } from '@/lib/cart'
import styles from './StoreLayout.module.css'

const NAV = [
  { to: '/productos', label: 'Productos' },
  { to: '/categorias', label: 'Categorías' },
  { to: '/seguimiento', label: 'Seguí tu pedido' },
]

function HeaderSearch() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const current = params.get('name') ?? ''
  const [text, setText] = useState(current)

  useEffect(() => setText(current), [current])

  // Solo se busca al confirmar: cada búsqueda queda registrada en el historial que ve el dueño.
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const term = text.trim()
    if (term) void navigate(`/buscar?name=${encodeURIComponent(term)}`)
  }

  return (
    <form className={styles.search} role="search" onSubmit={submit}>
      <input
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="¿Qué estás buscando?"
        aria-label="Buscar productos por nombre"
      />
      <button type="submit" aria-label="Buscar">
        <Search size={20} aria-hidden />
      </button>
    </form>
  )
}

function CartLink() {
  const { units } = useCart()
  return (
    <Link to="/carrito" className={styles.cart} aria-label={units > 0 ? `Carrito, ${units} ${units === 1 ? 'unidad' : 'unidades'}` : 'Carrito vacío'}>
      <ShoppingCart size={22} aria-hidden />
      <span className={styles.cartText}>Carrito</span>
      {units > 0 ? <span className={styles.cartCount} aria-hidden>{units}</span> : null}
    </Link>
  )
}

export function StoreLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={styles.shell}>
      <a href="#contenido" className={styles.skip}>
        Saltar al contenido
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <span className={styles.logo}>
              <ShoppingBasket size={20} aria-hidden />
            </span>
            {config.storeName}
          </Link>
          <HeaderSearch />
          <CartLink />
        </div>
        <nav className={styles.nav} aria-label="Principal">
          <div className={styles.navInner}>
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? styles.active : undefined)}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main id="contenido" className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <strong>{config.storeName}</strong>
            <p>Tu almacén de barrio, ahora online. Armá tu pedido y seguilo desde acá.</p>
          </div>
          <nav aria-label="Pie de página">
            <Link to="/seguimiento">Seguí tu pedido</Link>
            <Link to="/eficiencia">Cómo buscamos tus productos</Link>
            <Link to="/admin">Acceso del dueño</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
