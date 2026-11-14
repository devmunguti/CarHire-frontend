import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { ApiError } from './client'
import type { AvailableDriversResponse, Booking, BookingCreateRequest, DashboardData, Driver, DriverTripStatus, HealthStatus, MaintenanceWindow, NotificationCounts, QuoteRequest, QuoteResponse, SearchResult, Vehicle } from './types'
import { buildDashboardData } from '../features/dashboard/dashboardData'

export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: () => apiClient.get<HealthStatus>('/health') })
}

export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: () => apiClient.get<Vehicle[]>('/vehicles') })
}

export function useMaintenanceWindows(from: string, to: string) {
  return useQuery({
    queryKey: ['maintenance-windows', from, to],
    queryFn: () => apiClient.get<MaintenanceWindow[]>(`/maintenance-windows?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    enabled: Boolean(from && to),
  })
}

export function useBookings() {
  return useQuery({ queryKey: ['bookings'], queryFn: () => apiClient.get<Booking[]>('/bookings') })
}

export function useBookingList(query: string) {
  return useQuery({
    queryKey: ['bookings', query],
    queryFn: () => apiClient.get<Booking[]>(`/bookings${query ? `?${query}` : ''}`),
  })
}

export function useBookingDetail(id: string) {
  return useQuery({ queryKey: ['booking', id], queryFn: () => apiClient.get<Booking>(`/bookings/${id}`), enabled: Boolean(id) })
}

export function useAvailableVehicles(from: string, to: string) {
  return useQuery({
    queryKey: ['available-vehicles', from, to],
    queryFn: () => apiClient.get<Vehicle[]>(`/vehicles?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    enabled: Boolean(from && to),
  })
}

export function useCalculateQuote() {
  return useMutation({ mutationFn: (request: QuoteRequest) => apiClient.post<QuoteResponse>('/quotes/calculate', request) })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: BookingCreateRequest) => apiClient.post<Booking>('/bookings', request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['available-vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
  })
}

export function useUpdateBooking(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Booking>) => apiClient.patch<Booking>(`/bookings/${id}`, patch),
    onSuccess: async (booking) => {
      queryClient.setQueryData(['booking', id], booking)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        return await apiClient.get<DashboardData>('/dashboard')
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return buildDashboardData()
        throw error
      }
    },
    refetchInterval: 45_000,
  })
}

export function useShellNotifications() {
  return useQuery({
    queryKey: ['shell-notifications'],
    queryFn: () => apiClient.get<NotificationCounts>('/notifications'),
    refetchInterval: 45_000,
  })
}

export function useGlobalSearch(query: string, enabled = true) {
  const search = query.trim()
  return useQuery({
    queryKey: ['global-search', search],
    queryFn: () => apiClient.get<SearchResult[]>(`/search?q=${encodeURIComponent(search)}`),
    enabled: enabled && search.length >= 2,
    staleTime: 30_000,
  })
}

export function useDrivers() {
  return useQuery({ queryKey: ['drivers'], queryFn: () => apiClient.get<Driver[]>('/drivers') })
}

export function useAvailableDrivers(from: string, to: string, vehicleId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['drivers', 'available', from, to, vehicleId],
    queryFn: () => apiClient.get<AvailableDriversResponse>(`/drivers/available?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&vehicleId=${encodeURIComponent(vehicleId)}`),
    enabled: enabled && Boolean(from && to && vehicleId),
  })
}

export function useMyDriverTrips() {
  return useQuery({ queryKey: ['driver-trips'], queryFn: () => apiClient.get<Booking[]>('/drivers/me/trips') })
}

export function useAssignDriver(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (driverId: string) => apiClient.post<Booking>(`/bookings/${encodeURIComponent(bookingId)}/driver`, { driverId }),
    onSuccess: async (booking) => {
      queryClient.setQueryData(['booking', bookingId], booking)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['drivers'] }),
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
      ])
    },
  })
}

export function useUpdateDriverTripStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: string; status: DriverTripStatus }) =>
      apiClient.post<Booking>(`/bookings/${encodeURIComponent(bookingId)}/driver-status`, { status }),
    onSuccess: async (booking) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['driver-trips'] }),
        queryClient.invalidateQueries({ queryKey: ['booking', booking.id] }),
      ])
    },
  })
}