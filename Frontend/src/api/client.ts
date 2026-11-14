import type { ApiEnvelope } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
let accessToken: string | null = null

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    const envelope = (await response.json()) as ApiEnvelope<{ accessToken: string }>
    if (!response.ok || !envelope.success || !envelope.data) return false
    setAccessToken(envelope.data.accessToken)
    return true
  } catch {
    return false
  }
}

async function request<T>(path: string, init: RequestInit = {}, canRefresh = true): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  const noRefreshPaths = ['/auth/login', '/auth/refresh', '/auth/logout']
  if (response.status === 401 && !noRefreshPaths.includes(path)) {
    if (canRefresh && await refreshAccessToken()) return request<T>(path, init, false)
    setAccessToken(null)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('autohire:unauthorized'))
  }

  let envelope: ApiEnvelope<T>
  try {
    envelope = (await response.json()) as ApiEnvelope<T>
  } catch {
    throw new ApiError('The server returned an invalid response', response.status)
  }

  if (!response.ok || !envelope.success || envelope.data === undefined) {
    if (response.status === 403 && envelope.error?.code === 'ACCOUNT_DEACTIVATED') {
      setAccessToken(null)
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('autohire:unauthorized'))
    }
    throw new ApiError(
      envelope.error?.message ?? 'The request could not be completed',
      response.status,
      envelope.error?.code,
      Number(response.headers.get('Retry-After')) || undefined,
    )
  }
  return envelope.data
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
}