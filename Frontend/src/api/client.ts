import type { ApiEnvelope, ApiErrorEnvelope, CursorPage } from './types'
import { isMockApiEnabled } from './config'

const API_BASE_URL = isMockApiEnabled ? '/api/v1' : import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
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

async function fetchResponse(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(input, init)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('autohire:backend-available'))
    return response
  } catch (error) {
    if (!(error instanceof TypeError)) throw error
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('autohire:backend-unavailable'))
    throw new ApiError('The backend is unavailable. Check that the backend server is running.', 0, 'BACKEND_UNAVAILABLE')
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetchResponse(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    const envelope = (await response.json()) as ApiEnvelope<{ accessToken: string }> | ApiErrorEnvelope
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

  const response = await fetchResponse(`${API_BASE_URL}${path}`, {
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

  let envelope: ApiEnvelope<T> | ApiErrorEnvelope
  try {
    envelope = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope
  } catch {
    throw new ApiError('The server returned an invalid response', response.status)
  }

  if (!response.ok || !envelope.success || envelope.data === undefined) {
    const apiError = envelope.success ? undefined : envelope.error
    if (response.status === 403 && apiError?.code === 'ACCOUNT_DEACTIVATED') {
      setAccessToken(null)
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('autohire:unauthorized'))
    }
    throw new ApiError(
      apiError?.message ?? 'The request could not be completed',
      response.status,
      apiError?.code,
      Number(response.headers.get('Retry-After')) || undefined,
    )
  }
  return envelope.data
}

export const apiClient = {
  fetchRaw: fetchResponse,
  get: <T>(path: string, init: RequestInit = {}) => request<T>(path, init),
  getAll: async <T>(path: string, init: RequestInit = {}): Promise<T[]> => {
    const separator = path.indexOf('?')
    const pathname = separator < 0 ? path : path.slice(0, separator)
    const params = new URLSearchParams(separator < 0 ? '' : path.slice(separator + 1))
    params.set('limit', params.get('limit') ?? '50')
    const results: T[] = []
    const seenCursors = new Set<string>()
    let cursor = params.get('cursor')

    do {
      if (cursor) params.set('cursor', cursor)
      else params.delete('cursor')
      const page = await request<CursorPage<T>>(`${pathname}?${params.toString()}`, init)
      results.push(...page.items)
      cursor = page.nextCursor
      if (cursor && seenCursors.has(cursor)) {
        throw new ApiError('The server returned a repeated pagination cursor', 502, 'INVALID_PAGINATION')
      }
      if (cursor) seenCursors.add(cursor)
    } while (cursor)

    return results
  },
  post: <T>(path: string, body?: unknown, init: RequestInit = {}) =>
    request<T>(path, { ...init, method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, body: FormData, onProgress: (progress: number) => void) =>
    new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE_URL}${path}`)
      xhr.withCredentials = true
      if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
      })
      xhr.addEventListener('load', () => {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('autohire:backend-available'))
        let envelope: ApiEnvelope<T> | ApiErrorEnvelope
        try {
          envelope = JSON.parse(xhr.responseText) as ApiEnvelope<T> | ApiErrorEnvelope
        } catch {
          reject(new ApiError('The server returned an invalid response', xhr.status))
          return
        }
        if (xhr.status < 200 || xhr.status >= 300 || !envelope.success || envelope.data === undefined) {
          const apiError = envelope.success ? undefined : envelope.error
          reject(new ApiError(apiError?.message ?? 'The upload could not be completed', xhr.status, apiError?.code))
          return
        }
        onProgress(100)
        resolve(envelope.data)
      })
      xhr.addEventListener('error', () => {
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('autohire:backend-unavailable'))
        reject(new ApiError('The backend is unavailable. Check that the backend server is running.', 0, 'BACKEND_UNAVAILABLE'))
      })
      xhr.send(body)
    }),
}