import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from './client'
import type { BookingCreateRequest } from './types'
import { useCreateBooking, useDashboard } from './queries'

describe('dashboard query', () => {
  afterEach(() => vi.restoreAllMocks())

  it('surfaces a missing dashboard endpoint instead of substituting fixture data', async () => {
    const request = vi.spyOn(apiClient, 'get').mockRejectedValue(new ApiError('Not found', 404))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children)
    const { result } = renderHook(() => useDashboard(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ status: 404 })
    expect(request).toHaveBeenCalledWith('/dashboard')
  })

  describe('booking creation query', () => {
    afterEach(() => vi.restoreAllMocks())

    it('reuses an idempotency key after a failed request and refreshes it after success', async () => {
      const request: BookingCreateRequest = {
        vehicleId: '0123456789abcdef01234567',
        pickupAt: '2027-01-15T06:00:00.000Z',
        returnAt: '2027-01-16T06:00:00.000Z',
        pickupLocation: 'Nairobi',
        mode: 'self_drive',
        extras: [],
        customerName: 'Grace Wanjiku',
        customerPhone: '254712345678',
        customerEmail: 'grace@example.test',
        customerIdNumber: '12345678',
        paymentMethod: 'cash',
      }
      const post = vi.spyOn(apiClient, 'post')
        .mockRejectedValueOnce(new Error('Network failed'))
        .mockResolvedValue({} as never)
      const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children)
      const { result } = renderHook(() => useCreateBooking(), { wrapper })

      await act(async () => {
        await expect(result.current.mutateAsync(request)).rejects.toThrow('Network failed')
      })
      await act(async () => {
        await result.current.mutateAsync(request)
      })
      await act(async () => {
        await result.current.mutateAsync(request)
      })

      const keys = post.mock.calls.map((call) => new Headers(call[2]?.headers).get('Idempotency-Key'))
      expect(keys[0]).toBeTruthy()
      expect(keys[1]).toBe(keys[0])
      expect(keys[2]).not.toBe(keys[1])
    })
  })
})
