import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ShoppingCart } from 'lucide-react'
import { useId, useMemo } from 'react'
import { api } from '@/api/endpoints'
import { keys } from '@/api/keys'
import { useCart } from '@/lib/cart'
import { Card, EmptyState, LinkButton, PageHeader, QueryState } from '@/ui'
import { CartLineItem } from './orders/CartLineItem'
import { CheckoutSummary } from './orders/CheckoutSummary'
import { UnavailableLineItem } from './orders/UnavailableLineItem'
import { useCheckout } from './orders/useCheckout'
import styles from './CartPage.module.css'

export function CartPage() {
  const { lines, setQuantity, remove } = useCart()
  const signature = lines.map((line) => `${line.code}x${line.quantity}`).join(',')
  const quote = useQuery({
    queryKey: keys.quote(signature),
    queryFn: () => api.cart.quote(lines),
    enabled: lines.length > 0,
    placeholderData: keepPreviousData,
    // El stock y los precios pueden cambiar: una cotización guardada no sirve para confirmar.
    staleTime: 0,
  })
  const catalog = useQuery({ queryKey: keys.products('code'), queryFn: () => api.products.list('code') })
  const products = useMemo(() => new Map(catalog.data?.map((product) => [product.code, product])), [catalog.data])
  // Vive acá y no en el resumen: si falla una cotización, el nombre escrito no se pierde.
  const checkout = useCheckout()
  const reviewTitle = useId()

  if (lines.length === 0) {
    return (
      <>
        <PageHeader title="Tu carrito" />
        {checkout.finishing ? null : (
          <Card>
            <EmptyState
              icon={<ShoppingCart size={28} aria-hidden />}
              title="Tu carrito está vacío"
              action={<LinkButton to="/productos">Ver productos</LinkButton>}
            >
              Agregá lo que necesites y lo vas a ver acá.
            </EmptyState>
          </Card>
        )}
      </>
    )
  }

  const inCart = (code: number) => lines.some((line) => line.code === code)

  return (
    <>
      <PageHeader title="Tu carrito" />
      <QueryState query={quote}>
        {(data) => {
          const toReview = data.unavailable.filter((item) => inCart(item.code))
          return (
            <div className={styles.layout}>
              <div className={styles.column} inert={checkout.placing}>
                {toReview.length > 0 ? (
                  <section className={styles.review} aria-labelledby={reviewTitle}>
                    <h2 id={reviewTitle}>Hay que revisar estos productos</h2>
                    <ul className={styles.lines}>
                      {toReview.map((item) => (
                        <UnavailableLineItem
                          key={item.code}
                          item={item}
                          product={products.get(item.code)}
                          onAdjust={(quantity) => setQuantity(item.code, quantity)}
                          onRemove={() => remove(item.code)}
                        />
                      ))}
                    </ul>
                  </section>
                ) : null}
                {data.lines.length > 0 ? (
                  <Card padded={false}>
                    <ul className={styles.lines} aria-busy={quote.isPlaceholderData || undefined}>
                      {lines.map(({ code, quantity }) => {
                        const line = data.lines.find((quoted) => quoted.code === code)
                        return line ? (
                          <CartLineItem
                            key={code}
                            line={line}
                            quantity={quantity}
                            product={products.get(code)}
                            onQuantityChange={(next) => setQuantity(code, next)}
                            onRemove={() => remove(code)}
                          />
                        ) : null
                      })}
                    </ul>
                  </Card>
                ) : null}
              </div>
              <CheckoutSummary
                total={data.total}
                units={data.lines.reduce((sum, line) => sum + line.quantity, 0)}
                blocked={toReview.length > 0}
                updating={quote.isFetching}
                customerName={checkout.customerName}
                nameError={checkout.nameError}
                placing={checkout.placing}
                onNameChange={checkout.changeName}
                onSubmit={checkout.submit}
              />
            </div>
          )
        }}
      </QueryState>
    </>
  )
}
