import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { api, type CartItem } from '@/api/endpoints'
import { useCart } from '@/lib/cart'
import { rememberOrder } from '@/lib/orders'
import { useToast } from '@/ui'

const ERRORS = {
  404: 'Un producto de tu carrito ya no está disponible y no se hizo el pedido. Actualizamos el carrito para que lo revises.',
  409: 'No alcanzó el stock de algún producto y no se hizo el pedido. Actualizamos el carrito para que lo revises.',
}

const NAME_REQUIRED = 'Escribí tu nombre para confirmar el pedido.'
const NAME_REJECTED = 'Revisá el nombre: la tienda no lo aceptó.'

export function useCheckout() {
  const { lines, clear } = useCart()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const [customerName, setCustomerName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  // `isPending` recién cambia en el próximo render: dos envíos seguidos lo verían en false.
  const sending = useRef(false)

  const placeOrder = useMutation({
    mutationFn: ({ customer, items }: { customer: string; items: CartItem[] }) => api.orders.place(customer, items),
    onSuccess: (order) => {
      rememberOrder(order.id)
      clear()
      void queryClient.invalidateQueries()
      toast.success(`Pedido #${order.id} confirmado`)
      void navigate(`/pedidos/${order.id}?nuevo=1`)
    },
    onError: (error) => {
      // Lo que falló casi siempre es stock o un producto: la cotización vieja ya no vale.
      void queryClient.invalidateQueries()
      if (error instanceof ApiError && error.fields.customer_name) setNameError(NAME_REJECTED)
      else toast.error(error, ERRORS)
    },
    onSettled: () => {
      sending.current = false
    },
  })

  const changeName = (value: string) => {
    setCustomerName(value)
    setNameError(null)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const customer = customerName.trim()
    if (!customer) {
      setNameError(NAME_REQUIRED)
      const field = event.currentTarget.elements.namedItem('customerName')
      if (field instanceof HTMLInputElement) field.focus()
      return
    }
    if (sending.current) return
    sending.current = true
    placeOrder.mutate({ customer, items: lines })
  }

  return {
    customerName,
    changeName,
    nameError,
    submit,
    placing: placeOrder.isPending,
    /** La compra salió: el carrito ya se vació y la navegación está en camino. */
    finishing: placeOrder.isPending || placeOrder.isSuccess,
  }
}
