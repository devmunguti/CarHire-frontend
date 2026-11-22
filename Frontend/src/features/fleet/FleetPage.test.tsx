import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MaintenanceWindow, Vehicle } from '../../api/types'
import { FleetPage } from './FleetPage'

const mocks = vi.hoisted(() => ({
  createMaintenance: vi.fn(),
  createVehicle: vi.fn(),
  deleteMaintenance: vi.fn(),
  updateMaintenance: vi.fn(),
  updateVehicle: vi.fn(),
  uploadVehicleImage: vi.fn(),
}))

vi.mock('../../hooks/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'manager-1', role: 'manager' } }),
}))

vi.mock('../../api/queries', () => ({
  useVehicles: () => ({ data: [vehicle], isLoading: false, isError: false, refetch: vi.fn() }),
  useMaintenanceWindows: () => ({ data: [windowFixture], isLoading: false, isError: false, refetch: vi.fn() }),
  useCreateVehicle: () => ({ mutateAsync: mocks.createVehicle, isPending: false }),
  useUpdateVehicle: () => ({ mutateAsync: mocks.updateVehicle, isPending: false }),
  useUploadVehicleImage: () => ({ mutateAsync: mocks.uploadVehicleImage, isPending: false }),
  useCreateMaintenanceWindow: () => ({ mutateAsync: mocks.createMaintenance, isPending: false }),
  useUpdateMaintenanceWindow: () => ({ mutateAsync: mocks.updateMaintenance, isPending: false }),
  useDeleteMaintenanceWindow: () => ({ mutateAsync: mocks.deleteMaintenance, isPending: false }),
}))

vi.mock('../../api/client', () => ({
  ApiError: class ApiError extends Error {},
}))

const vehicle: Vehicle = {
  id: 'vehicle-1',
  make: 'Toyota',
  model: 'Prado TX',
  category: 'SUV',
  year: 2023,
  registration: 'KDA 101A',
  seats: 7,
  transmission: 'automatic',
  ratePerDay: 18000,
  status: 'available',
}

const windowFixture: MaintenanceWindow = {
  id: 'maintenance-1',
  vehicleId: vehicle.id,
  startAt: '2026-11-24T06:00:00.000Z',
  endAt: '2026-11-24T12:00:00.000Z',
  reason: 'Scheduled service',
}

describe('FleetPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createVehicle.mockResolvedValue(vehicle)
    mocks.updateVehicle.mockResolvedValue(vehicle)
    mocks.uploadVehicleImage.mockResolvedValue(vehicle)
    mocks.createMaintenance.mockResolvedValue(windowFixture)
    mocks.updateMaintenance.mockResolvedValue(windowFixture)
    mocks.deleteMaintenance.mockResolvedValue({ deleted: true })
  })

  it('loads API-backed fleet and maintenance records and edits a vehicle', async () => {
    render(<FleetPage />)

    expect(screen.getByText('KDA 101A')).toBeInTheDocument()
    expect(screen.getByText('Scheduled service')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit KDA 101A' }))
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'Land Cruiser' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save vehicle' }))

    await waitFor(() => expect(mocks.updateVehicle).toHaveBeenCalledWith({
      id: vehicle.id,
      request: expect.objectContaining({ model: 'Land Cruiser' }),
    }))
  })

  it('creates a vehicle and changes its operator-set status', async () => {
    render(<FleetPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Add vehicle' }))
    fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'Honda' } })
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'Fit' } })
    fireEvent.change(screen.getByLabelText('Registration'), { target: { value: 'KDF 654A' } })
    fireEvent.change(screen.getByLabelText('Daily rate (KES)'), { target: { value: '6500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save vehicle' }))

    await waitFor(() => expect(mocks.createVehicle).toHaveBeenCalledWith(expect.objectContaining({
      make: 'Honda',
      model: 'Fit',
      registration: 'KDF 654A',
    })))

    fireEvent.change(screen.getByRole('combobox', { name: 'Status for KDA 101A' }), { target: { value: 'maintenance' } })
    await waitFor(() => expect(mocks.updateVehicle).toHaveBeenCalledWith({
      id: vehicle.id,
      request: { status: 'maintenance' },
    }))
  })

  it('uploads a selected image for the vehicle and refreshes the fleet record', async () => {
    render(<FleetPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit KDA 101A' }))
    const image = new File([new Uint8Array([1, 2, 3])], 'prado.webp', { type: 'image/webp' })
    fireEvent.change(screen.getByLabelText('Vehicle image'), { target: { files: [image] } })
    fireEvent.click(screen.getByRole('button', { name: 'Save vehicle' }))

    await waitFor(() => expect(mocks.uploadVehicleImage).toHaveBeenCalledWith({
      id: vehicle.id,
      file: image,
    }))
    expect(await screen.findByText('Vehicle details updated.')).toBeVisible()
  })

  it('creates a maintenance window through the API mutation', async () => {
    render(<FleetPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Schedule maintenance' }))
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Brake inspection' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save schedule' }))

    await waitFor(() => expect(mocks.createMaintenance).toHaveBeenCalledWith(expect.objectContaining({
      vehicleId: vehicle.id,
      reason: 'Brake inspection',
    })))
  })
})
