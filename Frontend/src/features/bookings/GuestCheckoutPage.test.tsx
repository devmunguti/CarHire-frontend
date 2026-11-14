import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../api/client'
import type { GuestBookingAccess, GuestCheckoutData } from '../../api/types'
import { maskKenyanPhone } from '../../lib'
import { GuestBookingPage, GuestCheckoutPage } from './GuestCheckoutPage'
import { getCheckoutSteps, MAX_LICENCE_SIZE_BYTES, validateLicenceFile } from './checkoutModel'

const checkoutData: GuestCheckoutData = {
  booking: {
    id: 'booking-test',
    reference: 'BK-TEST-0001',
    vehicleId: 'car-01',
    status: 'reserved',
    pickupAt: '2027-01-15T06:00:00.000Z',
    returnAt: '2027-01-17T06:00:00.000Z',
    totalKes: 25000,
    mode: 'chauffeur',
    holdExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    pricingSnapshot: { baseDays: 2, baseRateKes: 10000, baseAmountKes: 20000, chauffeurFeeKes: 0, extras: [], vatRate: 16, vatAmountKes: 3200, totalDueKes: 23200, refundableDepositKes: 15000 },
  },
  vehicle: { id: 'car-01', make: 'Toyota', model: 'Prado TX', registration: 'KDA 101A', ratePerDay: 10000 },
}

function renderWithRouter(path: string, element: ReactNode, queryData?: GuestCheckoutData) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } })
  if (queryData) queryClient.setQueryData(['guest-checkout', 'booking-test'], queryData)
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={element} path={path.includes('/checkout/') ? '/checkout/:bookingId' : '/booking/:ref'} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('guest checkout', () => {
  it('skips the driving licence step for chauffeur bookings and requires both acceptances', async () => {
    renderWithRouter('/checkout/booking-test', <GuestCheckoutPage />, checkoutData)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Amina Njeri' } })
    fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: '212345678' } })
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'amina@example.ke' } })
    fireEvent.change(screen.getByLabelText('National ID or passport'), { target: { value: '12345678' } })
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: '712345678' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))

    expect(await screen.findByRole('heading', { name: 'Terms and rental rules' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Driving licence' })).not.toBeInTheDocument()
    const continueButton = screen.getByRole('button', { name: /Continue/ })
    expect(continueButton).toBeDisabled()
    fireEvent.click(screen.getByLabelText('I agree to the booking terms and privacy notice.'))
    expect(continueButton).toBeDisabled()
    fireEvent.click(screen.getByLabelText('I have read and agree to the rental rules.'))
    expect(continueButton).toBeEnabled()
  })

  it('shows an expired hold and keeps the selected dates in the search link', async () => {
    const expiredData: GuestCheckoutData = {
      ...checkoutData,
      booking: { ...checkoutData.booking, holdExpiresAt: new Date(Date.now() - 60_000).toISOString() },
    }
    renderWithRouter('/checkout/booking-test', <GuestCheckoutPage />, expiredData)
    expect(await screen.findByRole('heading', { name: 'This booking hold has expired' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Find a car for these dates' })).toHaveAttribute('href', expect.stringContaining('from=2027-01-15'))
    expect(screen.getByRole('link', { name: 'Find a car for these dates' })).toHaveAttribute('href', expect.stringContaining('to=2027-01-17'))
  })

  it('requires a valid licence upload for self-drive bookings', async () => {
    const selfDriveData: GuestCheckoutData = {
      ...checkoutData,
      booking: { ...checkoutData.booking, mode: 'self_drive' },
    }
    renderWithRouter('/checkout/booking-test', <GuestCheckoutPage />, selfDriveData)
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Amina Njeri' } })
    fireEvent.change(screen.getByLabelText(/Phone number/), { target: { value: '712345678' } })
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'amina@example.ke' } })
    fireEvent.change(screen.getByLabelText('National ID or passport'), { target: { value: '12345678' } })
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))

    expect(await screen.findByRole('heading', { name: 'Driving licence' })).toBeVisible()
    const continueButton = screen.getByRole('button', { name: /Continue/ })
    expect(continueButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Driving licence upload'), {
      target: { files: [new File(['licence'], 'licence.pdf', { type: 'application/pdf' })] },
    })
    expect(continueButton).toBeEnabled()
    fireEvent.click(continueButton)
    expect(await screen.findByRole('heading', { name: 'Terms and rental rules' })).toBeVisible()
  })

  it('does not show booking details for an invalid access token', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('not authorized'))
    renderWithRouter('/booking/BK-TEST-0001?token=invalid', <GuestBookingPage />)
    expect(await screen.findByRole('heading', { name: 'Booking link unavailable' })).toBeVisible()
    expect(screen.queryByText('Toyota Prado TX')).not.toBeInTheDocument()
  })

  it('masks the phone number on a valid token booking page', async () => {
    const access: GuestBookingAccess = {
      booking: {
        ...checkoutData.booking,
        customerName: 'Amina Njeri',
        customerPhone: '254712345678',
      },
      vehicle: { id: 'car-01', make: 'Toyota', model: 'Prado TX', registration: 'KDA 101A' },
      accessToken: 'valid-mock-token',
      cancellationAllowed: true,
    }
    vi.spyOn(apiClient, 'get').mockResolvedValue(access)
    renderWithRouter('/booking/BK-TEST-0001?token=valid-mock-token', <GuestBookingPage />)
    expect(await screen.findByText('2547XX XXX 678')).toBeVisible()
    expect(screen.queryByText('254712345678')).not.toBeInTheDocument()
  })

  it('requires an explicit cancellation confirmation and sends the access token', async () => {
    const access: GuestBookingAccess = {
      booking: { ...checkoutData.booking, customerPhone: '254712345678' },
      vehicle: { id: 'car-01', make: 'Toyota', model: 'Prado TX', registration: 'KDA 101A' },
      accessToken: 'valid-mock-token',
      cancellationAllowed: true,
    }
    vi.spyOn(apiClient, 'get').mockResolvedValue(access)
    const cancelRequest = vi.spyOn(apiClient, 'post').mockResolvedValue({ cancelled: true })
    renderWithRouter('/booking/BK-TEST-0001?token=valid-mock-token', <GuestBookingPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
    expect(screen.getByText(/Cancellation is free at least 48 hours before pick-up/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    expect(await screen.findByRole('heading', { name: 'Booking cancelled' })).toBeVisible()
    expect(cancelRequest).toHaveBeenCalledWith(
      '/bookings/BK-TEST-0001/cancel',
      undefined,
      { headers: { 'X-Booking-Access-Token': 'valid-mock-token' } },
    )
  })

  it('shows only a masked phone number', () => {
    expect(maskKenyanPhone('254712345678')).toBe('2547XX XXX 678')
    expect(maskKenyanPhone('0712345678')).not.toContain('123456')
  })

  it('validates licence file type and the 5 MB limit', () => {
    const valid = new File(['licence'], 'licence.pdf', { type: 'application/pdf' })
    const wrongType = new File(['licence'], 'licence.txt', { type: 'text/plain' })
    const tooLarge = new File([new Uint8Array(MAX_LICENCE_SIZE_BYTES + 1)], 'licence.png', { type: 'image/png' })
    expect(validateLicenceFile(valid)).toBeNull()
    expect(validateLicenceFile(wrongType)).toMatch(/JPG, PNG, WebP, or PDF/)
    expect(validateLicenceFile(tooLarge)).toMatch(/5 MB or smaller/)
  })

  it('defines a licence step for self-drive bookings', () => {
    expect(getCheckoutSteps('self_drive')).toEqual(['details', 'licence', 'terms', 'payment'])
  })
})
