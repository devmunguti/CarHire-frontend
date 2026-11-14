import type { Booking, BookingStatus, User, Vehicle } from '../api/types'

export const DEMO_PASSWORD = 'AutoHireDemo123!'

export const users: User[] = [
  { id: 'usr-01', name: 'Amina Njeri', email: 'amina@autohire.ke', phone: '254712345601', role: 'owner' },
  { id: 'usr-02', name: 'Brian Otieno', email: 'brian@autohire.ke', phone: '254712345602', role: 'manager' },
  { id: 'usr-03', name: 'Wanjiku Kamau', email: 'wanjiku@autohire.ke', phone: '254712345603', role: 'agent' },
  { id: 'usr-04', name: 'Peter Mwangi', email: 'peter@autohire.ke', phone: '254112345604', role: 'driver' },
  { id: 'usr-05', name: 'David Kiptoo', email: 'david@autohire.ke', phone: '254112345605', role: 'mechanic' },
]

export const vehicles: Vehicle[] = [
  { id: 'car-01', make: 'Toyota', model: 'Prado TX', year: 2023, registration: 'KDA 101A', seats: 7, transmission: 'automatic', ratePerDay: 18000, status: 'available' },
  { id: 'car-02', make: 'Toyota', model: 'Axio', year: 2022, registration: 'KDB 202B', seats: 5, transmission: 'automatic', ratePerDay: 6500, status: 'booked' },
  { id: 'car-03', make: 'Nissan', model: 'X-Trail', year: 2023, registration: 'KDC 303C', seats: 7, transmission: 'automatic', ratePerDay: 14000, status: 'available' },
  { id: 'car-04', make: 'Toyota', model: 'Noah', year: 2022, registration: 'KDD 404D', seats: 8, transmission: 'automatic', ratePerDay: 12000, status: 'available' },
  { id: 'car-05', make: 'Mazda', model: 'Demio', year: 2021, registration: 'KDE 505E', seats: 5, transmission: 'automatic', ratePerDay: 5500, status: 'maintenance' },
  { id: 'car-06', make: 'Toyota', model: 'RAV4', year: 2023, registration: 'KDF 606F', seats: 5, transmission: 'automatic', ratePerDay: 11000, status: 'available' },
  { id: 'car-07', make: 'Subaru', model: 'Forester', year: 2022, registration: 'KDG 707G', seats: 5, transmission: 'automatic', ratePerDay: 12500, status: 'booked' },
  { id: 'car-08', make: 'Toyota', model: 'Hiace', year: 2021, registration: 'KDH 808H', seats: 14, transmission: 'manual', ratePerDay: 16000, status: 'available' },
  { id: 'car-09', make: 'Toyota', model: 'Land Cruiser V8', year: 2022, registration: 'KDJ 909J', seats: 7, transmission: 'automatic', ratePerDay: 28000, status: 'available' },
  { id: 'car-10', make: 'Honda', model: 'Fit', year: 2020, registration: 'KDK 010K', seats: 5, transmission: 'automatic', ratePerDay: 4800, status: 'inactive' },
  { id: 'car-11', make: 'Mazda', model: 'CX-5', year: 2023, registration: 'KDL 111L', seats: 5, transmission: 'automatic', ratePerDay: 13000, status: 'available' },
  { id: 'car-12', make: 'Toyota', model: 'Fielder', year: 2021, registration: 'KDM 212M', seats: 5, transmission: 'automatic', ratePerDay: 7000, status: 'booked' },
]

const bookingStatuses: BookingStatus[] = [
  'pending', 'awaiting_approval', 'approved', 'confirmed', 'active', 'completed',
  'cancelled', 'rejected', 'overdue', 'draft', 'pending', 'awaiting_approval',
  'approved', 'confirmed', 'active', 'completed', 'cancelled', 'rejected', 'overdue', 'draft',
]

export const bookings: Booking[] = bookingStatuses.map((status, index) => {
  const day = String((index % 27) + 1).padStart(2, '0')
  const vehicle = vehicles[index % vehicles.length]
  return {
    id: `booking-${String(index + 1).padStart(2, '0')}`,
    reference: `AH-${String(2600 + index)}`,
    vehicleId: vehicle.id,
    customerId: users[index % users.length].id,
    status,
    pickupAt: `2026-11-${day}T06:00:00.000Z`,
    returnAt: `2026-11-${day}T15:00:00.000Z`,
    totalKes: vehicle.ratePerDay * ((index % 5) + 1),
  }
})