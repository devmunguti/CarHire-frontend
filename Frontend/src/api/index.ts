export { ApiError, apiClient, getAccessToken, setAccessToken } from './client'
export { getCurrentUser, login, logout } from './auth'
export { useAvailableVehicles, useBookingDetail, useBookingList, useBookings, useCalculateQuote, useCreateBooking, useDashboard, useGlobalSearch, useHealth, useShellNotifications, useUpdateBooking, useVehicles } from './queries'
export type {
  ApiEnvelope,
  AuthSession,
  Booking,
  BookingStatus,
  HealthStatus,
  DashboardData,
  DashboardCardKey,
  DashboardActivity,
  Incident,
  NotificationCounts,
  SearchResult,
  BookingCreateRequest,
  DriveMode,
  PaymentMethod,
  PricingSnapshot,
  QuoteRequest,
  QuoteResponse,
  BookingEvent,
  BookingInspection,
  BookingPayment,
  User,
  UserRole,
  Vehicle,
  VehicleStatus,
} from './types'