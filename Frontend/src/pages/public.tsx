import { useMemo, useState, type FormEvent } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, CarFront, Users } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAvailableVehicles, useCreateGuestHold, useVehicle, useVehicles } from '../api/queries'
import type { GuestHoldRequest, Vehicle } from '../api/types'
import { Button, EmptyState, ErrorState, Input, Select, Skeleton } from '../components/ui'
import { formatKes } from '../lib'

function localDateTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function detailUrl(vehicleId: string, searchParams: URLSearchParams) {
  const query = searchParams.toString()
  return `/vehicles/${encodeURIComponent(vehicleId)}${query ? `?${query}` : ''}`
}

function VehicleCard({ vehicle, searchParams }: { vehicle: Vehicle; searchParams: URLSearchParams }) {
  return <article className="public-vehicle-card">
    <Link aria-label={`View ${vehicle.make} ${vehicle.model}`} className="public-vehicle-card__image" to={detailUrl(vehicle.id, searchParams)}>
      {vehicle.imageUrl ? <img alt={`${vehicle.make} ${vehicle.model}`} loading="lazy" src={vehicle.imageUrl} /> : <CarFront aria-hidden="true" size={54} />}
    </Link>
    <div className="public-vehicle-card__body">
      <div className="public-vehicle-card__heading"><div><p>{vehicle.category ?? 'Rental vehicle'}</p><h2>{vehicle.make} {vehicle.model}</h2></div><strong>{formatKes(vehicle.ratePerDay)}<small> / day</small></strong></div>
      <ul className="public-vehicle-card__specs">
        <li><Users aria-hidden="true" size={15} />{vehicle.seats} seats</li>
        <li>{vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'}</li>
        <li>{vehicle.year}</li>
      </ul>
      <Link className="button button--primary public-vehicle-card__link" to={detailUrl(vehicle.id, searchParams)}>View details <ArrowRight aria-hidden="true" size={16} /></Link>
    </div>
  </article>
}

export function VehiclesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const vehiclesQuery = useVehicles()
  const availableQuery = useAvailableVehicles(from, to)
  const source = from && to ? availableQuery : vehiclesQuery
  const vehicles = useMemo(() => source.data ?? [], [source.data])
  const [search, setSearch] = useState('')
  const category = searchParams.get('category') ?? ''
  const categories = [...new Set(vehicles.map((vehicle) => vehicle.category).filter((value): value is string => Boolean(value)))].sort()
  const filteredVehicles = useMemo(() => vehicles.filter((vehicle) => (
    vehicle.status !== 'inactive'
    && (category === '' || vehicle.category === category)
    && `${vehicle.make} ${vehicle.model} ${vehicle.category ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
  )), [category, search, vehicles])

  function updateCategory(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('category', value)
    else next.delete('category')
    setSearchParams(next)
  }

  return <main className="public-vehicles page-shell">
    <header className="public-vehicles__header">
      <div><p className="eyebrow">Explore the fleet</p><h1>Find your next ride</h1><p>Choose a vehicle and continue to a secure guest booking.</p></div>
      <Link className="button button--secondary" to="/">Back to search</Link>
    </header>
    <section aria-label="Filter vehicles" className="public-vehicle-filters">
      <Input label="Search" onChange={(event) => setSearch(event.target.value)} placeholder="Make, model or category" value={search} />
      <Select label="Vehicle type" onChange={(event) => updateCategory(event.target.value)} options={[{ value: '', label: 'All types' }, ...categories.map((value) => ({ value, label: value }))]} value={category} />
      {(from || to) && <p className="public-vehicle-filters__dates">Showing vehicles available for your selected dates.</p>}
    </section>
    {source.isLoading && <div aria-label="Loading vehicles" className="public-vehicle-grid"><Skeleton rows={3} /></div>}
    {source.isError && <ErrorState onRetry={() => void source.refetch()} retryLabel="Retry" title="Vehicles could not be loaded" />}
    {!source.isLoading && !source.isError && filteredVehicles.length === 0 && <EmptyState description={from && to ? 'Try another date range or broaden your search.' : 'Try a different search or check back soon.'} title="No vehicles match your search" />}
    {!source.isLoading && !source.isError && filteredVehicles.length > 0 && <div className="public-vehicle-grid">{filteredVehicles.map((vehicle) => <VehicleCard key={vehicle.id} searchParams={searchParams} vehicle={vehicle} />)}</div>}
  </main>
}

function bookingErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'VEHICLE_UNAVAILABLE') return 'This vehicle was just reserved for those dates. Choose another vehicle or try different dates.'
    if (error.code === 'PAYMENT_PROVIDER_UNAVAILABLE') return 'Online payment is not configured. Please contact us to complete your booking.'
    return error.message
  }
  return 'We could not start this booking. Please try again.'
}

export function VehicleDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const vehicleQuery = useVehicle(id)
  const createHold = useCreateGuestHold()
  const [pickupAt, setPickupAt] = useState(() => localDateTime(searchParams.get('from') ?? ''))
  const [returnAt, setReturnAt] = useState(() => localDateTime(searchParams.get('to') ?? ''))
  const [pickupLocation, setPickupLocation] = useState(searchParams.get('pickup') ?? 'Nairobi')
  const [mode, setMode] = useState<GuestHoldRequest['mode']>('self_drive')
  const [driverLocation, setDriverLocation] = useState<'in_town' | 'upcountry'>('in_town')
  const [formError, setFormError] = useState<string | null>(null)
  const vehicle = vehicleQuery.data

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    if (!vehicle) return
    const start = new Date(pickupAt)
    const end = new Date(returnAt)
    if (!pickupAt || !returnAt || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      setFormError('Choose a pick-up and return date.')
      return
    }
    if (start.getTime() <= Date.now() || end <= start) {
      setFormError('Pick-up must be in the future and return must follow pick-up.')
      return
    }
    if (!pickupLocation.trim()) {
      setFormError('Enter a pick-up location.')
      return
    }
    try {
      const request: GuestHoldRequest = {
        vehicleId: vehicle.id,
        pickupAt: start.toISOString(),
        returnAt: end.toISOString(),
        pickupLocation: pickupLocation.trim(),
        mode,
        ...(mode === 'chauffeur' ? { driverLocation } : {}),
        extras: [],
      }
      const hold = await createHold.mutateAsync(request)
      navigate(`/checkout/${encodeURIComponent(hold.bookingId)}`)
    } catch (error) {
      setFormError(bookingErrorMessage(error))
    }
  }

  if (vehicleQuery.isLoading) return <div aria-label="Loading vehicle" className="page-shell"><Skeleton rows={4} /></div>
  if (vehicleQuery.isError || !vehicle) return <main className="page-shell"><ErrorState onRetry={() => void vehicleQuery.refetch()} retryLabel="Retry" title="Vehicle could not be loaded" /></main>

  return <main className="public-vehicle-detail page-shell">
    <Link className="public-vehicle-detail__back" to={`/vehicles${searchParams.size ? `?${searchParams.toString()}` : ''}`}><ArrowLeft aria-hidden="true" size={16} /> Back to vehicles</Link>
    <div className="public-vehicle-detail__layout">
      <section className="public-vehicle-detail__main">
        <div className="public-vehicle-detail__image">
          {vehicle.imageUrl ? <img alt={`${vehicle.make} ${vehicle.model}`} src={vehicle.imageUrl} /> : <CarFront aria-hidden="true" size={88} />}
        </div>
        <header className="public-vehicle-detail__heading"><div><p className="eyebrow">{vehicle.category ?? 'Rental vehicle'} · {vehicle.year}</p><h1>{vehicle.make} {vehicle.model}</h1></div><strong>{formatKes(vehicle.ratePerDay)}<small> per day</small></strong></header>
        {vehicle.status === 'inactive' && <p className="public-booking-unavailable" role="status"><AlertTriangle aria-hidden="true" size={18} /> This vehicle is currently unavailable for booking.</p>}
        <ul className="public-vehicle-specs">
          <li><Users aria-hidden="true" size={20} /><span><b>{vehicle.seats} seats</b><small>Passenger capacity</small></span></li>
          <li><CarFront aria-hidden="true" size={20} /><span><b>{vehicle.transmission === 'automatic' ? 'Automatic' : 'Manual'}</b><small>Transmission</small></span></li>
          <li><span className="public-vehicle-specs__year">{vehicle.year}</span><span><b>{vehicle.category ?? 'Rental vehicle'}</b><small>Vehicle category</small></span></li>
        </ul>
        <div className="public-vehicle-detail__notice"><p>Prices are calculated by the server based on your dates and rental options. Your vehicle is reserved for 15 minutes while you complete checkout.</p></div>
      </section>

      <section aria-labelledby="public-booking-title" className="public-booking-card">
        <h2 id="public-booking-title">Reserve this vehicle</h2>
        <p>Start a guest booking — no account required.</p>
        <form className="stack stack--md" onSubmit={(event) => void submit(event)}>
          <Input label="Pick-up date and time" min={new Date().toISOString().slice(0, 16)} onChange={(event) => setPickupAt(event.target.value)} required type="datetime-local" value={pickupAt} />
          <Input label="Return date and time" min={pickupAt || new Date().toISOString().slice(0, 16)} onChange={(event) => setReturnAt(event.target.value)} required type="datetime-local" value={returnAt} />
          <Input label="Pick-up location" onChange={(event) => setPickupLocation(event.target.value)} required value={pickupLocation} />
          <Select label="Rental mode" onChange={(event) => setMode(event.target.value as GuestHoldRequest['mode'])} options={[{ value: 'self_drive', label: 'Self drive' }, { value: 'chauffeur', label: 'With a chauffeur' }]} value={mode} />
          {mode === 'chauffeur' && <Select label="Chauffeur destination" onChange={(event) => setDriverLocation(event.target.value as typeof driverLocation)} options={[{ value: 'in_town', label: 'In town' }, { value: 'upcountry', label: 'Upcountry' }]} value={driverLocation} />}
          {formError && <p className="field__error" role="alert">{formError}</p>}
          <Button disabled={createHold.isPending || vehicle.status === 'inactive'} type="submit">{createHold.isPending ? 'Reserving…' : 'Continue to checkout'} <ArrowRight aria-hidden="true" size={17} /></Button>
        </form>
        <small>Final price and availability are confirmed before your hold is created.</small>
      </section>
    </div>
  </main>
}
