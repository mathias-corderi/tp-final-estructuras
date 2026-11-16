import { useMutation } from '@tanstack/react-query'
import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { api } from '@/api/endpoints'
import { adminSession } from '@/api/session'
import { config } from '@/config'
import { useAdminToken } from '@/layouts/RequireAdmin'
import { useTitle } from '@/lib/useTitle'
import { Button, describeError, TextField } from '@/ui'
import styles from './AdminLoginPage.module.css'

const WRONG_TOKEN = 'Token incorrecto'

// Un header no admite otra cosa: fetch tira error y Python no puede comparar. Se vería como la API caída.
const canBeSent = (token: string) => /^[\x20-\x7e]+$/.test(token)

/** FastAPI valida el token antes de armar el Container: su 501 prueba que el token es correcto. */
const provesTokenIsValid = (error: unknown) => error instanceof ApiError && error.isNotImplemented && !error.isUnavailable

const isWrongToken = (error: unknown) => error instanceof ApiError && (error.status === 401 || error.status === 403)

function requestedScreen(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' ? from : '/admin'
}

export function AdminLoginPage() {
  useTitle('Ingresar')
  const session = useAdminToken()
  const location = useLocation()
  const [token, setToken] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const verify = useMutation({
    mutationFn: (candidate: string) => api.admin.verifyToken(candidate),
    onSuccess: (_settings, candidate) => adminSession.set(candidate),
    onError: (error, candidate) => {
      if (provesTokenIsValid(error)) adminSession.set(candidate)
      else if (isWrongToken(error)) setFieldError(WRONG_TOKEN)
      else setGeneralError(describeError(error))
    },
  })

  // Guardar la sesión vuelve a renderizar la página y este Navigate hace la redirección.
  if (session) return <Navigate to={requestedScreen(location.state)} replace />

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFieldError(null)
    setGeneralError(null)
    const candidate = token.trim()
    if (!candidate) setFieldError('Ingresá el token')
    else if (!canBeSent(candidate)) setFieldError(WRONG_TOKEN)
    else verify.mutate(candidate)
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <KeyRound size={22} aria-hidden />
        </div>
        <p className={styles.store}>{config.storeName}</p>
        <h1>Panel del dueño</h1>
        <p className={styles.intro}>Ingresá tu token para administrar la tienda.</p>
        <form onSubmit={submit} noValidate className={styles.form}>
          <div aria-live="polite">
            <TextField
              label="Token de acceso"
              type="password"
              autoComplete="current-password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              error={fieldError}
            />
          </div>
          {generalError ? (
            <p role="alert" className={styles.alert}>
              {generalError}
            </p>
          ) : null}
          <Button type="submit" block loading={verify.isPending}>
            Ingresar
          </Button>
        </form>
        <Link to="/" className={styles.back}>
          Volver a la tienda
        </Link>
      </div>
    </main>
  )
}
