import { useQuery } from '@tanstack/react-query'
import { apiClient } from './client'
import type { Booking, HealthStatus, Vehicle } from './types'

export function useHealth() {
  return useQuery({ queryKey: ['health'], queryFn: () => apiClient.get<HealthStatus>('/health') })
}

export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: () => apiClient.get<Vehicle[]>('/vehicles') })
}

export function useBookings() {
  return useQuery({ queryKey: ['bookings'], queryFn: () => apiClient.get<Booking[]>('/bookings') })
}