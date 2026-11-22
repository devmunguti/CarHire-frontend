import { http, HttpResponse } from 'msw'
import { auditEntries, bookings, DEMO_PASSWORD, drivers, incidents, mechanics, maintenanceWindows, staffMembers, users, vehicles } from './fixtures'
import { buildDashboardData, searchFixtures } from '../features/dashboard/dashboardData'
import type { AuditEntry, Booking, BookingCreateRequest, BookingPayment, DriverTripStatus, GuestBookingAccess, GuestBookingSummary, GuestCheckoutData, HandoverRequest, HandoverSettlement, MaintenanceWindow, MaintenanceWindowCreateRequest, MaintenanceWindowUpdateRequest, PaymentMethod, QuoteRequest, QuoteResponse, StaffInvitationRequest, StaffMember, StaffUpdateRequest, StkInitiation, StkStatus, Vehicle, VehicleCreateRequest, VehicleUpdateRequest } from '../api/types'
import { getDriverEligibilityReason } from '../features/drivers/driverRules'
import type { Incident, IncidentDispatchType, Mechanic, MechanicCreateRequest } from '../api/types'
import { getNearestMechanics } from '../features/incidents/incidentGeo'
import { toGeoJson, toLeaflet } from '../lib/geo'
import { isAllowedOperationPhoto } from '../lib/image'

let networkAttempts = 0
const bookingStore: Booking[] = [...bookings]
const staffStore: StaffMember[] = [...staffMembers]
const auditStore: AuditEntry[] = [...auditEntries]
const bookingIdempotencyStore = new Map<string, { fingerprint: string; bookingId: string }>()
const invitationStore = new Map<string, StaffInvitationRequest & { id: string; expiresAt: string }>()
const incidentStore: Incident[] = [...incidents]
const mechanicStore: Mechanic[] = [...mechanics]
const vehicleStore: Vehicle[] = [...vehicles]
const maintenanceStore: MaintenanceWindow[] = [...maintenanceWindows]
const stkAttempts = new Map<string, { paymentId: string; bookingId: string; phone: string; amountKes: number; polls: number; createdAt: number }>()
const guestAccessTokens = new Map<string, { bookingId: string; expiresAt: number }>()
const guestSessions = new Map<string, { bookingId: string; expiresAt: number }>()
const inspectionPhotoCounts = new Map<string, number>()
let driverRotationIndex = 0

const blockingStatuses = new Set(['confirmed', 'checked_out', 'overdue'])

function isBlockingBooking(booking: Booking, now = Date.now()) {
  return blockingStatuses.has(booking.status)
    || (booking.status === 'reserved' && Boolean(booking.holdExpiresAt) && Date.parse(booking.holdExpiresAt!) > now)
}

function overlaps(booking: Booking, pickupAt: string, returnAt: string) {
  return isBlockingBooking(booking) && booking.pickupAt < returnAt && booking.returnAt > pickupAt
}

function overlapsMaintenance(window: MaintenanceWindow, pickupAt: string, returnAt: string) {
  return Date.parse(window.startAt) < Date.parse(returnAt) && Date.parse(window.endAt) > Date.parse(pickupAt)
}

function expireMockBookingHolds(now = Date.now()) {
  for (const [index, booking] of bookingStore.entries()) {
    if (booking.status !== 'reserved' || !booking.holdExpiresAt || Date.parse(booking.holdExpiresAt) > now) continue
    bookingStore[index] = {
      ...booking,
      status: 'expired',
      pendingApproval: false,
      events: [...(booking.events ?? []), {
        id: `evt-expired-${booking.id}`,
        type: 'hold.expired',
        actor: 'system',
        note: 'Reservation hold expired',
        createdAt: new Date(now).toISOString(),
      }],
    }
  }
}

function isVehicleAvailable(vehicleId: string, pickupAt: string, returnAt: string) {
  const vehicle = vehicleStore.find((item) => item.id === vehicleId)
  return Boolean(vehicle
    && !['maintenance', 'inactive'].includes(vehicle.status)
    && !bookingStore.some((booking) => booking.vehicleId === vehicleId && overlaps(booking, pickupAt, returnAt))
    && !maintenanceStore.some((window) => window.vehicleId === vehicleId && overlapsMaintenance(window, pickupAt, returnAt)))
}

function effectiveVehicleStatus(vehicle: Vehicle, from: string, to: string) {
  if (vehicle.status === 'inactive' || vehicle.status === 'maintenance') return vehicle.status
  if (maintenanceStore.some((window) => window.vehicleId === vehicle.id && overlapsMaintenance(window, from, to))) return 'maintenance'
  return bookingStore.some((booking) => booking.vehicleId === vehicle.id && overlaps(booking, from, to)) ? 'booked' : 'available'
}

function canManageFleet(request: Request) {
  const actor = currentUser(request)
  return actor?.role === 'owner' || actor?.role === 'manager'
}

function canReadMaintenance(request: Request) {
  const actor = currentUser(request)
  return actor?.role === 'owner' || actor?.role === 'manager' || actor?.role === 'agent' || actor?.role === 'mechanic'
}

function fleetPermissionError(request: Request) {
  const actor = currentUser(request)
  const status = !actor ? 401 : 403
  return HttpResponse.json({
    success: false,
    data: null,
    error: { code: status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: 'Fleet management permission is required' },
  }, { status })
}

function staffPermissionError(request: Request) {
  const actor = currentUser(request)
  const status = !actor ? 401 : 403
  return HttpResponse.json({
    success: false,
    data: null,
    error: { code: status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN', message: 'Staff management permission is required' },
  }, { status })
}

function categoryForVehicle(vehicle: Vehicle) {
  if (vehicle.seats >= 8) return 'Van'
  if (['Prado TX', 'X-Trail', 'RAV4', 'Forester', 'Land Cruiser V8', 'CX-5'].includes(vehicle.model)) return 'SUV'
  return 'Sedan'
}

function calculateMockQuote(body: QuoteRequest, ratePerDay: number): QuoteResponse {
  const milliseconds = Date.parse(body.returnAt) - Date.parse(body.pickupAt)
  const baseDays = Math.max(1, Math.ceil(milliseconds / 86_400_000))
  const baseAmountKes = ratePerDay * baseDays
  const driverLocation = body.driverLocation ?? 'in_town'
  const chauffeurFeeKes = body.mode === 'chauffeur' ? (driverLocation === 'upcountry' ? 6500 : 3500) * baseDays : 0
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
    pricingSnapshot: { baseDays, baseRateKes: ratePerDay, baseAmountKes, chauffeurFeeKes, driverLocation, extras, vatRate: 16, vatAmountKes, totalDueKes: taxable + vatAmountKes, refundableDepositKes: 15000 },
  }
}

function currentUser(request: Request) {
  const role = request.headers.get('authorization')?.replace('Bearer mock-', '')
  return users.find((item) => item.role === role && item.active !== false)
}

function recordMockAudit(request: Request, action: string, entity: string) {
  const actor = currentUser(request)
  auditStore.unshift({
    id: `audit-${Date.now()}-${auditStore.length}`,
    actorId: actor?.id,
    actor: actor ? `${actor.name} (${actor.role})` : 'System',
    action,
    entity,
    createdAt: new Date().toISOString(),
  })
}

function currentDriver(request: Request) {
  const user = currentUser(request)
  return user?.role === 'driver' ? user : undefined
}

function isOfflinePaymentMethod(value: PaymentMethod | undefined): value is Exclude<PaymentMethod, 'mpesa_online'> {
  return value === 'cash' || value === 'mpesa_manual' || value === 'bank' || value === 'corporate'
}

function paginatedResponse<T>(rows: T[], request: Request) {
  const url = new URL(request.url)
  const rawLimit = url.searchParams.get('limit')
  const limit = rawLimit === null ? 50 : Number(rawLimit)
  const cursor = url.searchParams.get('cursor')
  const cursorMatch = cursor?.match(/^mock:(\d+)$/)
  const offset = cursor ? Number(cursorMatch?.[1]) : 0
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (cursor && !cursorMatch) || !Number.isSafeInteger(offset)) {
    return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_QUERY', message: 'Pagination parameters are invalid' } }, { status: 400 })
  }
  const items = rows.slice(offset, offset + limit)
  const nextOffset = offset + items.length
  const nextCursor = nextOffset < rows.length ? `mock:${nextOffset}` : null
  return HttpResponse.json({ success: true, data: { items, nextCursor }, error: null })
}

function dateInNairobi(value: Date | string = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function overlapsDriverTrip(driverId: string, from: string, to: string, excludingBookingId?: string) {
  return bookingStore.some((booking) => booking.id !== excludingBookingId
    && booking.driver?.id === driverId
    && isBlockingBooking(booking)
    && booking.pickupAt < to
    && booking.returnAt > from)
}

export const handlers = [
  http.get('/api/v1/health', () =>
    HttpResponse.json({ success: true, data: { status: 'ok' }, error: null }),
  ),
  http.post('/contact', async ({ request }) => {
    const body = await request.json() as { name?: string; email?: string; phone?: string; message?: string }
    if (!body.name || !body.email || !body.phone || !body.message) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_CONTACT', message: 'Please complete all contact fields' } }, { status: 400 })
    }
    recordMockAudit(request, 'POST /contact', 'contact')
    return HttpResponse.json({ success: true, data: { received: true }, error: null }, { status: 201 })
  }),
  http.get('/api/v1/vehicles', ({ request }) => {
    const url = new URL(request.url)
    const pickupAt = url.searchParams.get('from') ?? ''
    const returnAt = url.searchParams.get('to') ?? ''
    const sort = url.searchParams.get('sort') ?? 'registration:asc'
    if (!['registration:asc'].includes(sort)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_QUERY', message: 'Unsupported vehicle sort order' } }, { status: 400 })
    }
    if (Boolean(pickupAt) !== Boolean(returnAt)
      || (pickupAt && (!Number.isFinite(Date.parse(pickupAt)) || !Number.isFinite(Date.parse(returnAt)) || Date.parse(returnAt) <= Date.parse(pickupAt)))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_DATE_RANGE', message: 'A valid pickup and return window is required' } }, { status: 400 })
    }
    const now = new Date()
    const from = pickupAt || now.toISOString()
    const to = returnAt || new Date(now.getTime() + 1).toISOString()
    const available = pickupAt && returnAt
      ? vehicleStore.filter((vehicle) => isVehicleAvailable(vehicle.id, pickupAt, returnAt))
      : vehicleStore
    const rows = [...available]
      .sort((left, right) => left.registration.localeCompare(right.registration))
      .map((vehicle) => ({ ...vehicle, status: effectiveVehicleStatus(vehicle, from, to), category: vehicle.category ?? categoryForVehicle(vehicle) }))
    return paginatedResponse(rows, request)
  }),
  http.post('/api/v1/vehicles', async ({ request }) => {
    if (!canManageFleet(request)) return fleetPermissionError(request)
    const body = await request.json() as VehicleCreateRequest
    if (!body.make?.trim() || !body.model?.trim() || !body.registration?.trim()
      || !Number.isInteger(body.year) || body.year < 1900
      || !Number.isInteger(body.seats) || body.seats < 1
      || !Number.isSafeInteger(body.ratePerDay) || body.ratePerDay < 0
      || !['automatic', 'manual'].includes(body.transmission)
      || !['available', 'maintenance', 'inactive', undefined].includes(body.status)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Vehicle details are invalid' } }, { status: 400 })
    }
    const registration = body.registration.trim().replace(/\s+/g, ' ').toUpperCase()
    if (vehicleStore.some((vehicle) => vehicle.registration.trim().replace(/\s+/g, ' ').toUpperCase() === registration)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'CONFLICT', message: 'A vehicle already uses this registration' } }, { status: 409 })
    }
    const vehicle: Vehicle = {
      ...body,
      id: `vehicle-${String(vehicleStore.length + 1).padStart(3, '0')}`,
      registration,
      status: body.status ?? 'available',
    }
    vehicleStore.push(vehicle)
    return HttpResponse.json({ success: true, data: vehicle, error: null }, { status: 201 })
  }),
  http.get('/api/v1/vehicles/:vehicleId', ({ params }) => {
    const vehicle = vehicleStore.find((item) => item.id === params.vehicleId)
    if (!vehicle) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Vehicle was not found' } }, { status: 404 })
    const now = new Date()
    return HttpResponse.json({
      success: true,
      data: { ...vehicle, status: effectiveVehicleStatus(vehicle, now.toISOString(), new Date(now.getTime() + 1).toISOString()) },
      error: null,
    })
  }),
  http.patch('/api/v1/vehicles/:vehicleId', async ({ params, request }) => {
    if (!canManageFleet(request)) return fleetPermissionError(request)
    const index = vehicleStore.findIndex((vehicle) => vehicle.id === params.vehicleId)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Vehicle was not found' } }, { status: 404 })
    const patch = await request.json() as VehicleUpdateRequest
    if (patch.status && !['available', 'maintenance', 'inactive'].includes(patch.status)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Vehicle status is invalid' } }, { status: 400 })
    }
    const current = vehicleStore[index]
    if (patch.status && patch.status !== 'available'
      && bookingStore.some((booking) => booking.vehicleId === current.id && isBlockingBooking(booking))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VEHICLE_UNAVAILABLE', message: 'A vehicle with an active reservation cannot be disabled' } }, { status: 409 })
    }
    const registration = patch.registration?.trim().replace(/\s+/g, ' ').toUpperCase()
    if (registration && vehicleStore.some((vehicle) => vehicle.id !== current.id && vehicle.registration.trim().replace(/\s+/g, ' ').toUpperCase() === registration)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'CONFLICT', message: 'A vehicle already uses this registration' } }, { status: 409 })
    }
    const updated = { ...current, ...patch, ...(registration ? { registration } : {}) }
    vehicleStore[index] = updated
    return HttpResponse.json({ success: true, data: updated, error: null })
  }),
  http.get('/api/v1/maintenance-windows', ({ request }) => {
    if (!currentUser(request)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'A staff session is required' } }, { status: 401 })
    }
    if (!canReadMaintenance(request)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Maintenance read permission is required' } }, { status: 403 })
    }
    const url = new URL(request.url)
    const fromValue = url.searchParams.get('from') ?? ''
    const toValue = url.searchParams.get('to') ?? ''
    const from = Date.parse(fromValue)
    const to = Date.parse(toValue)
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_QUERY', message: 'A valid maintenance date window is required' } }, { status: 400 })
    }
    const rows = maintenanceStore
      .filter((window) => Date.parse(window.startAt) < to && Date.parse(window.endAt) > from)
      .sort((left, right) => left.startAt.localeCompare(right.startAt) || left.id.localeCompare(right.id))
    return paginatedResponse(rows, request)
  }),
  http.post('/api/v1/maintenance-windows', async ({ request }) => {
    if (!canManageFleet(request)) return fleetPermissionError(request)
    const body = await request.json() as MaintenanceWindowCreateRequest
    const start = Date.parse(body.startAt)
    const end = Date.parse(body.endAt)
    if (!vehicleStore.some((vehicle) => vehicle.id === body.vehicleId)
      || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || !body.reason?.trim()) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Maintenance details are invalid' } }, { status: 400 })
    }
    if (bookingStore.some((booking) => booking.vehicleId === body.vehicleId && overlaps(booking, body.startAt, body.endAt))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VEHICLE_UNAVAILABLE', message: 'Maintenance overlaps an active reservation' } }, { status: 409 })
    }
    const window: MaintenanceWindow = {
      ...body,
      id: `maintenance-${String(maintenanceStore.length + 1).padStart(3, '0')}`,
      reason: body.reason.trim(),
    }
    maintenanceStore.push(window)
    return HttpResponse.json({ success: true, data: window, error: null }, { status: 201 })
  }),
  http.patch('/api/v1/maintenance-windows/:windowId', async ({ params, request }) => {
    if (!canManageFleet(request)) return fleetPermissionError(request)
    const index = maintenanceStore.findIndex((window) => window.id === params.windowId)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Maintenance window was not found' } }, { status: 404 })
    const patch = await request.json() as MaintenanceWindowUpdateRequest
    const updated = { ...maintenanceStore[index], ...patch }
    if (!Number.isFinite(Date.parse(updated.startAt)) || !Number.isFinite(Date.parse(updated.endAt))
      || Date.parse(updated.endAt) <= Date.parse(updated.startAt) || !updated.reason.trim()) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Maintenance details are invalid' } }, { status: 400 })
    }
    if (bookingStore.some((booking) => booking.vehicleId === updated.vehicleId && overlaps(booking, updated.startAt, updated.endAt))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VEHICLE_UNAVAILABLE', message: 'Maintenance overlaps an active reservation' } }, { status: 409 })
    }
    maintenanceStore[index] = updated
    return HttpResponse.json({ success: true, data: updated, error: null })
  }),
  http.delete('/api/v1/maintenance-windows/:windowId', ({ params, request }) => {
    if (!canManageFleet(request)) return fleetPermissionError(request)
    const index = maintenanceStore.findIndex((window) => window.id === params.windowId)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Maintenance window was not found' } }, { status: 404 })
    maintenanceStore.splice(index, 1)
    return HttpResponse.json({ success: true, data: { deleted: true }, error: null })
  }),
  http.get('/api/v1/mechanics/nearest', ({ request }) => {
    const url = new URL(request.url)
    const latitude = Number(url.searchParams.get('lat'))
    const longitude = Number(url.searchParams.get('lng'))
    const radiusKm = Number(url.searchParams.get('radiusKm') ?? 50)
    const limit = Number(url.searchParams.get('limit') ?? 5)
    const category = url.searchParams.get('category') ?? undefined
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_LOCATION', message: 'A valid map location is required' } }, { status: 400 })
    if (!Number.isFinite(radiusKm) || radiusKm <= 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_QUERY', message: 'Nearby mechanic filters are invalid' } }, { status: 400 })
    }
    const location = toGeoJson([latitude, longitude])
    const candidates = category ? mechanicStore.filter((mechanic) => mechanic.specialties.includes(category)) : mechanicStore
    return HttpResponse.json({ success: true, data: getNearestMechanics(candidates, { location }, radiusKm, limit), error: null })
  }),
  http.get('/api/v1/mechanics', ({ request }) => {
    const rows = [...mechanicStore].sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
    return paginatedResponse(rows, request)
  }),
  http.post('/api/v1/mechanics', async ({ request }) => {
    const body = await request.json() as MechanicCreateRequest
    const coordinates = toLeaflet(body.location)
    const mechanic: Mechanic = {
      ...body,
      id: `mech-${String(mechanicStore.length + 1).padStart(2, '0')}`,
      location: toGeoJson(coordinates),
    }
    mechanicStore.push(mechanic)
    return HttpResponse.json({ success: true, data: mechanic, error: null }, { status: 201 })
  }),
  http.get('/api/v1/incidents', ({ request }) => {
    const rows = [...incidentStore].sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id))
    return paginatedResponse(rows, request)
  }),
  http.post('/api/v1/incidents/breakdown', async ({ request }) => {
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_FORM', message: 'Submit incident details as multipart form data' } }, { status: 400 })
    }
    let parsedLocation: unknown
    try {
      parsedLocation = JSON.parse(String(form.get('location') ?? ''))
    } catch {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_LOCATION', message: 'A valid incident location is required' } }, { status: 400 })
    }
    if (!parsedLocation || typeof parsedLocation !== 'object'
      || !('type' in parsedLocation) || parsedLocation.type !== 'Point'
      || !('coordinates' in parsedLocation) || !Array.isArray(parsedLocation.coordinates)
      || parsedLocation.coordinates.length !== 2
      || typeof parsedLocation.coordinates[0] !== 'number' || !Number.isFinite(parsedLocation.coordinates[0])
      || typeof parsedLocation.coordinates[1] !== 'number' || !Number.isFinite(parsedLocation.coordinates[1])) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_LOCATION', message: 'A valid incident location is required' } }, { status: 400 })
    }
    const longitude = parsedLocation.coordinates[0]
    const latitude = parsedLocation.coordinates[1]
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_LOCATION', message: 'A valid incident location is required' } }, { status: 400 })
    }
    const location: Incident['location'] = { type: 'Point', coordinates: [longitude, latitude] }
    const photoValues = form.getAll('photos')
    if (photoValues.length > 10 || photoValues.some((value) => !(value instanceof File) || !isAllowedOperationPhoto(value))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_FILE', message: 'Add up to 10 JPG, PNG, or WebP photos no larger than 5 MiB each' } }, { status: 400 })
    }
    const photos = photoValues.filter((value): value is File => value instanceof File)
    const category = String(form.get('category') ?? '')
    const reporter = currentUser(request)
    const source: Incident['source'] = reporter?.role === 'driver' ? 'driver' : reporter ? 'desk' : 'customer'
    const description = String(form.get('description') ?? '')
    const locationText = String(form.get('locationText') ?? '').trim()
    const vehicleId = String(form.get('vehicleId') ?? '') || undefined
    const immobilising = form.get('immobilising') === 'true'
    if (!['flat_tyre', 'battery', 'overheating', 'accident', 'strange_noise'].includes(category)
      || !description.trim()
      || !locationText
      || (form.get('immobilising') !== 'true' && form.get('immobilising') !== 'false')) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_INCIDENT', message: 'Complete the required incident details' } }, { status: 400 })
    }
    const coordinates = toLeaflet(location)
    const createdAt = new Date().toISOString()
    const nextReference = `SOS-${String(100 + incidentStore.length + 1).padStart(3, '0')}`
    const incident: Incident = {
      category: category as Incident['category'],
      description: description.trim(),
      location: toGeoJson(coordinates),
      locationText,
      vehicleId,
      immobilising,
      photos: photos.map((photo, index) => `/mock-uploads/incidents/${incidentStore.length + 1}-${index + 1}-${encodeURIComponent(photo.name)}`),
      source,
      id: `inc-${String(incidentStore.length + 1).padStart(2, '0')}`,
      reference: nextReference,
      status: 'open',
      createdAt,
    }
    incidentStore.unshift(incident)
    return HttpResponse.json({ success: true, data: incident, error: null }, { status: 201 })
  }),
  http.patch('/api/v1/incidents/:id/dispatch', async ({ params, request }) => {
    const index = incidentStore.findIndex((incident) => incident.id === params.id)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Incident not found' } }, { status: 404 })
    const body = await request.json() as { type: IncidentDispatchType; mechanicId?: string; vehicleId?: string }
    const current = incidentStore[index]
    let mechanicId = body.mechanicId
    if (body.type === 'closest_partner') {
      const partnerCandidates = mechanicStore.filter((mechanic) => mechanic.type === 'partner_garage')
      const nearest = getNearestMechanics(partnerCandidates, current, 50, 1)[0]
      if (!nearest) return HttpResponse.json({ success: false, data: null, error: { code: 'NO_PARTNER_WITHIN_RANGE', message: 'No partner mechanic is available within 50 km' } }, { status: 409 })
      mechanicId = nearest.id
    }
    if (body.type === 'in_house_rescue' && !mechanicId) {
      mechanicId = getNearestMechanics(mechanicStore.filter((mechanic) => mechanic.type === 'in_house'), current, 50, 1)[0]?.id
    }
    if (body.type === 'replacement_vehicle' && !body.vehicleId) return HttpResponse.json({ success: false, data: null, error: { code: 'VEHICLE_REQUIRED', message: 'Select a replacement vehicle' } }, { status: 400 })
    const updated: Incident = {
      ...current,
      status: body.type === 'replacement_vehicle' ? 'awaiting_replacement' : 'dispatched',
      dispatch: { type: body.type, mechanicId, vehicleId: body.vehicleId, createdAt: new Date().toISOString() },
    }
    incidentStore[index] = updated
    return HttpResponse.json({ success: true, data: updated, error: null })
  }),
  http.get('/api/v1/drivers', ({ request }) => {
    const rows = [...drivers].sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
    return paginatedResponse(rows, request)
  }),
  http.get('/api/v1/drivers/available', ({ request }) => {
    const url = new URL(request.url)
    const from = url.searchParams.get('from') ?? ''
    const to = url.searchParams.get('to') ?? ''
    const vehicleId = url.searchParams.get('vehicleId') ?? ''
    const vehicle = vehicleStore.find((item) => item.id === vehicleId)
    if (!from || !to || !vehicle || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to)) || Date.parse(to) <= Date.parse(from)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_QUERY', message: 'A vehicle and valid trip window are required' } }, { status: 400 })
    }
    const valid = drivers.filter((driver) => !getDriverEligibilityReason(driver, to)
      && (vehicle.seats <= 8 || driver.licenceClass === 'C1')
      && !overlapsDriverTrip(driver.id, from, to))
    const autoAssignDriverId = valid.length ? valid[driverRotationIndex % valid.length].id : null
    return HttpResponse.json({ success: true, data: { drivers: valid, autoAssignDriverId }, error: null })
  }),
  http.get('/api/v1/drivers/me/trips', ({ request }) => {
    const driver = currentDriver(request)
    if (!driver) return HttpResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Driver access required' } }, { status: 403 })
    const trips = bookingStore.filter((booking) => booking.driver?.id === driver.id && ['confirmed', 'checked_out', 'overdue', 'completed'].includes(booking.status))
      .map((booking) => ({ ...booking, vehicleRegistration: vehicleStore.find((vehicle) => vehicle.id === booking.vehicleId)?.registration }))
      .sort((left, right) => left.pickupAt.localeCompare(right.pickupAt) || left.id.localeCompare(right.id))
    return paginatedResponse(trips, request)
  }),
  http.get('/api/v1/bookings', ({ request }) => {
    expireMockBookingHolds()
    const actor = currentUser(request)
    if (!actor) return HttpResponse.json({ success: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'A staff session is required' } }, { status: 401 })
    if (!['owner', 'manager', 'agent'].includes(actor.role)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Booking list permission is required' } }, { status: 403 })
    }
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const paymentMethod = url.searchParams.get('paymentMethod')
    const vehicleId = url.searchParams.get('vehicleId')
    const search = (url.searchParams.get('search') ?? '').toLocaleLowerCase()
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const pickup = url.searchParams.get('pickup')
    const returning = url.searchParams.get('return')
    const today = dateInNairobi()
    const bookingStatuses = ['reserved', 'confirmed', 'checked_out', 'overdue', 'completed', 'cancelled', 'expired']
    const paymentMethods = ['mpesa_online', 'mpesa_manual', 'cash', 'bank', 'corporate']
    const fromValue = from ?? ''
    const toValue = to ?? ''
    if ((status && !bookingStatuses.includes(status))
      || (paymentMethod && !paymentMethods.includes(paymentMethod))
      || (search.length > 100)
      || (from && !Number.isFinite(Date.parse(fromValue)))
      || (to && !Number.isFinite(Date.parse(toValue)))
      || (from && to && Date.parse(fromValue) > Date.parse(toValue))
      || (pickup && pickup !== 'due-today')
      || (returning && returning !== 'due-today')) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_QUERY', message: 'Booking filters are invalid' } }, { status: 400 })
    }
    let rows = [...bookingStore]
    if (status) rows = rows.filter((booking) => booking.status === status || (status === 'cancelled' && booking.status === 'expired'))
    if (paymentMethod) rows = rows.filter((booking) => booking.paymentMethod === paymentMethod)
    if (vehicleId) rows = rows.filter((booking) => booking.vehicleId === vehicleId)
    if (search) rows = rows.filter((booking) => `${booking.reference} ${booking.customerName ?? ''}`.toLocaleLowerCase().includes(search))
    if (from) rows = rows.filter((booking) => Date.parse(booking.returnAt) >= Date.parse(from))
    if (to) rows = rows.filter((booking) => Date.parse(booking.pickupAt) <= Date.parse(to))
    if (pickup === 'due-today') rows = rows.filter((booking) => booking.status === 'confirmed' && dateInNairobi(booking.pickupAt) === today)
    if (returning === 'due-today') rows = rows.filter((booking) => ['checked_out', 'overdue'].includes(booking.status) && dateInNairobi(booking.returnAt) === today)
    const sort = url.searchParams.get('sort') ?? 'pickupAt:asc'
    if (!['pickupAt:asc', 'pickupAt:desc', 'createdAt:desc'].includes(sort)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_QUERY', message: 'Unsupported booking sort order' } }, { status: 400 })
    }
    rows.sort((left, right) => {
      if (sort === 'createdAt:desc') {
        const leftCreated = left.events?.[0]?.createdAt ?? ''
        const rightCreated = right.events?.[0]?.createdAt ?? ''
        return rightCreated.localeCompare(leftCreated) || right.id.localeCompare(left.id)
      }
      const direction = sort === 'pickupAt:asc' ? 1 : -1
      return direction * (left.pickupAt.localeCompare(right.pickupAt) || left.id.localeCompare(right.id))
    })
    return paginatedResponse(rows, request)
  }),
  http.get('/api/v1/bookings/:id', ({ params, request }) => {
    expireMockBookingHolds()
    const booking = bookingStore.find((item) => item.id === params.id)
    if (!booking) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const actor = currentUser(request)
    if (!actor) return HttpResponse.json({ success: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'A staff session is required' } }, { status: 401 })
    if (!['owner', 'manager', 'agent'].includes(actor.role) && !(actor.role === 'driver' && booking.driver?.id === actor.id)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Booking read permission is required' } }, { status: 403 })
    }
    return HttpResponse.json({ success: true, data: booking, error: null })
  }),
  http.get('/api/v1/bookings/:id/checkout', ({ params }) => {
    const booking = bookingStore.find((item) => item.id === params.id && item.status === 'reserved')
    if (!booking) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const vehicle = vehicleStore.find((item) => item.id === booking.vehicleId)
    if (!vehicle) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const data: GuestCheckoutData = {
      booking: {
        id: booking.id, reference: booking.reference, vehicleId: booking.vehicleId, status: booking.status,
        pendingApproval: booking.pendingApproval, pickupAt: booking.pickupAt, returnAt: booking.returnAt,
        totalKes: booking.totalKes, mode: booking.mode, paymentMethod: booking.paymentMethod,
        holdExpiresAt: booking.holdExpiresAt, pricingSnapshot: booking.pricingSnapshot,
      },
      vehicle: { id: vehicle.id, make: vehicle.make, model: vehicle.model, registration: vehicle.registration, ratePerDay: vehicle.ratePerDay },
    }
    return HttpResponse.json({ success: true, data, error: null })
  }),
  http.post('/api/v1/bookings/:id/checkout', async ({ params, request }) => {
    const index = bookingStore.findIndex((item) => item.id === params.id && item.status === 'reserved')
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const booking = bookingStore[index]
    if (booking.holdExpiresAt && Date.parse(booking.holdExpiresAt) <= Date.now()) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'HOLD_EXPIRED', message: 'The booking hold has expired' } }, { status: 409 })
    }
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_FORM', message: 'Complete the booking form and try again.' } }, { status: 400 })
    }
    const name = String(form.get('name') ?? '').trim()
    const phone = String(form.get('phone') ?? '')
    const email = String(form.get('email') ?? '').trim()
    const idNumber = String(form.get('idNumber') ?? '').trim()
    const paymentMethod = String(form.get('paymentMethod') ?? '')
    const termsAccepted = form.get('termsAccepted') === 'true'
    const rulesAccepted = form.get('rulesAccepted') === 'true'
    if (name.length < 2 || !/^254[17]\d{8}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || idNumber.length < 4 || !termsAccepted || !rulesAccepted || !['mpesa_online', 'cash'].includes(paymentMethod)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_CHECKOUT', message: 'Check your details, accept the terms and rental rules, then try again.' } }, { status: 400 })
    }
    if (booking.mode === 'self_drive') {
      const file = form.get('licence')
      if (!(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_LICENCE', message: 'Upload a JPG, PNG, WebP, or PDF licence file up to 5 MB.' } }, { status: 400 })
      }
    }
    const method = paymentMethod as PaymentMethod
    const updated: Booking = {
      ...booking,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      customerIdNumber: idNumber,
      paymentMethod: method,
      pendingApproval: method === 'cash',
    }
    bookingStore[index] = updated
    const accessToken = `mock-signed-${crypto.randomUUID()}`
    guestAccessTokens.set(accessToken, { bookingId: updated.id, expiresAt: Date.now() + 15 * 60_000 })
    const vehicle = vehicleStore.find((item) => item.id === updated.vehicleId)!
    const data: GuestBookingAccess = {
      booking: {
        id: updated.id, reference: updated.reference, vehicleId: updated.vehicleId, customerName: updated.customerName,
        customerPhone: updated.customerPhone, status: updated.status, pendingApproval: updated.pendingApproval,
        pickupAt: updated.pickupAt, returnAt: updated.returnAt, totalKes: updated.totalKes, mode: updated.mode,
        paymentMethod: updated.paymentMethod, pricingSnapshot: updated.pricingSnapshot, payments: updated.payments,
      },
      vehicle: { id: vehicle.id, make: vehicle.make, model: vehicle.model, registration: vehicle.registration },
      accessToken,
      cancellationAllowed: Date.parse(updated.pickupAt) - Date.now() >= 48 * 60 * 60 * 1000,
    }
    return HttpResponse.json({ success: true, data, error: null }, { status: 201 })
  }),
  http.get('/api/v1/bookings/:ref/guest', ({ params, cookies }) => {
    const token = cookies.booking_access
    const access = token ? guestSessions.get(token) : undefined
    const booking = access && access.expiresAt > Date.now()
      ? bookingStore.find((item) => item.id === access.bookingId && item.reference === params.ref)
      : undefined
    if (!booking) return HttpResponse.json({ success: false, data: null, error: { code: 'GUEST_ACCESS_INVALID', message: 'Booking link unavailable' } }, { status: 404 })
    const vehicle = vehicleStore.find((item) => item.id === booking.vehicleId)
    if (!vehicle) return HttpResponse.json({ success: false, data: null, error: { code: 'GUEST_ACCESS_INVALID', message: 'Booking link unavailable' } }, { status: 404 })
    const data: GuestBookingSummary = {
      booking: {
        id: booking.id, reference: booking.reference, vehicleId: booking.vehicleId, customerName: booking.customerName,
        customerPhone: booking.customerPhone, status: booking.status, pendingApproval: booking.pendingApproval,
        pickupAt: booking.pickupAt, returnAt: booking.returnAt, totalKes: booking.totalKes, mode: booking.mode,
        paymentMethod: booking.paymentMethod, pricingSnapshot: booking.pricingSnapshot, payments: booking.payments,
      },
      vehicle: { id: vehicle.id, make: vehicle.make, model: vehicle.model, registration: vehicle.registration },
      cancellationAllowed: Date.parse(booking.pickupAt) - Date.now() >= 48 * 60 * 60 * 1000,
    }
    return HttpResponse.json({ success: true, data, error: null })
  }),
  http.post('/api/v1/bookings/:ref/guest', async ({ params, request }) => {
    const body = await request.json() as { accessToken?: string }
    const access = body.accessToken ? guestAccessTokens.get(body.accessToken) : undefined
    const booking = access && access.expiresAt > Date.now()
      ? bookingStore.find((item) => item.id === access.bookingId && item.reference === params.ref)
      : undefined
    if (!booking) return HttpResponse.json({ success: false, data: null, error: { code: 'GUEST_ACCESS_INVALID', message: 'Booking link unavailable' } }, { status: 401 })
    guestAccessTokens.delete(body.accessToken!)
    const expiresAt = Date.parse(booking.returnAt) + 30 * 24 * 60 * 60_000
    guestSessions.set(body.accessToken!, { bookingId: booking.id, expiresAt })
    return HttpResponse.json(
      { success: true, data: { accepted: true }, error: null },
      { headers: { 'Set-Cookie': `booking_access=${encodeURIComponent(body.accessToken ?? '')}; Path=/api/v1/bookings/${encodeURIComponent(booking.reference)}; HttpOnly; Secure; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}` } },
    )
  }),
  http.post('/api/v1/bookings/:bookingKey/cancel', async ({ params, request, cookies }) => {
    const token = cookies.booking_access
    const isGuest = Boolean(token)
    const actor = isGuest ? undefined : currentUser(request)
    const guestAccess = token ? guestSessions.get(token) : undefined
    const bookingId = guestAccess && guestAccess.expiresAt > Date.now() ? guestAccess.bookingId : undefined
    const index = bookingStore.findIndex((item) => isGuest
      ? item.id === bookingId && item.reference === params.bookingKey
      : item.id === params.bookingKey)
    const booking = bookingStore[index]
    if (!booking) return HttpResponse.json({ success: false, data: null, error: { code: isGuest ? 'GUEST_ACCESS_INVALID' : 'NOT_FOUND', message: isGuest ? 'Booking link unavailable' : 'Booking not found' } }, { status: 404 })
    if (!isGuest && (!actor || !['owner', 'manager', 'agent'].includes(actor.role))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Booking cancellation permission is required' } }, { status: 403 })
    }
    if (booking.status === 'reserved' && booking.holdExpiresAt && Date.parse(booking.holdExpiresAt) <= Date.now()) {
      bookingStore[index] = { ...booking, status: 'expired', pendingApproval: false }
      return HttpResponse.json({ success: false, data: null, error: { code: 'HOLD_EXPIRED', message: 'The booking hold has expired' } }, { status: 409 })
    }
    if (['completed', 'cancelled', 'expired'].includes(booking.status)
      || (isGuest && Date.parse(booking.pickupAt) - Date.now() < 48 * 60 * 60 * 1000)
      || (!isGuest && !['reserved', 'confirmed'].includes(booking.status))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'CANCELLATION_UNAVAILABLE', message: 'This booking can no longer be cancelled online.' } }, { status: 409 })
    }
    const hasCapturedPayment = (booking.payments ?? []).some((payment) => payment.status === 'paid')
    if (!isGuest && (booking.status === 'confirmed' || hasCapturedPayment)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'REFUND_APPROVAL_REQUIRED', message: 'A paid booking requires an owner-approved refund record before staff cancellation' } }, { status: 409 })
    }
    let reason = ''
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json() as { reason?: string }
        reason = body.reason?.trim() ?? ''
      } catch {
        return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_REQUEST', message: 'Cancellation details are invalid' } }, { status: 400 })
      }
    }
    const createdAt = new Date().toISOString()
    const updated: Booking = {
      ...booking,
      status: 'cancelled',
      pendingApproval: false,
      payments: isGuest && hasCapturedPayment
        ? booking.payments?.map((payment) => payment.status === 'paid' ? { ...payment, status: 'refund_pending' } : payment)
        : booking.payments,
      events: [...(booking.events ?? []), { id: `evt-${Date.now()}`, type: 'booking.cancelled', actor: actor?.name ?? 'Guest', note: reason || 'Booking cancelled', createdAt }],
    }
    bookingStore[index] = updated
    if (isGuest && token) guestSessions.delete(token)
    return HttpResponse.json({ success: true, data: isGuest ? { cancelled: true } : updated, error: null })
  }),
  http.post('/api/v1/bookings/:id/driver', async ({ params, request }) => {
    const index = bookingStore.findIndex((booking) => booking.id === params.id)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const body = await request.json() as { driverId: string }
    const booking = bookingStore[index]
    const driver = drivers.find((item) => item.id === body.driverId)
    const vehicle = vehicleStore.find((item) => item.id === booking.vehicleId)
    if (!driver || !vehicle || getDriverEligibilityReason(driver, booking.returnAt)
      || (vehicle.seats > 8 && driver.licenceClass !== 'C1')
      || overlapsDriverTrip(body.driverId, booking.pickupAt, booking.returnAt, booking.id)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'DRIVER_UNAVAILABLE', message: 'This driver is no longer available for the selected trip window.' } }, { status: 409 })
    }
    const updated = { ...booking, driver }
    bookingStore[index] = updated
    driver.status = 'assigned'
    driver.currentTrip = { bookingId: booking.id, reference: booking.reference, pickupAt: booking.pickupAt }
    driverRotationIndex += 1
    return HttpResponse.json({ success: true, data: updated, error: null })
  }),
  http.post('/api/v1/bookings/:id/driver-status', async ({ params, request }) => {
    const index = bookingStore.findIndex((booking) => booking.id === params.id)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Trip not found' } }, { status: 404 })
    const driverUser = currentDriver(request)
    const booking = bookingStore[index]
    if (!driverUser || booking.driver?.id !== driverUser.id) return HttpResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'You can only update your own trips' } }, { status: 403 })
    const body = await request.json() as { status: DriverTripStatus }
    const expectedPrevious: Record<DriverTripStatus, DriverTripStatus | undefined> = {
      en_route_to_pickup: undefined,
      customer_onboard: 'en_route_to_pickup',
      trip_completed: 'customer_onboard',
    }
    if (booking.driverTripStatus !== expectedPrevious[body.status]) return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_TRIP_STATUS', message: 'Trip status must advance in order.' } }, { status: 409 })
    const updated: Booking = { ...booking, driverTripStatus: body.status, ...(body.status === 'trip_completed' ? { status: 'completed' } : {}) }
    bookingStore[index] = updated
    if (body.status === 'trip_completed') {
      const driver = drivers.find((item) => item.id === driverUser.id)
      if (driver) { driver.status = 'available'; driver.currentTrip = undefined }
    }
    return HttpResponse.json({ success: true, data: updated, error: null })
  }),
  http.post('/api/v1/bookings/:id/inspections/photos', async ({ params, request }) => {
    const booking = bookingStore.find((item) => item.id === params.id)
    if (!booking) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const formData = await request.formData()
    const file = formData.get('file')
    const type = formData.get('type')
    if (!['check_out', 'check_in'].includes(String(type))
      || (type === 'check_out' && booking.status !== 'confirmed')
      || (type === 'check_in' && !['checked_out', 'overdue'].includes(booking.status))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_STATUS', message: 'This inspection photo does not match the booking state' } }, { status: 409 })
    }
    if (!(file instanceof File) || !isAllowedOperationPhoto(file)) return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_FILE', message: 'Upload a JPG, PNG, or WebP photo no larger than 5 MiB' } }, { status: 400 })
    const countKey = `${booking.id}:${type}`
    const count = inspectionPhotoCounts.get(countKey) ?? 0
    if (count >= 10) return HttpResponse.json({ success: false, data: null, error: { code: 'PHOTO_LIMIT_EXCEEDED', message: 'An inspection can contain no more than 10 photos' } }, { status: 400 })
    inspectionPhotoCounts.set(countKey, count + 1)
    return HttpResponse.json({ success: true, data: { url: `/mock-uploads/${booking.id}/${encodeURIComponent(file.name)}` }, error: null }, { status: 201 })
  }),
  http.post('/api/v1/bookings/:id/check-out', async ({ params, request }) => {
    const index = bookingStore.findIndex((item) => item.id === params.id)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const body = await request.json() as HandoverRequest
    const booking = bookingStore[index]
    if (booking.status !== 'confirmed') return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_STATUS', message: 'Only confirmed bookings can be checked out' } }, { status: 409 })
    if (!Number.isFinite(body.odometer) || body.odometer < 0 || !body.fuelLevel || !body.signatureConfirmed) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_INSPECTION', message: 'Odometer, fuel level and confirmation are required' } }, { status: 400 })
    }
    const completedAt = new Date().toISOString()
    const inspection = { ...body, id: `inspection-${Date.now()}`, type: 'check_out' as const, createdAt: completedAt }
    const updated = { ...booking, status: 'checked_out' as const, inspections: [...(booking.inspections ?? []), inspection], events: [...(booking.events ?? []), { id: `event-${Date.now()}`, type: 'checked_out', actor: 'Staff', note: body.notes || 'Vehicle checked out', createdAt: completedAt }] }
    bookingStore[index] = updated
    return HttpResponse.json({ success: true, data: updated, error: null })
  }),
  http.post('/api/v1/bookings/:id/check-in/settlement', async ({ params, request }) => {
    const booking = bookingStore.find((item) => item.id === params.id)
    if (!booking) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const checkOut = booking.inspections?.find((inspection) => inspection.type === 'check_out')
    const body = await request.json() as { odometer: number }
    if (!checkOut) return HttpResponse.json({ success: false, data: null, error: { code: 'CHECK_OUT_REQUIRED', message: 'A check-out inspection is required first' } }, { status: 409 })
    if (!Number.isFinite(body.odometer) || body.odometer < checkOut.odometer) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'ODOMETER_INVALID', message: 'Check-in odometer must be at least the check-out reading' } }, { status: 400 })
    }
    const graceHours = 2
    const lateHours = Math.max(0, Math.ceil((Date.now() - Date.parse(booking.returnAt) - graceHours * 60 * 60 * 1000) / (60 * 60 * 1000)))
    const lateFeeKes = lateHours * 1500
    const odometerDifferenceKm = body.odometer - checkOut.odometer
    const includedMileageKm = (booking.pricingSnapshot?.baseDays ?? 1) * 100
    const excessMileageKm = Math.max(0, odometerDifferenceKm - includedMileageKm)
    const excessMileageRateKes = 50
    const settlement: HandoverSettlement = {
      graceHours, lateHours, lateFeeKes, odometerDifferenceKm, includedMileageKm,
      excessMileageKm, excessMileageRateKes, excessMileageChargeKes: excessMileageKm * excessMileageRateKes,
      totalKes: lateFeeKes + excessMileageKm * excessMileageRateKes,
    }
    return HttpResponse.json({ success: true, data: settlement, error: null })
  }),
  http.post('/api/v1/bookings/:id/check-in', async ({ params, request }) => {
    const index = bookingStore.findIndex((item) => item.id === params.id)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const body = await request.json() as HandoverRequest
    const booking = bookingStore[index]
    const checkOut = booking.inspections?.find((inspection) => inspection.type === 'check_out')
    if (!checkOut) return HttpResponse.json({ success: false, data: null, error: { code: 'CHECK_OUT_REQUIRED', message: 'A check-out inspection is required first' } }, { status: 409 })
    if (body.odometer < checkOut.odometer) return HttpResponse.json({ success: false, data: null, error: { code: 'ODOMETER_INVALID', message: 'Check-in odometer must be at least the check-out reading' } }, { status: 400 })
    if (!body.signatureConfirmed) return HttpResponse.json({ success: false, data: null, error: { code: 'CONFIRMATION_REQUIRED', message: 'Check-in confirmation is required' } }, { status: 400 })
    const completedAt = new Date().toISOString()
    const inspection = { ...body, id: `inspection-${Date.now()}`, type: 'check_in' as const, createdAt: completedAt }
    const updated = { ...booking, status: 'completed' as const, inspections: [...(booking.inspections ?? []), inspection], events: [...(booking.events ?? []), { id: `event-${Date.now()}`, type: 'checked_in', actor: 'Staff', note: body.notes || 'Vehicle checked in', createdAt: completedAt }] }
    bookingStore[index] = updated
    const vehicle = vehicleStore.find((item) => item.id === booking.vehicleId)
    if (vehicle) vehicle.status = body.criticalDefect ? 'maintenance' : 'available'
    return HttpResponse.json({ success: true, data: updated, error: null })
  }),
  http.post('/api/v1/bookings/:id/payments/stk', async ({ params, request }) => {
    const booking = bookingStore.find((item) => item.id === params.id)
    if (!booking) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    if (booking.status === 'reserved' && booking.holdExpiresAt && Date.parse(booking.holdExpiresAt) <= Date.now()) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'HOLD_EXPIRED', message: 'The booking hold has expired' } }, { status: 409 })
    }
    const body = await request.json() as { phone: string }
    if (!/^254[17]\d{8}$/.test(body.phone)) return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_PHONE', message: 'Enter a valid Kenyan mobile number' } }, { status: 400 })
    const paymentId = `stk-${Date.now()}`
    stkAttempts.set(paymentId, { paymentId, bookingId: booking.id, phone: body.phone, amountKes: booking.totalKes, polls: 0, createdAt: Date.now() })
    const maskedPhone = `${body.phone.slice(0, 4)}XX XXX ${body.phone.slice(-3)}`
    const result: StkInitiation = { paymentId, maskedPhone, amountKes: booking.totalKes }
    return HttpResponse.json({ success: true, data: result, error: null }, { status: 201 })
  }),
  http.get('/api/v1/payments/:paymentId/status', ({ params }) => {
    const attempt = stkAttempts.get(String(params.paymentId))
    if (!attempt) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Payment attempt not found' } }, { status: 404 })
    attempt.polls += 1
    const booking = bookingStore.find((item) => item.id === attempt.bookingId)!
    const finalDigit = attempt.phone.at(-1)
    let outcome: StkStatus['outcome'] = 'pending'
    let paidAmountKes: number | undefined
    let message: string | undefined
    const isLate = Boolean(booking.holdExpiresAt && Date.parse(booking.holdExpiresAt) <= Date.now())
    if (finalDigit === '0') outcome = 'pending'
    else if (attempt.polls >= 1 && finalDigit === '2') { outcome = 'failed'; message = 'The payment was not completed.' }
    else if (attempt.polls >= 1 && isLate && finalDigit !== '1') { outcome = 'manual_refund'; message = 'Late payment flagged for manual refund.' }
    else if (attempt.polls >= 1) {
      outcome = 'confirmed'
      paidAmountKes = finalDigit === '8' ? Math.max(0, attempt.amountKes - 100) : attempt.amountKes
      if (booking) {
        const payment: BookingPayment = {
          id: attempt.paymentId, method: 'mpesa_online', amountKes: paidAmountKes,
          status: 'paid', reference: attempt.paymentId, createdAt: new Date().toISOString(),
        }
        bookingStore[bookingStore.findIndex((item) => item.id === booking.id)] = {
          ...booking, status: 'confirmed', pendingApproval: false, payments: [...(booking.payments ?? []), payment],
        }
      }
    }
    const result: StkStatus = { outcome, amountDueKes: booking.totalKes, paidAmountKes, message }
    return HttpResponse.json({ success: true, data: result, error: null })
  }),
  http.post('/api/v1/quotes/calculate', async ({ request }) => {
    const body = await request.json() as QuoteRequest
    const allowed = ['vehicleId', 'pickupAt', 'returnAt', 'pickupLocation', 'mode', 'driverLocation', 'extras']
    if (!body || Object.keys(body).some((key) => !allowed.includes(key))
      || !body.vehicleId
      || !body.pickupLocation?.trim() || !['self_drive', 'chauffeur'].includes(body.mode)
      || !Array.isArray(body.extras) || body.extras.length > 10
      || body.extras.some((extra) => !['baby_seat', 'rooftop_tent', 'cooler_box', 'airport_pickup'].includes(extra))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Quote details are invalid' } }, { status: 400 })
    }
    if (!Number.isFinite(Date.parse(body.pickupAt)) || Date.parse(body.pickupAt) <= Date.now()
      || !Number.isFinite(Date.parse(body.returnAt)) || Date.parse(body.returnAt) <= Date.parse(body.pickupAt)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_DATE_RANGE', message: 'Pickup must be in the future and return must follow pickup' } }, { status: 400 })
    }
    const vehicle = vehicleStore.find((item) => item.id === body.vehicleId)
    if (!vehicle) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Vehicle not found' } }, { status: 404 })
    if (!isVehicleAvailable(body.vehicleId, body.pickupAt, body.returnAt)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VEHICLE_UNAVAILABLE', message: 'This vehicle is not available for those dates' } }, { status: 409 })
    }
    return HttpResponse.json({
      success: true,
      data: calculateMockQuote(body, vehicle.ratePerDay),
      error: null,
    })
  }),
  http.post('/api/v1/bookings', async ({ request }) => {
    const body = await request.json() as BookingCreateRequest
    const creator = currentUser(request)
    if (!creator) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'A staff session is required' } }, { status: 401 })
    }
    if (!['owner', 'manager', 'agent'].includes(creator.role)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Booking creation permission is required' } }, { status: 403 })
    }
    const allowed = ['vehicleId', 'pickupAt', 'returnAt', 'pickupLocation', 'mode', 'driverLocation', 'extras', 'customerName', 'customerPhone', 'customerEmail', 'customerIdNumber', 'paymentMethod']
    if (!body || Object.keys(body).some((key) => !allowed.includes(key))
      || !body.vehicleId
      || !body.pickupLocation?.trim() || !['self_drive', 'chauffeur'].includes(body.mode)
      || !Array.isArray(body.extras) || body.extras.length > 10
      || body.extras.some((extra) => !['baby_seat', 'rooftop_tent', 'cooler_box', 'airport_pickup'].includes(extra))
      || !body.customerName?.trim() || !/^254[17]\d{8}$/.test(body.customerPhone)
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.customerEmail)
      || !body.customerIdNumber?.trim()
      || !['mpesa_online', 'mpesa_manual', 'cash', 'bank', 'corporate'].includes(body.paymentMethod)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Booking details are invalid' } }, { status: 400 })
    }
    if (!Number.isFinite(Date.parse(body.pickupAt)) || Date.parse(body.pickupAt) <= Date.now()
      || !Number.isFinite(Date.parse(body.returnAt)) || Date.parse(body.returnAt) <= Date.parse(body.pickupAt)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_DATE_RANGE', message: 'Pickup must be in the future and return must follow pickup' } }, { status: 400 })
    }
    const key = request.headers.get('Idempotency-Key')
    if (key && (key.length < 16 || key.length > 128)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Idempotency-Key must contain 16 to 128 characters' } }, { status: 400 })
    }
    const fingerprint = JSON.stringify(body)
    const replay = key ? bookingIdempotencyStore.get(`${creator.id}:${key}`) : undefined
    if (replay) {
      if (replay.fingerprint !== fingerprint) {
        return HttpResponse.json({ success: false, data: null, error: { code: 'IDEMPOTENCY_CONFLICT', message: 'This idempotency key was already used with a different request' } }, { status: 409 })
      }
      const prior = bookingStore.find((booking) => booking.id === replay.bookingId)
      if (prior) return HttpResponse.json({ success: true, data: prior, error: null }, { status: 201 })
    }
    if (!isVehicleAvailable(body.vehicleId, body.pickupAt, body.returnAt)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VEHICLE_UNAVAILABLE', message: 'This car was just booked for those dates' } }, { status: 409 })
    }
    const vehicle = vehicleStore.find((item) => item.id === body.vehicleId)!
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
      pickupLocation: body.pickupLocation,
      status: 'reserved',
      pendingApproval: paymentMethod !== 'mpesa_online',
      mode: body.mode,
      paymentMethod,
      holdExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      createdById: creator.id,
      pickupAt: body.pickupAt,
      returnAt: body.returnAt,
      totalKes: quote.pricingSnapshot.totalDueKes,
      pricingSnapshot: quote.pricingSnapshot,
      payments: [],
      events: [{ id: `evt-new-${bookingIndex}`, type: 'booking.reserved', actor: creator.name, note: 'Booking hold created', createdAt }],
      driver: body.mode === 'chauffeur' ? users.find((item) => item.role === 'driver') : undefined,
      inspections: [],
      auditEntries: [{ id: `audit-new-${bookingIndex}`, type: 'booking.reserved', actor: creator.name, note: 'Booking created from wizard', createdAt }],
    }
    bookingStore.unshift(booking)
    if (key) bookingIdempotencyStore.set(`${creator.id}:${key}`, { fingerprint, bookingId: booking.id })
    return HttpResponse.json({ success: true, data: booking, error: null }, { status: 201 })
  }),
  http.post('/api/v1/bookings/:id/offline-approval', async ({ params, request }) => {
    const index = bookingStore.findIndex((item) => item.id === params.id)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Booking not found' } }, { status: 404 })
    const actor = currentUser(request)
    const booking = bookingStore[index]
    if (!actor || !['owner', 'manager', 'agent'].includes(actor.role)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Offline approval permission is required' } }, { status: 403 })
    }
    if (actor.id === booking.createdById) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'SELF_APPROVAL_FORBIDDEN', message: 'You cannot approve your own booking' } }, { status: 403 })
    }
    const body = await request.json() as { paymentMethod?: PaymentMethod; reference?: string; reason?: string }
    if (!body.reference?.trim() || !isOfflinePaymentMethod(body.paymentMethod)) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_APPROVAL', message: 'A payment method and reference are required' } }, { status: 400 })
    }
    if (body.paymentMethod === 'corporate' && (actor.role === 'agent' || !body.reason?.trim())) {
      return HttpResponse.json({ success: false, data: null, error: { code: actor.role === 'agent' ? 'FORBIDDEN' : 'INVALID_APPROVAL', message: actor.role === 'agent' ? 'Agents cannot approve corporate credit' : 'A reason is required for corporate credit' } }, { status: actor.role === 'agent' ? 403 : 400 })
    }
    if (booking.status !== 'reserved' || !booking.pendingApproval) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_STATUS', message: 'This booking is not awaiting offline approval' } }, { status: 409 })
    }
    if (booking.holdExpiresAt && Date.parse(booking.holdExpiresAt) <= Date.now()) {
      bookingStore[index] = {
        ...booking,
        status: 'expired',
        pendingApproval: false,
        events: [...(booking.events ?? []), {
          id: `evt-expired-${booking.id}`,
          type: 'hold.expired',
          actor: 'system',
          note: 'Reservation hold expired',
          createdAt: new Date().toISOString(),
        }],
      }
      return HttpResponse.json({ success: false, data: null, error: { code: 'HOLD_EXPIRED', message: 'The booking hold has expired' } }, { status: 409 })
    }
    if (booking.paymentMethod !== body.paymentMethod) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'PAYMENT_METHOD_MISMATCH', message: 'The approval method must match the booking' } }, { status: 409 })
    }
    const createdAt = new Date().toISOString()
    const payment: BookingPayment = {
      id: `pay-${Date.now()}`,
      method: body.paymentMethod,
      amountKes: booking.totalKes,
      status: 'paid',
      reference: body.reference.trim(),
      createdAt,
    }
    const updated: Booking = {
      ...booking,
      status: 'confirmed',
      pendingApproval: false,
      payments: [...(booking.payments ?? []), payment],
      events: [...(booking.events ?? []), { id: `evt-${Date.now()}`, type: 'offline_payment.approved', actor: actor.name, note: body.reason?.trim() || `Payment reference ${body.reference.trim()}`, createdAt }],
    }
    bookingStore[index] = updated
    recordMockAudit(request, 'POST /api/v1/bookings/:bookingId/offline-approval', `booking:${booking.id}`)
    return HttpResponse.json({ success: true, data: updated, error: null })
  }),
  http.get('/api/v1/approvals', ({ request }) => {
    const actor = currentUser(request)
    if (!actor || !['owner', 'manager', 'agent'].includes(actor.role)) {
      return HttpResponse.json({ success: false, data: null, error: { code: actor ? 'FORBIDDEN' : 'UNAUTHENTICATED', message: 'Approval permission is required' } }, { status: actor ? 403 : 401 })
    }
    expireMockBookingHolds()
    const rows = bookingStore
      .filter((booking) => booking.status === 'reserved' && booking.pendingApproval !== false
        && booking.createdById !== actor.id
        && (!booking.holdExpiresAt || Date.parse(booking.holdExpiresAt) > Date.now()))
      .sort((left, right) => (left.holdExpiresAt ?? '').localeCompare(right.holdExpiresAt ?? ''))
    return paginatedResponse(rows, request)
  }),
  http.get('/api/v1/staff', ({ request }) => {
    const actor = currentUser(request)
    if (!actor || !['owner', 'manager'].includes(actor.role)) return staffPermissionError(request)
    const url = new URL(request.url)
    const active = url.searchParams.get('active')
    const branch = url.searchParams.get('branch')
    const rows = staffStore
      .filter((member) => actor.role !== 'manager' || member.role !== 'owner')
      .filter((member) => active === null || String(member.active) === active)
      .filter((member) => !branch || member.branch === branch)
      .sort((left, right) => left.name.localeCompare(right.name))
    return paginatedResponse(rows, request)
  }),
  http.post('/api/v1/staff', async ({ request }) => {
    const actor = currentUser(request)
    if (!actor || !['owner', 'manager'].includes(actor.role)) return staffPermissionError(request)
    const body = await request.json() as StaffInvitationRequest
    if (!body.name?.trim() || !body.email?.trim() || !body.phone?.trim() || !body.branch?.trim()
      || (actor.role === 'manager' && body.role === 'owner')
      || (body.role === 'driver' && (!body.driverProfile?.licenceClass || !body.driverProfile.licenceExpiresAt || !body.driverProfile.psvExpiresAt))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Invitation details are invalid' } }, { status: 400 })
    }
    const invitation = {
      ...body,
      id: `inv-${Date.now()}-${invitationStore.size}`,
      email: body.email.toLowerCase(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    }
    invitationStore.set(invitation.id, invitation)
    recordMockAudit(request, 'POST /api/v1/staff', 'staff-invitation')
    return HttpResponse.json({ success: true, data: { id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt }, error: null }, { status: 201 })
  }),
  http.patch('/api/v1/staff/:staffId', async ({ params, request }) => {
    const actor = currentUser(request)
    if (!actor || !['owner', 'manager'].includes(actor.role)) return staffPermissionError(request)
    const index = staffStore.findIndex((member) => member.id === params.staffId)
    if (index < 0) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Staff account was not found' } }, { status: 404 })
    const patch = await request.json() as StaffUpdateRequest
    const member = staffStore[index]
    if ((actor.role === 'manager' && (member.role === 'owner' || patch.role === 'owner'))
      || (actor.id === member.id && (patch.role !== undefined || patch.active === false))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'You cannot make this staff change' } }, { status: 403 })
    }
    if (patch.active === false && member.role === 'owner'
      && staffStore.filter((item) => item.role === 'owner' && item.active).length <= 1) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'LAST_OWNER', message: 'The last active owner cannot be deactivated' } }, { status: 409 })
    }
    const updated = { ...member, ...patch }
    staffStore[index] = updated
    const userIndex = users.findIndex((item) => item.id === member.id)
    if (userIndex >= 0) users[userIndex] = { ...users[userIndex], ...patch }
    recordMockAudit(request, 'PATCH /api/v1/staff/:staffId', `staff:${member.id}`)
    return HttpResponse.json({ success: true, data: updated, error: null })
  }),
  http.post('/api/v1/staff/invitations/:invitationId/resend', ({ params, request }) => {
    const actor = currentUser(request)
    if (!actor || !['owner', 'manager'].includes(actor.role)) return staffPermissionError(request)
    const invitation = invitationStore.get(String(params.invitationId))
    if (!invitation) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Invitation was not found' } }, { status: 404 })
    invitation.expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    recordMockAudit(request, 'POST /api/v1/staff/invitations/:invitationId/resend', `staff-invitation:${invitation.id}`)
    return HttpResponse.json({ success: true, data: { id: invitation.id, email: invitation.email, role: invitation.role, expiresAt: invitation.expiresAt }, error: null })
  }),
  http.delete('/api/v1/staff/invitations/:invitationId', ({ params, request }) => {
    const actor = currentUser(request)
    if (!actor || !['owner', 'manager'].includes(actor.role)) return staffPermissionError(request)
    const invitationId = String(params.invitationId)
    if (!invitationStore.delete(invitationId)) return HttpResponse.json({ success: false, data: null, error: { code: 'NOT_FOUND', message: 'Invitation was not found' } }, { status: 404 })
    recordMockAudit(request, 'DELETE /api/v1/staff/invitations/:invitationId', `staff-invitation:${invitationId}`)
    return HttpResponse.json({ success: true, data: { revoked: true }, error: null })
  }),
  http.get('/api/v1/audit', ({ request }) => {
    const actor = currentUser(request)
    if (!actor || actor.role !== 'owner') return HttpResponse.json({ success: false, data: null, error: { code: actor ? 'FORBIDDEN' : 'UNAUTHENTICATED', message: 'Owner access is required' } }, { status: actor ? 403 : 401 })
    const url = new URL(request.url)
    const actorId = url.searchParams.get('actorId')
    const action = url.searchParams.get('action')
    const entity = url.searchParams.get('entity')
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const rows = auditStore.filter((entry) =>
      (!actorId || entry.actorId === actorId)
      && (!action || entry.action === action)
      && (!entity || entry.entity === entity)
      && (!from || Date.parse(entry.createdAt) >= Date.parse(from))
      && (!to || Date.parse(entry.createdAt) <= Date.parse(to)))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    return paginatedResponse(rows, request)
  }),
  http.get('/api/v1/dashboard', ({ request }) => {
    const url = new URL(request.url)
    const failedCard = url.searchParams.get('fail')
    const data = buildDashboardData(vehicleStore, bookingStore, incidentStore)
    return HttpResponse.json({
      success: true,
      data: failedCard ? { ...data, cardErrors: { [failedCard]: 'Could not load this metric' } } : data,
      error: null,
    })
  }),
  http.get('/api/v1/notifications', ({ request }) => {
    const actor = currentUser(request)
    if (!actor) return HttpResponse.json({ success: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Authentication is required' } }, { status: 401 })
    const canApprove = ['owner', 'manager', 'agent'].includes(actor.role)
    const canReadIncidents = ['owner', 'manager', 'agent', 'mechanic'].includes(actor.role)
    return HttpResponse.json({
      success: true,
      data: {
        pendingApprovals: canApprove ? bookingStore.filter((booking) => booking.status === 'reserved' && booking.pendingApproval !== false).length : 0,
        openIncidents: canReadIncidents ? incidentStore.filter((incident) => incident.status !== 'resolved').length : 0,
      },
      error: null,
    })
  }),
  http.get('/api/v1/search', ({ request }) => {
    const query = new URL(request.url).searchParams.get('q') ?? ''
    if (query.trim().length < 2 || query.length > 100) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'INVALID_QUERY', message: 'Search query must contain 2 to 100 characters' } }, { status: 400 })
    }
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
    const user = currentUser(request)
    if (!user) {
      return HttpResponse.json(
        { success: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } },
        { status: 401 },
      )
    }
    return HttpResponse.json({ success: true, data: user, error: null })
  }),
  http.patch('/api/v1/auth/me', async ({ request }) => {
    const user = currentUser(request)
    if (!user) return HttpResponse.json({ success: false, data: null, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 })
    const patch = await request.json() as { name?: string; phone?: string }
    if ((patch.name !== undefined && patch.name.trim().length < 2)
      || (patch.phone !== undefined && !/^254[17]\d{8}$/.test(patch.phone))) {
      return HttpResponse.json({ success: false, data: null, error: { code: 'VALIDATION_ERROR', message: 'Profile details are invalid' } }, { status: 400 })
    }
    const index = users.findIndex((item) => item.id === user.id)
    users[index] = { ...user, ...patch, name: patch.name?.trim() ?? user.name }
    const staffIndex = staffStore.findIndex((item) => item.id === user.id)
    if (staffIndex >= 0) staffStore[staffIndex] = { ...staffStore[staffIndex], ...users[index] }
    recordMockAudit(request, 'PATCH /api/v1/auth/me', `user:${user.id}`)
    return HttpResponse.json({ success: true, data: users[index], error: null })
  }),
]