import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../api/client'
import type { BookingExtension } from '../../api/types'
import { ExtensionsPage } from './ExtensionsPage'

const extension: BookingExtension = {
  id: 'extension-01',
  reference: 'BK-TEST-0001',
  currentReturnAt: '2027-01-17T06:00:00.000Z',
  requestedReturnAt: '2027-01-18T06:00:00.000Z',
  reason: 'Travel plans changed',
  status: 'pending',
  feeKes: 9_280,
  createdAt: '2027-01-15T06:00:00.000Z',
  booking: {
    id: 'booking-01',
    reference: 'BK-TEST-0001',
    customerName: 'Amina Njeri',
    vehicle: 'Toyota Prado TX',
    currentReturnAt: '2027-01-17T06:00:00.000Z',
    status: 'checked_out',
  },
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 }, mutations: { retry: false } },
  })
  queryClient.setQueryData(['booking-extensions', 'pending'], [extension])
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><ExtensionsPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('extension review', () => {
  it('requires an offline receipt before approving a paid extension', async () => {
    const reviewRequest = vi.spyOn(apiClient, 'post').mockResolvedValue(extension)
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm extension' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter the offline payment receipt')
    expect(reviewRequest).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Payment receipt / reference'), { target: { value: 'RCPT-EXT-100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm extension' }))
    expect(await screen.findByRole('heading', { name: 'Extension requests' })).toBeVisible()
    expect(reviewRequest).toHaveBeenCalledWith('/extensions/extension-01/decision', {
      decision: 'approve',
      paymentMethod: 'cash',
      paymentReference: 'RCPT-EXT-100',
    })
  })
})
