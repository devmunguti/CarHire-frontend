import { http, HttpResponse } from 'msw'
import { bookings, DEMO_PASSWORD, users, vehicles } from './fixtures'
import { buildDashboardData, getOpenIncidents, getPendingApprovalCount, searchFixtures } from '../features/dashboard/dashboardData'
import type { Booking, BookingCreateRequest, PaymentMethod, QuoteRequest, QuoteResponse } from '../api/types'

let networkAttempts = 0
const bookingStore: Booking[] = [...bookings]

const blockingStatuses = new Set(['reserved', 'confirmed', 'checked_out', 'overdue'])

function overlaps(booking: Booking, pickupAt: string, returnAt: string) {
  return blockingStatuses.has(booking.status) && booking.pickupAt < returnAt && booking.returnAt > pickupAt
}

function isVehicleAvailable(vehicleId: string, pickupAt: string, returnAt: string) {
  const vehicle = vehicles.find((item) => item.id === vehicleId)
  return Boolean(vehicle && !['maintenance', 'inactive'].includes(vehicle.status) && !bookingStore.some((booking) => booking.vehicleId === vehicleId && overlaps(booking, pickupAt, returnAt)))
}

function calculateMockQuote(body: QuoteRequest, ratePerDay: number): QuoteResponse {
  const milliseconds = Date.parse(body.returnAt) - Date.parse(body.pickupAt)
  const baseDays = Math.max(1, Math.ceil(milliseconds / 86_400_000))
  const baseAmountKes = ratePerDay * baseDays
  const chauffeurFeeKes = body.mode === 'chauffeur' ? 3500 * baseDays : 0
  const extraPrices: Record<string, { label: string; amountKes: number; perDay: boolean }> = {
    baby_seat: { label: 'Baby seat', amountKes: 500, perDay: true },
    rooftop_tent: { label: 'Rooftop tent', amountKes: 1800, perDay: true },
    cooler_box: { label: 'Cooler box', amountKes: 700, perDay: true },
    airport_pickup: { label: 'Airport pickup', amountKes: 2500, perDay: false },
  }
  const extras = body.extras.flatMap((code) => {
    const item = extraPrices[code]
    return item ? [{ code, label: item.label, amountKes: item.amountKes * (item.perDay ? baseDays : 1) }] : []
  })
  const taxable = baseAmountKes + chauffeurFeeKes + extras.reduce((sum, item) => sum + item.amountKes, 0)
  const vatAmountKes = Math.round(taxable * 0.16)
  return {
    currency: 'KES',
    pricingSnapshot: { baseDays, baseRateKes: ratePerDay, baseAmountKes, chauffeurFeeKes, extras, vatRate: 16, vatAmountKes, totalDueKes: taxable + vatAmountKes, refundableDepositKes: 15000 },
  }
}

export const handlers = [
  http.get('/api/v1/health', () =>
    HttpResponse.json({ success: true, data: { status: 'ok' }, error: null }),
  ),
  http.get('/api/v1/vehicles', ({ request }) => {
    const url = new URL(request.url)
    const pickupAt = url.searchParams.get('from') ?? ''
    const returnAt = url.searchParams.get('to') ?? ''
    const available = pickupAt && returnAt
      ? vehicles.filter((vehicle) => isVehicleAvailable(vehicle.id, pickupAt, returnAt))
      : vehicles
    return HttpResponse.json({ success: true, data: available, error: null })
  }),
  http.get('/api/v1/bookings', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const paymentMethod = url.searchParams.get('paymentMethod')
    const vehicleId = url.searchParams.get('vehicleId')
    const search = (url.searchParams.get('search') ?? '').toLocaleLowerCase()
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const pickup = url.searchParams.get('pickup')
    const returning = url.searchParams.get('return')
    const today = new Date().toISOString().slice(0, 10)
    let rows = [...bookingStore]
    if (status === 'active') rows = rows.filter((booking) => booking.status === 'checked_out')
    else if (status) rows = rows.filter((booking) => booking.status === status || (status === 'cancelled' && booking.status === 'expired'))
    if (paymentMethod) rows = rows.filter((booking) => booking.paymentMethod === paymentMethod)
    if (vehicleId) rows = rows.filter((booking) => booking.vehicleId === vehicleId)
    if (search) rows = rows.filter((booking) => `${booking.reference} ${booking.customerName ?? ''}`.toLocaleLowerCase().includes(search))
    if (from) rows = rows.filter((booking) => booking.pickupAt >= from)
    if (to) rows = rows.filter((booking) => booking.returnAt <= to)
    if (pickup === 'due-today') rows = rows.filter((booking) => booking.status === 'confirmed' && booking.pickupAt.slice(0, 10) === today)
    if (returning === 'due-today') rows = rows.filter((booking) => ['checked_out', 'overdue'].includes(booking.status) && booking.returnAt.slice(0, 10) === today)
    return HttpResponse.json({ success: true, data: rows, error: null })
  }),
  http.get('/api/v1/bookings/:id', ({ params }) => {
    const booking = bookingStore.find((item) => item.id === params.id)
    if (!booking) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    return HttpResponse.json({ success: true, data: booking, error: null })
  }),
  http.post('/api/v1/quotes/calculate', async ({ request }) => {
    const body = await request.json() as QuoteRequest
    const vehicle = vehicles.find((item) => item.id === body.vehicleId)
    if (!vehicle) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } }, { status: 404 })
    return HttpResponse.json({
      success: true,
      data: calculateMockQuote(body, vehicle.ratePerDay),
      error: null,
    })
  }),
  http.post('/api/v1/bookings', async ({ request }) => {
    const body = await request.json() as BookingCreateRequest
    if (!isVehicleAvailable(body.vehicleId, body.pickupAt, body.returnAt)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VEHICLE_UNAVAILABLE', message: 'This car was just booked for those dates' } }, { status: 409 })
    }
    const vehicle = vehicles.find((item) => item.id === body.vehicleId)!
    const quote = calculateMockQuote(body, vehicle.ratePerDay)
    const bookingIndex = bookingStore.length + 1
    const createdAt = new Date().toISOString()
    const paymentMethod: PaymentMethod = body.paymentMethod
    const booking: Booking = {
      id: `booking-${String(bookingIndex).padStart(2, '0')}`,
      reference: `BK-${createdAt.slice(2, 7).replace('-', '')}-${String(bookingIndex).padStart(4, '0')}`,
      vehicleId: body.vehicleId,
      customerId: `cus-new-${bookingIndex}`,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      customerIdNumber: body.customerIdNumber,
      status: 'reserved',
      pendingApproval: paymentMethod !== 'mpesa_online',
      mode: body.mode,
      paymentMethod,
      holdExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      createdById: body.createdById,
      pickupAt: body.pickupAt,
      returnAt: body.returnAt,
      totalKes: quote.pricingSnapshot.totalDueKes,
      pricingSnapshot: quote.pricingSnapshot,
      payments: [],
      events: [{ id: `evt-new-${bookingIndex}`, type: 'created', actor: body.createdById, note: 'Booking reserved', createdAt }],
      driver: body.mode === 'chauffeur' ? users.find((item) => item.role === 'driver') : undefined,
      inspections: [],
      auditEntries: [{ id: `audit-new-${bookingIndex}`, type: 'booking.reserved', actor: body.createdById, note: 'Booking created from wizard', createdAt }],
    }
    bookingStore.unshift(booking)
    return HttpResponse.json({ success: true, data: booking, error: null }, { status: 201 })
  }),
  http.patch('/api/v1/bookings/:id', async ({ params, request }) => {
    const index = bookingStore.findIndex((item) => item.id === params.id)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const patch = await request.json() as Partial<Booking>
    const current = bookingStore[index]
    if (current.status === 'reserved' && current.holdExpiresAt && Date.parse(current.holdExpiresAt) <= Date.now() && patch.status === 'confirmed') {
      return HttpResponse.json({ success: false, data: null, error: { code: 'HOLD_EXPIRED', message: 'The booking hold has expired' } }, { status: 409 })
    }
    const updated: Booking = {
      ...current,
      ...patch,
      events: [...(current.events ?? []), { id: `evt-${Date.now()}`, type: `status.${patch.status ?? 'updated'}`, actor: 'Staff', note: 'Booking updated', createdAt: new Date().toISOString() }],
    }
    bookingStore[index] = updated
    return HttpResponse.json({ success: true, data: updated, error: null })
  }),
  http.get('/api/v1/dashboard', ({ request }) => {
    const url = new URL(request.url)
    const failedCard = url.searchParams.get('fail')
    const data = buildDashboardData()
    return HttpResponse.json({
      success: true,
      data: failedCard ? { ...data, cardErrors: { [failedCard]: 'Could not load this metric' } } : data,
      error: null,
    })
  }),
  http.get('/api/v1/notifications', () => HttpResponse.json({
    success: true,
    data: { pendingApprovals: getPendingApprovalCount(), openIncidents: getOpenIncidents().length },
    error: null,
  })),
  http.get('/api/v1/search', ({ request }) => {
    const query = new URL(request.url).searchParams.get('q') ?? ''
    return HttpResponse.json({ success: true, data: searchFixtures(query), error: null })
  }),
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
  http.post('/api/v1/auth/refresh', ({ cookies }) => {
    const refreshRole = cookies.autohire_refresh?.match(/^mock-(owner|manager|agent|driver|mechanic)$/)?.[1]
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