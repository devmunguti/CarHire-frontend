import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { setAccessToken } from '../api/client'
import { VehicleDetailsPage } from './public'

const vehicle = {
  id: 'vehicle-001',
  make: 'Toyota',
  model: 'RAV4',
  category: 'SUV',
  year: 2024,
  registration: 'KDA 123A',
  seats: 5,
  transmission: 'automatic' as const,
  ratePerDay: 8000,
  status: 'available' as const,
}

function CheckoutRoute() {
  const { bookingId } = useParams()
  return <p>Checkout booking: {bookingId}</p>
}

function renderPage(path = '/vehicles/vehicle-001') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<VehicleDetailsPage />} path="/vehicles/:id" />
          <Route element={<CheckoutRoute />} path="/checkout/:bookingId" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function apiResponse(data: unknown, status = 200) {
  return Response.json({ success: status < 400, data: status < 400 ? data : null, error: status < 400 ? null : { code: 'VEHICLE_UNAVAILABLE', message: 'Unavailable' } }, { status })
}

beforeEach(() => {
  setAccessToken(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  setAccessToken(null)
})

describe('public vehicle details and booking', () => {
  it('creates an idempotent guest hold and navigates to checkout', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init
      const url = new URL(String(input), 'http://localhost')
      if (url.pathname === '/api/v1/vehicles/vehicle-001') return apiResponse(vehicle)
      if (url.pathname === '/api/v1/bookings/guest-holds') return apiResponse({ bookingId: 'booking-guest-01', holdExpiresAt: '2099-01-01T10:15:00.000Z' }, 201)
      throw new Error(`Unexpected request: ${url.pathname}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage('/vehicles/vehicle-001')

    expect(await screen.findByRole('heading', { name: 'Toyota RAV4' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Pick-up date and time'), { target: { value: '2099-01-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Return date and time'), { target: { value: '2099-01-03T10:00' } })
    fireEvent.change(screen.getByLabelText('Pick-up location'), { target: { value: 'Nairobi' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to checkout/i }))

    expect(await screen.findByText('Checkout booking: booking-guest-01')).toBeInTheDocument()
    const holdCall = fetchMock.mock.calls.find(([input]) => new URL(String(input), 'http://localhost').pathname === '/api/v1/bookings/guest-holds')
    expect(holdCall).toBeDefined()
    expect(new Headers(holdCall?.[1]?.headers).get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/i)
    expect(JSON.parse(String(holdCall?.[1]?.body))).toMatchObject({
      vehicleId: vehicle.id,
      pickupLocation: 'Nairobi',
      mode: 'self_drive',
      extras: [],
    })
  })

  it('keeps the customer on the details page when the vehicle becomes unavailable', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      if (url.pathname === '/api/v1/vehicles/vehicle-001') return apiResponse(vehicle)
      if (url.pathname === '/api/v1/bookings/guest-holds') return apiResponse(null, 409)
      throw new Error(`Unexpected request: ${url.pathname}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderPage('/vehicles/vehicle-001')
    await screen.findByRole('heading', { name: 'Toyota RAV4' })
    fireEvent.change(screen.getByLabelText('Pick-up date and time'), { target: { value: '2099-01-01T10:00' } })
    fireEvent.change(screen.getByLabelText('Return date and time'), { target: { value: '2099-01-03T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to checkout/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/just reserved/i)
    await waitFor(() => expect(screen.queryByText(/Checkout booking/)).not.toBeInTheDocument())
  })
})
