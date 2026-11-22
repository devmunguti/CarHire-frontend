import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, getAccessToken, setAccessToken } from './client'

const envelope = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: status < 400, data, error: null }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setAccessToken(null)
  })

  it('attaches the in-memory token and retries a 401 once after refresh', async () => {
    setAccessToken('old-token')
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(envelope(null, 401))
      .mockResolvedValueOnce(envelope({ accessToken: 'new-token' }))
      .mockResolvedValueOnce(envelope({ status: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.get('/health')).resolves.toEqual({ status: 'ok' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer old-token')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/refresh')
    expect(fetchMock.mock.calls[1][1].credentials).toBe('include')
    expect(fetchMock.mock.calls[2][1].headers.get('Authorization')).toBe('Bearer new-token')
    expect(getAccessToken()).toBe('new-token')
  })

  it('throws a typed ApiError for forbidden responses', async () => {
    setAccessToken('active-token')
    const unauthorizedEvent = vi.fn()
    window.addEventListener('autohire:unauthorized', unauthorizedEvent)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      data: null,
      error: { code: 'FORBIDDEN', message: 'Not allowed' },
    }), { status: 403 })))

    await expect(apiClient.get('/vehicles')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'FORBIDDEN',
    })
    expect(getAccessToken()).toBe('active-token')
    expect(unauthorizedEvent).not.toHaveBeenCalled()
    window.removeEventListener('autohire:unauthorized', unauthorizedEvent)
  })

  it('dispatches a backend-unavailable event when the API cannot be reached', async () => {
    const unavailableEvent = vi.fn()
    window.addEventListener('autohire:backend-unavailable', unavailableEvent)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(apiClient.get('/health')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      code: 'BACKEND_UNAVAILABLE',
    })
    expect(unavailableEvent).toHaveBeenCalledOnce()
    window.removeEventListener('autohire:backend-unavailable', unavailableEvent)
  })

  it('clears the session and notifies AuthContext after refresh fails on 401', async () => {
    setAccessToken('expired-token')
    const unauthorizedEvent = vi.fn()
    window.addEventListener('autohire:unauthorized', unauthorizedEvent)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(envelope(null, 401))
      .mockResolvedValueOnce(envelope(null, 401)))

    await expect(apiClient.get('/vehicles')).rejects.toMatchObject({ status: 401 })
    expect(getAccessToken()).toBeNull()
    expect(unauthorizedEvent).toHaveBeenCalledTimes(1)
    window.removeEventListener('autohire:unauthorized', unauthorizedEvent)
  })

  it('clears the session when the server marks an account deactivated', async () => {
    setAccessToken('active-token')
    const unauthorizedEvent = vi.fn()
    window.addEventListener('autohire:unauthorized', unauthorizedEvent)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      data: null,
      error: { code: 'ACCOUNT_DEACTIVATED', message: 'Account deactivated' },
    }), { status: 403 })))

    await expect(apiClient.get('/vehicles')).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_DEACTIVATED',
    })
    expect(getAccessToken()).toBeNull()
    expect(unauthorizedEvent).toHaveBeenCalledTimes(1)
    window.removeEventListener('autohire:unauthorized', unauthorizedEvent)
  })

  it('collects cursor pages while preserving list filters', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(envelope({ items: [{ id: 'one' }], nextCursor: 'opaque-next' }))
      .mockResolvedValueOnce(envelope({ items: [{ id: 'two' }], nextCursor: null }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiClient.getAll<{ id: string }>('/bookings?status=reserved')).resolves.toEqual([
      { id: 'one' },
      { id: 'two' },
    ])
    expect(new URL(fetchMock.mock.calls[0][0], 'https://autohire.test').searchParams.get('status')).toBe('reserved')
    expect(new URL(fetchMock.mock.calls[0][0], 'https://autohire.test').searchParams.get('limit')).toBe('50')
    expect(new URL(fetchMock.mock.calls[1][0], 'https://autohire.test').searchParams.get('cursor')).toBe('opaque-next')
  })

  it('rejects a repeated cursor rather than looping forever', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(envelope({ items: [{ id: 'one' }], nextCursor: 'same' }))
      .mockResolvedValueOnce(envelope({ items: [{ id: 'two' }], nextCursor: 'same' })))

    await expect(apiClient.getAll<{ id: string }>('/bookings')).rejects.toMatchObject({
      code: 'INVALID_PAGINATION',
    })
  })
})