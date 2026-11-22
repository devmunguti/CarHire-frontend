import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../api/client'
import { PaymentStatus } from './PaymentStatus'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PayHero checkout UI', () => {
  it('starts payment against the booking-reference route with an idempotency key', async () => {
    const startPayment = vi.spyOn(apiClient, 'post').mockResolvedValue({
      paymentId: 'payment-01',
      maskedPhone: '2547XX XXX 678',
      amountKes: 25_000,
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <PaymentStatus amountDueKes={25_000} bookingId="booking-01" bookingReference="BK-TEST-0001" />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '712345678' } })
    fireEvent.click(screen.getByRole('button', { name: /Send payment request/ }))

    expect(await screen.findByRole('heading', { name: 'Check your phone' })).toBeVisible()
    expect(startPayment).toHaveBeenCalledWith(
      '/bookings/BK-TEST-0001/payments/stk',
      { phone: '254712345678' },
      { headers: { 'Idempotency-Key': expect.stringMatching(/^[0-9a-f-]{36}$/i) } },
    )
  })
})
