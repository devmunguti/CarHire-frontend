export type UserRole = 'owner' | 'manager' | 'agent' | 'driver' | 'mechanic'
export type VehicleStatus = 'available' | 'booked' | 'maintenance' | 'inactive'
export type BookingStatus =
  | 'reserved'
  | 'confirmed'
  | 'checked_out'
  | 'expired'
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

export type DriveMode = 'self_drive' | 'chauffeur'
export type PaymentMethod = 'mpesa_online' | 'mpesa_manual' | 'cash' | 'bank' | 'corporate'

export interface QuoteLineItem {
  code: string
  label: string
  amountKes: number
}

export interface PricingSnapshot {
  baseDays: number
  baseRateKes: number
  baseAmountKes: number
  chauffeurFeeKes: number
  extras: QuoteLineItem[]
  vatRate: 16
  vatAmountKes: number
  totalDueKes: number
  refundableDepositKes: number
}

export interface QuoteRequest {
  vehicleId: string
  pickupAt: string
  returnAt: string
  pickupLocation: string
  mode: DriveMode
  extras: string[]
}

export interface QuoteResponse {
  pricingSnapshot: PricingSnapshot
  currency: 'KES'
}

export interface BookingPayment {
  id: string
  method: PaymentMethod
  amountKes: number
  status: 'pending' | 'paid' | 'failed'
  reference: string
  createdAt: string
}

export interface BookingEvent {
  id: string
  type: string
  actor: string
  note: string
  createdAt: string
}

export interface BookingInspection {
  id: string
  type: 'check_out' | 'check_in'
  odometer: number
  fuelLevel: string
  createdAt: string
}

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
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  customerIdNumber?: string
  status: BookingStatus
  pendingApproval?: boolean
  pickupAt: string
  returnAt: string
  totalKes: number
  mode?: DriveMode
  paymentMethod?: PaymentMethod
  holdExpiresAt?: string
  createdById?: string
  pricingSnapshot?: PricingSnapshot
  payments?: BookingPayment[]
  events?: BookingEvent[]
  driver?: User
  inspections?: BookingInspection[]
  auditEntries?: BookingEvent[]
  accruedLateFeeKes?: number
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

export type DashboardCardKey =
  | 'vehiclesOutToday'
  | 'pickupsDueToday'
  | 'returnsDueToday'
  | 'overdueVehicles'
  | 'pendingApprovals'
  | 'activeBreakdowns'
  | 'monthlyRevenue'

export interface DashboardActivity {
  id: string
  kind: 'booking' | 'handover' | 'incident'
  reference: string
  timestamp: string
}

export interface DashboardData {
  metrics: Record<DashboardCardKey, number | null>
  cardErrors?: Partial<Record<DashboardCardKey, string>>
  pickups: Booking[]
  returns: Booking[]
  fleetStatus: { available: number; rented: number; reserved: number; maintenance: number }
  recentActivity: DashboardActivity[]
}

export interface Incident {
  id: string
  reference: string
  status: 'open' | 'dispatched' | 'en_route' | 'resolved'
  description: string
  createdAt: string
}

export interface NotificationCounts {
  pendingApprovals: number
  openIncidents: number
}

export interface SearchResult {
  id: string
  type: 'vehicle' | 'booking' | 'customer'
  title: string
  subtitle: string
  href: string
}

export interface BookingCreateRequest extends QuoteRequest {
  customerName: string
  customerPhone: string
  customerEmail: string
  customerIdNumber: string
  paymentMethod: PaymentMethod
  createdById: string
}