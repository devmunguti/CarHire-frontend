import { http, HttpResponse } from 'msw'
import { bookings, DEMO_PASSWORD, users, vehicles } from './fixtures'

let networkAttempts = 0

export const handlers = [
  http.get('/api/v1/health', () =>
    HttpResponse.json({ success: true, data: { status: 'ok' }, error: null }),
  ),
  http.get('/api/v1/vehicles', () =>
    HttpResponse.json({ success: true, data: vehicles, error: null }),
  ),
  http.get('/api/v1/bookings', () =>
    HttpResponse.json({ success: true, data: bookings, error: null }),
  ),
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string }
    if (body.email === 'rate-limited@autohire.ke') {
      return HttpResponse.json(
        { success: false, data: null, error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts' } },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }
    if (body.email === 'deactivated@autohire.ke') {
      return HttpResponse.json(
        { success: false, data: null, error: { code: 'ACCOUNT_DEACTIVATED', message: 'This account has been deactivated' } },
        { status: 403 },
      )
    }
    if (body.email === 'network-error@autohire.ke' && networkAttempts++ === 0) {
      return HttpResponse.error()
    }

    const user = body.email === 'network-error@autohire.ke'
      ? users.find((item) => item.role === 'agent')
      : users.find((item) => item.email === body.email)
    if (!user || body.password !== DEMO_PASSWORD) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } },
        { status: 401 },
      )
    }
    return HttpResponse.json(
      { success: true, data: { accessToken: `mock-${user.role}`, user }, error: null },
      { headers: { 'Set-Cookie': `autohire_refresh=mock-${user.role}; HttpOnly; SameSite=Lax; Path=/` } },
    )
  }),
  http.post('/api/v1/auth/refresh', ({ request }) => {
    const refreshRole = request.headers.get('cookie')?.match(/autohire_refresh=mock-(owner|manager|agent|driver|mechanic)/)?.[1]
    if (!refreshRole) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({ success: true, data: { accessToken: `mock-${refreshRole}` }, error: null })
  }),
  http.post('/api/v1/auth/logout', () =>
    HttpResponse.json(
      { success: true, data: { loggedOut: true }, error: null },
      { headers: { 'Set-Cookie': 'autohire_refresh=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' } },
    ),
  ),
  http.get('/api/v1/auth/me', ({ request }) => {
    const role = request.headers.get('authorization')?.replace('Bearer mock-', '')
    const user = users.find((item) => item.role === role)
    if (!user) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({ success: true, data: user, error: null })
  }),
]