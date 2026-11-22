import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { apiClient } from './client'
import type { AuditEntry, AuditQuery, AvailableDriversResponse, Booking, BookingCancellationRequest, BookingCreateRequest, DashboardData, Driver, DriverTripStatus, HealthStatus, Incident, IncidentCreateRequest, IncidentDispatchType, MaintenanceWindow, MaintenanceWindowCreateRequest, MaintenanceWindowUpdateRequest, Mechanic, MechanicCreateRequest, NearbyMechanic, NotificationCounts, OfflineApprovalRequest, QuoteRequest, QuoteResponse, SearchResult, StaffInvitation, StaffInvitationRequest, StaffMember, StaffUpdateRequest, Vehicle, VehicleCreateRequest, VehicleUpdateRequest } from './types'

export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: () => apiClient.get<HealthStatus>('/health') })
}

export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: () => apiClient.getAll<Vehicle>('/vehicles') })
}

export function useMaintenanceWindows(from: string, to: string) {
  return useQuery({
    queryKey: ['maintenance-windows', from, to],
    queryFn: () => apiClient.getAll<MaintenanceWindow>(`/maintenance-windows?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    enabled: Boolean(from && to),
  })
}

function invalidateFleetQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
    queryClient.invalidateQueries({ queryKey: ['available-vehicles'] }),
    queryClient.invalidateQueries({ queryKey: ['maintenance-windows'] }),
  ])
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: VehicleCreateRequest) => apiClient.post<Vehicle>('/vehicles', request),
    onSuccess: () => invalidateFleetQueries(queryClient),
  })
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: VehicleUpdateRequest }) => apiClient.patch<Vehicle>(`/vehicles/${encodeURIComponent(id)}`, request),
    onSuccess: () => invalidateFleetQueries(queryClient),
  })
}

export function useCreateMaintenanceWindow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: MaintenanceWindowCreateRequest) => apiClient.post<MaintenanceWindow>('/maintenance-windows', request),
    onSuccess: () => invalidateFleetQueries(queryClient),
  })
}

export function useUpdateMaintenanceWindow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: MaintenanceWindowUpdateRequest }) => apiClient.patch<MaintenanceWindow>(`/maintenance-windows/${encodeURIComponent(id)}`, request),
    onSuccess: () => invalidateFleetQueries(queryClient),
  })
}

export function useDeleteMaintenanceWindow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ deleted: true }>(`/maintenance-windows/${encodeURIComponent(id)}`),
    onSuccess: () => invalidateFleetQueries(queryClient),
  })
}

export function useBookings() {
  return useQuery({ queryKey: ['bookings'], queryFn: () => apiClient.getAll<Booking>('/bookings') })
}

export function useBookingList(query: string) {
  return useQuery({
    queryKey: ['bookings', query],
    queryFn: () => apiClient.getAll<Booking>(`/bookings${query ? `?${query}` : ''}`),
  })
}

export function useBookingDetail(id: string) {
  return useQuery({ queryKey: ['booking', id], queryFn: () => apiClient.get<Booking>(`/bookings/${id}`), enabled: Boolean(id) })
}

export function useAvailableVehicles(from: string, to: string) {
  return useQuery({
    queryKey: ['available-vehicles', from, to],
    queryFn: () => apiClient.getAll<Vehicle>(`/vehicles?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    enabled: Boolean(from && to),
  })
}

export function useCalculateQuote() {
  return useMutation({ mutationFn: (request: QuoteRequest) => apiClient.post<QuoteResponse>('/quotes/calculate', request) })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  const pendingRequest = useRef<{ fingerprint: string; key: string } | null>(null)
  return useMutation({
    mutationFn: (request: BookingCreateRequest) => {
      const fingerprint = JSON.stringify(request)
      if (pendingRequest.current?.fingerprint !== fingerprint) {
        pendingRequest.current = { fingerprint, key: crypto.randomUUID() }
      }
      return apiClient.post<Booking>('/bookings', request, {
        headers: { 'Idempotency-Key': pendingRequest.current.key },
      })
    },
    onSuccess: async () => {
      pendingRequest.current = null
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['available-vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
    },
  })
}

export function useApproveOfflinePayment(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: OfflineApprovalRequest) => apiClient.post<Booking>(`/bookings/${encodeURIComponent(id)}/offline-approval`, request),
    onSuccess: async (booking) => {
      queryClient.setQueryData(['booking', id], booking)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['shell-notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['audit'] }),
        queryClient.invalidateQueries({ queryKey: ['approvals'] }),
      ])
    },
  })
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: () => apiClient.getAll<Booking>('/approvals?sort=holdExpiresAt%3Aasc'),
  })
}

export function useStaff() {
  return useQuery({ queryKey: ['staff'], queryFn: () => apiClient.getAll<StaffMember>('/staff') })
}

export function useInviteStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: StaffInvitationRequest) => apiClient.post<StaffInvitation>('/staff', request),
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['staff'] }),
      queryClient.invalidateQueries({ queryKey: ['audit'] }),
    ]),
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: StaffUpdateRequest }) =>
      apiClient.patch<StaffMember>(`/staff/${encodeURIComponent(id)}`, request),
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['staff'] }),
      queryClient.invalidateQueries({ queryKey: ['audit'] }),
    ]),
  })
}

export function useAuditEntries(filters: AuditQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return useQuery({
    queryKey: ['audit', filters],
    queryFn: () => apiClient.getAll<AuditEntry>(`/audit${query ? `?${query}` : ''}`),
  })
}

export function useCancelBooking(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: BookingCancellationRequest = {}) => apiClient.post<Booking>(`/bookings/${encodeURIComponent(id)}/cancel`, request),
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
    queryFn: () => apiClient.get<DashboardData>('/dashboard'),
    refetchInterval: 45_000,
  })
}

export function useShellNotifications() {
  return useQuery({
    queryKey: ['shell-notifications'],
    queryFn: () => apiClient.get<NotificationCounts>('/notifications'),
    refetchInterval: 15_000,
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
  return useQuery({ queryKey: ['drivers'], queryFn: () => apiClient.getAll<Driver>('/drivers') })
}

export function useAvailableDrivers(from: string, to: string, vehicleId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['drivers', 'available', from, to, vehicleId],
    queryFn: () => apiClient.get<AvailableDriversResponse>(`/drivers/available?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&vehicleId=${encodeURIComponent(vehicleId)}`),
    enabled: enabled && Boolean(from && to && vehicleId),
  })
}

export function useMyDriverTrips() {
  return useQuery({ queryKey: ['driver-trips'], queryFn: () => apiClient.getAll<Booking>('/drivers/me/trips') })
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

export function useMechanics() {
  return useQuery({ queryKey: ['mechanics'], queryFn: () => apiClient.getAll<Mechanic>('/mechanics') })
}

export function useNearestMechanics(latitude: number, longitude: number, category?: string, enabled = true) {
  return useQuery({
    queryKey: ['mechanics', 'nearest', latitude, longitude, category],
    queryFn: () => apiClient.get<NearbyMechanic[]>(`/mechanics/nearest?lat=${latitude}&lng=${longitude}&radiusKm=50&limit=5${category ? `&category=${encodeURIComponent(category)}` : ''}`),
    enabled,
  })
}

export function useIncidents() {
  return useQuery({ queryKey: ['incidents'], queryFn: () => apiClient.getAll<Incident>('/incidents'), refetchInterval: 15_000 })
}

export function useCreateMechanic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: MechanicCreateRequest) => apiClient.post<Mechanic>('/mechanics', request),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['mechanics'] }),
  })
}

export function useCreateIncident() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: IncidentCreateRequest) => {
      const { photos, location, ...details } = request
      const form = new FormData()
      for (const [key, value] of Object.entries(details)) {
        form.set(key, String(value))
      }
      form.set('location', JSON.stringify(location))
      for (const photo of photos) form.append('photos', photo)
      return apiClient.upload<Incident>('/incidents/breakdown', form, () => undefined)
    },
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['incidents'] }),
      queryClient.invalidateQueries({ queryKey: ['shell-notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]),
  })
}

export function useDispatchIncident() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ incidentId, type, mechanicId, vehicleId }: { incidentId: string; type: IncidentDispatchType; mechanicId?: string; vehicleId?: string }) =>
      apiClient.patch<Incident>(`/incidents/${encodeURIComponent(incidentId)}/dispatch`, { type, mechanicId, vehicleId }),
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['incidents'] }),
      queryClient.invalidateQueries({ queryKey: ['shell-notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings'] }),
      queryClient.invalidateQueries({ queryKey: ['timeline-incidents'] }),
    ]),
  })
}