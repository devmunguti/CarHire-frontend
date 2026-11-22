import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

const server = setupServer(...handlers)
const apiBaseUrl = 'http://localhost:3000/api/v1'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('booking mock API contract', () => {
  it('rejects client prices and replays identical idempotent booking requests', async () => {
    const pickupAt = new Date(Date.now() + 10 * 86_400_000)
    const returnAt = new Date(pickupAt.getTime() + 86_400_000)
    const payload = {
      vehicleId: 'car-01',
      pickupAt: pickupAt.toISOString(),
      returnAt: returnAt.toISOString(),
      pickupLocation: 'Nairobi',
      mode: 'self_drive',
      extras: [],
      customerName: 'Grace Wanjiku',
      customerPhone: '254712345678',
      customerEmail: 'grace@example.test',
      customerIdNumber: '12345678',
      paymentMethod: 'cash',
    }
    const headers = { Authorization: 'Bearer mock-manager', 'Content-Type': 'application/json' }

    const quoteResponse = await fetch(`${apiBaseUrl}/quotes/calculate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vehicleId: payload.vehicleId,
        pickupAt: payload.pickupAt,
        returnAt: payload.returnAt,
        pickupLocation: payload.pickupLocation,
        mode: payload.mode,
        extras: payload.extras,
      }),
    })
    expect(quoteResponse.status).toBe(200)

    const rejectedPrice = await fetch(`${apiBaseUrl}/bookings`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, totalKes: 1 }),
    })
    expect(rejectedPrice.status).toBe(400)
    expect((await rejectedPrice.json()).error.code).toBe('VALIDATION_ERROR')

    const idempotencyKey = 'frontend-mock-booking-key-001'
    const create = () => fetch(`${apiBaseUrl}/bookings`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    })
    const first = await create()
    const firstBooking = (await first.json()).data
    const replay = await create()
    const replayBooking = (await replay.json()).data

    expect(first.status).toBe(201)
    expect(firstBooking.totalKes).toBeGreaterThan(0)
    expect(replay.status).toBe(201)
    expect(replayBooking.id).toBe(firstBooking.id)

    const conflict = await fetch(`${apiBaseUrl}/bookings`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ ...payload, customerName: 'Different Person' }),
    })
    expect(conflict.status).toBe(409)
    expect((await conflict.json()).error.code).toBe('IDEMPOTENCY_CONFLICT')

    const detail = await fetch(`${apiBaseUrl}/bookings/${firstBooking.id}`, {
      headers: { Authorization: 'Bearer mock-manager' },
    })
    expect(detail.status).toBe(200)
    expect((await detail.json()).data.id).toBe(firstBooking.id)
  })
})
