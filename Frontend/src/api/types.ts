export type UserRole = 'owner' | 'manager' | 'agent' | 'driver' | 'mechanic'
export type VehicleStatus = 'available' | 'booked' | 'maintenance' | 'inactive'
export type BookingStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'approved'
  | 'confirmed'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'overdue'
  | 'draft'

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: UserRole
}

export interface Vehicle {
  id: string
  make: string
  model: string
  year: number
  registration: string
  seats: number
  transmission: 'automatic' | 'manual'
  ratePerDay: number
  status: VehicleStatus
}

export interface Booking {
  id: string
  reference: string
  vehicleId: string
  customerId: string
  status: BookingStatus
  pickupAt: string
  returnAt: string
  totalKes: number
}

export interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: { code?: string; message: string }
}

export interface AuthSession {
  accessToken: string
  user: User
}

export interface HealthStatus {
  status: 'ok'
}