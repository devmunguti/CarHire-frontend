import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CalendarPlus, CarFront, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  useCreateMaintenanceWindow,
  useCreateVehicle,
  useDeleteMaintenanceWindow,
  useMaintenanceWindows,
  useUpdateMaintenanceWindow,
  useUpdateVehicle,
  useUploadVehicleImage,
  useVehicles,
} from '../../api/queries'
import { ApiError } from '../../api/client'
import type {
  MaintenanceWindow,
  Vehicle,
  VehicleManagementStatus,
} from '../../api/types'
import { Button, ConfirmDialog, DataTable, DateTimeRangePicker, EmptyState, ErrorState, Input, Modal, Select, Skeleton, StatusChip, Toast } from '../../components/ui'
import { useAuth } from '../../hooks/AuthContext'
import { formatEat, formatKes } from '../../lib'

type VehicleForm = {
  make: string
  model: string
  category: string
  year: string
  registration: string
  seats: string
  transmission: Vehicle['transmission']
  ratePerDay: string
  status: VehicleManagementStatus
}

type MaintenanceForm = {
  vehicleId: string
  startAt: string
  endAt: string
  reason: string
}

const blankVehicle: VehicleForm = {
  make: '',
  model: '',
  category: '',
  year: String(new Date().getFullYear()),
  registration: '',
  seats: '5',
  transmission: 'automatic',
  ratePerDay: '',
  status: 'available',
}

function vehicleFormFrom(vehicle: Vehicle): VehicleForm {
  return {
    make: vehicle.make,
    model: vehicle.model,
    category: vehicle.category ?? '',
    year: String(vehicle.year),
    registration: vehicle.registration,
    seats: String(vehicle.seats),
    transmission: vehicle.transmission,
    ratePerDay: String(vehicle.ratePerDay),
    status: vehicle.status === 'booked' ? 'available' : vehicle.status,
  }
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message
  return 'The request could not be completed. Please try again.'
}

function localRange() {
  return {
    startUtc: new Date(Date.now() - 86_400_000).toISOString(),
    endUtc: new Date(Date.now() + 366 * 86_400_000).toISOString(),
  }
}

export function FleetPage() {
  const { user } = useAuth()
  const vehiclesQuery = useVehicles()
  const [range] = useState(localRange)
  const maintenanceQuery = useMaintenanceWindows(range.startUtc, range.endUtc)
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const uploadVehicleImage = useUploadVehicleImage()
  const createWindow = useCreateMaintenanceWindow()
  const updateWindow = useUpdateMaintenanceWindow()
  const deleteWindow = useDeleteMaintenanceWindow()
  const [vehicleDialog, setVehicleDialog] = useState<Vehicle | 'new' | null>(null)
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(blankVehicle)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const imagePreviewUrlRef = useRef<string | null>(null)
  const [windowDialog, setWindowDialog] = useState<MaintenanceWindow | 'new' | null>(null)
  const [windowForm, setWindowForm] = useState<MaintenanceForm>({
    vehicleId: '',
    startAt: range.startUtc,
    endAt: range.endUtc,
    reason: '',
  })
  const [pendingDelete, setPendingDelete] = useState<MaintenanceWindow | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const canManage = user?.role === 'owner' || user?.role === 'manager'
  const vehicles = vehiclesQuery.data ?? []
  const windows = maintenanceQuery.data ?? []

  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current)
    }
  }, [])

  function clearImageSelection() {
    if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current)
    imagePreviewUrlRef.current = null
    setImageFile(null)
    setImagePreviewUrl(null)
  }

  function openVehicle(vehicle: Vehicle | 'new') {
    setVehicleDialog(vehicle)
    setVehicleForm(vehicle === 'new' ? blankVehicle : vehicleFormFrom(vehicle))
    clearImageSelection()
    setFormError(null)
  }

  function closeVehicle() {
    setVehicleDialog(null)
    clearImageSelection()
    setFormError(null)
  }

  async function submitVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const request = {
      make: vehicleForm.make.trim(),
      model: vehicleForm.model.trim(),
      category: vehicleForm.category.trim() || undefined,
      year: Number(vehicleForm.year),
      registration: vehicleForm.registration.trim().toUpperCase(),
      seats: Number(vehicleForm.seats),
      transmission: vehicleForm.transmission,
      ratePerDay: Number(vehicleForm.ratePerDay),
      status: vehicleForm.status,
    }
    if (!request.make || !request.model || !request.registration
      || !Number.isInteger(request.year) || !Number.isInteger(request.seats)
      || !Number.isSafeInteger(request.ratePerDay) || request.ratePerDay < 0) {
      setFormError('Enter valid vehicle details and a whole-number daily rate.')
      return
    }
    setFormError(null)
    let createdVehicle = false
    try {
      let savedVehicle: Vehicle
      if (vehicleDialog === 'new') {
        savedVehicle = await createVehicle.mutateAsync(request)
        createdVehicle = true
        setVehicleDialog(savedVehicle)
        setVehicleForm(vehicleFormFrom(savedVehicle))
      } else if (vehicleDialog) {
        savedVehicle = await updateVehicle.mutateAsync({ id: vehicleDialog.id, request })
      } else {
        return
      }
      if (imageFile) await uploadVehicleImage.mutateAsync({ id: savedVehicle.id, file: imageFile })
      setToast(vehicleDialog === 'new' ? 'Vehicle added to the fleet.' : 'Vehicle details updated.')
      closeVehicle()
    } catch (error) {
      setFormError(createdVehicle
        ? `Vehicle saved, but its image could not be uploaded: ${errorMessage(error)} Select Save again to retry the image upload.`
        : errorMessage(error))
    }
  }

  async function changeStatus(vehicle: Vehicle, status: VehicleManagementStatus) {
    try {
      await updateVehicle.mutateAsync({ id: vehicle.id, request: { status } })
      setToast(`${vehicle.registration} status updated.`)
    } catch (error) {
      setToast(errorMessage(error))
    }
  }

  function openWindow(window: MaintenanceWindow | 'new') {
    setWindowDialog(window)
    setWindowForm(window === 'new' ? {
      vehicleId: vehicles.find((vehicle) => vehicle.status !== 'inactive')?.id ?? '',
      startAt: range.startUtc,
      endAt: range.endUtc,
      reason: '',
    } : {
      vehicleId: window.vehicleId,
      startAt: window.startAt,
      endAt: window.endAt,
      reason: window.reason,
    })
    setFormError(null)
  }

  async function submitWindow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!windowForm.vehicleId || !windowForm.startAt || !windowForm.endAt
      || Date.parse(windowForm.endAt) <= Date.parse(windowForm.startAt)
      || !windowForm.reason.trim()) {
      setFormError('Choose a vehicle, a valid time range, and a reason.')
      return
    }
    setFormError(null)
    try {
      const request = {
        vehicleId: windowForm.vehicleId,
        startAt: windowForm.startAt,
        endAt: windowForm.endAt,
        reason: windowForm.reason.trim(),
      }
      if (windowDialog === 'new') {
        await createWindow.mutateAsync(request)
        setToast('Maintenance window scheduled.')
      } else if (windowDialog) {
        await updateWindow.mutateAsync({
          id: windowDialog.id,
          request: { startAt: request.startAt, endAt: request.endAt, reason: request.reason },
        })
        setToast('Maintenance window updated.')
      }
      setWindowDialog(null)
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  async function confirmDeleteWindow() {
    if (!pendingDelete) return
    try {
      await deleteWindow.mutateAsync(pendingDelete.id)
      setToast('Maintenance window removed.')
      setPendingDelete(null)
    } catch (error) {
      setToast(errorMessage(error))
      setPendingDelete(null)
    }
  }

  if (vehiclesQuery.isLoading) return <Skeleton rows={5} />
  if (vehiclesQuery.isError) {
    return <ErrorState onRetry={() => void vehiclesQuery.refetch()} retryLabel="Retry" title="Fleet could not be loaded" />
  }

  const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))
  const currentImageUrl = vehicleDialog && vehicleDialog !== 'new' ? vehicleDialog.imageUrl : undefined

  return (
    <section className="fleet-management-page">
      <header className="operations-page-header">
        <div><p className="eyebrow">Operations</p><h2>Fleet management</h2></div>
        {canManage && <Button onClick={() => openVehicle('new')}><Plus aria-hidden="true" size={17} />Add vehicle</Button>}
      </header>

      <section aria-label="Vehicles" className="fleet-management-panel">
        <header className="fleet-management-panel__header"><div><h3>Vehicles</h3><span>{vehicles.length} vehicles</span></div></header>
        <DataTable
          columns={[
            { key: 'image', header: 'Image', render: (vehicle: Vehicle) => vehicle.imageUrl
              ? <img alt={`${vehicle.make} ${vehicle.model}`} className="fleet-vehicle-image" src={vehicle.imageUrl} />
              : <span aria-label="No vehicle image" className="fleet-vehicle-image fleet-vehicle-image--empty"><CarFront aria-hidden="true" size={20} /></span> },
            { key: 'vehicle', header: 'Vehicle', render: (vehicle: Vehicle) => <span className="fleet-vehicle-name"><strong>{vehicle.make} {vehicle.model}</strong><small>{vehicle.year}{vehicle.category ? ` · ${vehicle.category}` : ''}</small></span> },
            { key: 'registration', header: 'Registration', render: (vehicle: Vehicle) => vehicle.registration },
            { key: 'specs', header: 'Capacity', render: (vehicle: Vehicle) => `${vehicle.seats} seats · ${vehicle.transmission}` },
            { key: 'rate', header: 'Daily rate', render: (vehicle: Vehicle) => formatKes(vehicle.ratePerDay) },
            { key: 'status', header: 'Status', render: (vehicle: Vehicle) => canManage && vehicle.status !== 'booked'
              ? <Select aria-label={`Status for ${vehicle.registration}`} label="" onChange={(event) => void changeStatus(vehicle, event.target.value as VehicleManagementStatus)} options={[
                { value: 'available', label: 'Available' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'inactive', label: 'Inactive' },
              ]} value={vehicle.status} />
              : <StatusChip status={vehicle.status} variant="vehicle" /> },
            { key: 'actions', header: 'Actions', render: (vehicle: Vehicle) => canManage
              ? <Button aria-label={`Edit ${vehicle.registration}`} onClick={() => openVehicle(vehicle)} size="sm" variant="secondary"><Pencil aria-hidden="true" size={15} />Edit</Button>
              : '—' },
          ]}
          empty={<EmptyState action={canManage ? <Button onClick={() => openVehicle('new')}><Plus size={16} />Add vehicle</Button> : undefined} description="Vehicles added to the fleet will appear here." title="No vehicles yet" />}
          rowKey={(vehicle) => vehicle.id}
          rows={vehicles}
        />
      </section>

      <section aria-label="Maintenance windows" className="fleet-management-panel">
        <header className="fleet-management-panel__header">
          <div><h3>Maintenance schedule</h3><span>Upcoming and current windows</span></div>
          {canManage && <Button onClick={() => openWindow('new')} variant="secondary"><CalendarPlus aria-hidden="true" size={17} />Schedule maintenance</Button>}
        </header>
        {maintenanceQuery.isLoading && <Skeleton rows={3} />}
        {maintenanceQuery.isError && <ErrorState onRetry={() => void maintenanceQuery.refetch()} retryLabel="Retry" title="Maintenance schedule could not be loaded" />}
        {!maintenanceQuery.isLoading && !maintenanceQuery.isError && <DataTable
          columns={[
            { key: 'vehicle', header: 'Vehicle', render: (window: MaintenanceWindow) => {
              const vehicle = vehicleById.get(window.vehicleId)
              return vehicle ? `${vehicle.registration} · ${vehicle.make} ${vehicle.model}` : window.vehicleId
            } },
            { key: 'period', header: 'Time (EAT)', render: (window: MaintenanceWindow) => `${formatEat(window.startAt)} – ${formatEat(window.endAt)}` },
            { key: 'reason', header: 'Reason', render: (window: MaintenanceWindow) => window.reason },
            { key: 'actions', header: 'Actions', render: (window: MaintenanceWindow) => canManage
              ? <span className="fleet-row-actions">
                <Button aria-label={`Edit maintenance for ${window.reason}`} onClick={() => openWindow(window)} size="sm" variant="secondary"><Pencil aria-hidden="true" size={15} />Edit</Button>
                <Button aria-label={`Delete maintenance for ${window.reason}`} onClick={() => setPendingDelete(window)} size="sm" variant="danger"><Trash2 aria-hidden="true" size={15} /></Button>
              </span>
              : '—' },
          ]}
          empty={<EmptyState description="Scheduled maintenance windows will appear here." title="No maintenance scheduled" />}
          rowKey={(window) => window.id}
          rows={windows}
        />}
      </section>

      <Modal open={vehicleDialog !== null} title={vehicleDialog === 'new' ? 'Add vehicle' : 'Edit vehicle'} onClose={closeVehicle}>
        <form className="fleet-form" onSubmit={(event) => void submitVehicle(event)}>
          <Input label="Make" maxLength={100} onChange={(event) => setVehicleForm({ ...vehicleForm, make: event.target.value })} required value={vehicleForm.make} />
          <Input label="Model" maxLength={100} onChange={(event) => setVehicleForm({ ...vehicleForm, model: event.target.value })} required value={vehicleForm.model} />
          <Input label="Category" maxLength={50} onChange={(event) => setVehicleForm({ ...vehicleForm, category: event.target.value })} value={vehicleForm.category} />
          <Input label="Year" max={new Date().getFullYear() + 1} min={1900} onChange={(event) => setVehicleForm({ ...vehicleForm, year: event.target.value })} required type="number" value={vehicleForm.year} />
          <Input label="Registration" maxLength={20} onChange={(event) => setVehicleForm({ ...vehicleForm, registration: event.target.value })} required value={vehicleForm.registration} />
          <Input label="Seats" max={100} min={1} onChange={(event) => setVehicleForm({ ...vehicleForm, seats: event.target.value })} required type="number" value={vehicleForm.seats} />
          <Select label="Transmission" onChange={(event) => setVehicleForm({ ...vehicleForm, transmission: event.target.value as Vehicle['transmission'] })} options={[{ value: 'automatic', label: 'Automatic' }, { value: 'manual', label: 'Manual' }]} value={vehicleForm.transmission} />
          <Input label="Daily rate (KES)" min={0} onChange={(event) => setVehicleForm({ ...vehicleForm, ratePerDay: event.target.value })} required type="number" value={vehicleForm.ratePerDay} />
          <label className="field">
            <span className="field__label">Vehicle image</span>
            <span className="fleet-image-picker">
              <ImagePlus aria-hidden="true" size={18} />
              <span>{imageFile?.name ?? (currentImageUrl ? 'Choose a replacement image' : 'Choose an image')}</span>
              <input accept="image/jpeg,image/png,image/webp" aria-label="Vehicle image" onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
                  clearImageSelection()
                  setFormError('Choose a JPEG, PNG, or WebP image up to 5 MiB.')
                  event.target.value = ''
                  return
                }
                setFormError(null)
                if (imagePreviewUrlRef.current) URL.revokeObjectURL(imagePreviewUrlRef.current)
                imagePreviewUrlRef.current = URL.createObjectURL(file)
                setImagePreviewUrl(imagePreviewUrlRef.current)
                setImageFile(file)
              }} type="file" />
            </span>
            <span className="field__hint">JPEG, PNG, or WebP; maximum 5 MiB. Images are stored on Cloudinary.</span>
          </label>
          {(imagePreviewUrl || currentImageUrl) && <img
            alt="Vehicle image preview"
            className="fleet-image-preview"
            src={imagePreviewUrl ?? currentImageUrl}
          />}
          <Select label="Status" onChange={(event) => setVehicleForm({ ...vehicleForm, status: event.target.value as VehicleManagementStatus })} options={[
            { value: 'available', label: 'Available' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'inactive', label: 'Inactive' },
          ]} value={vehicleForm.status} />
          {vehicleForm.status === 'inactive' && <p className="fleet-form__hint">Inactive vehicles are retained for booking history and cannot be reserved.</p>}
          {formError && <p className="field__error" role="alert">{formError}</p>}
          <div className="fleet-form__actions">
            <Button onClick={closeVehicle} variant="secondary"><X size={16} />Cancel</Button>
            <Button disabled={createVehicle.isPending || updateVehicle.isPending || uploadVehicleImage.isPending} type="submit">{createVehicle.isPending || updateVehicle.isPending || uploadVehicleImage.isPending ? 'Saving…' : 'Save vehicle'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={windowDialog !== null} title={windowDialog === 'new' ? 'Schedule maintenance' : 'Edit maintenance'} onClose={() => setWindowDialog(null)}>
        <form className="fleet-form fleet-form--maintenance" onSubmit={(event) => void submitWindow(event)}>
          <Select disabled={windowDialog !== 'new'} label="Vehicle" onChange={(event) => setWindowForm({ ...windowForm, vehicleId: event.target.value })} options={[
            { value: '', label: 'Choose a vehicle' },
            ...vehicles.filter((vehicle) => vehicle.status !== 'inactive').map((vehicle) => ({ value: vehicle.id, label: `${vehicle.registration} · ${vehicle.make} ${vehicle.model}` })),
          ]} value={windowForm.vehicleId} />
          <DateTimeRangePicker endUtc={windowForm.endAt} label="Maintenance period (EAT)" onChange={(next) => setWindowForm({ ...windowForm, ...next })} startUtc={windowForm.startAt} />
          <Input label="Reason" maxLength={1000} onChange={(event) => setWindowForm({ ...windowForm, reason: event.target.value })} required value={windowForm.reason} />
          {formError && <p className="field__error" role="alert">{formError}</p>}
          <div className="fleet-form__actions">
            <Button onClick={() => setWindowDialog(null)} variant="secondary"><X size={16} />Cancel</Button>
            <Button disabled={createWindow.isPending || updateWindow.isPending} type="submit">{createWindow.isPending || updateWindow.isPending ? 'Saving…' : 'Save schedule'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        cancelLabel="Keep window"
        confirmLabel="Remove window"
        description={pendingDelete ? `Remove the maintenance window “${pendingDelete.reason}”?` : ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDeleteWindow()}
        open={pendingDelete !== null}
        title="Remove maintenance"
      />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </section>
  )
}
