/**
 * Datos fijos del front.
 *
 * El nombre de la tienda y la moneda viven en GET /admin/settings, que pide el token del dueño:
 * los clientes no pueden leerlos. Mientras el contrato no sume un endpoint público, salen de acá.
 */
export const config = {
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api',
  storeName: (import.meta.env.VITE_STORE_NAME as string | undefined) ?? 'Almacén - Grupo 4',
  currency: (import.meta.env.VITE_CURRENCY as string | undefined) ?? 'ARS',
}
