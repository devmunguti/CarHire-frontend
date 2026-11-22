import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, apiClient } from '../../api/client'
import { useRequestGuestExtension } from '../../api/queries'
import type { GuestCheckoutData, GuestBookingAccess, GuestBookingSummary } from '../../api/types'
import { Button, Checkbox, Input, PhoneInput, Skeleton } from '../../components/ui'
import { HoldCountdown } from './HoldCountdown'
import { PaymentStatus } from './PaymentStatus'
import { formatEat, formatKes, isKenyanPhone, maskKenyanPhone, normalisePhone } from '../../lib'
import { getCheckoutSteps, guestManageUrl, validateLicenceFile } from './checkoutModel'
import { compressImage } from '../../lib/image'

type GuestDetails = {
  name: string
  phone: string
  email: string
  idNumber: string
}

const initialDetails: GuestDetails = { name: '', phone: '', email: '', idNumber: '' }
const rentalRules = [
  'Return the vehicle at the agreed time and location.',
  'Only an authorised driver may operate the rental vehicle.',
  'Tell us promptly about delays, damage, or an incident.',
]

function getErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'We could not complete checkout. Please try again.'
}

function CheckoutPriceSummary({ data }: { data: GuestCheckoutData }) {
  const { booking, vehicle } = data
  return <aside aria-label="Price summary" className="guest-price-summary">
    <h2>Price summary</h2>
    {vehicle.imageUrl && <img alt={`${vehicle.make} ${vehicle.model}`} className="guest-price-summary__vehicle-image" src={vehicle.imageUrl} />}
    <p className="guest-price-summary__vehicle">{vehicle.make} {vehicle.model}<small>{vehicle.registration}</small></p>
    <dl>
      <div><dt>Pick-up</dt><dd>{formatEat(booking.pickupAt)}</dd></div>
      <div><dt>Return</dt><dd>{formatEat(booking.returnAt)}</dd></div>
      <div className="guest-price-summary__total"><dt>Total due</dt><dd>{formatKes(booking.totalKes)}</dd></div>
      {booking.pricingSnapshot && <div><dt>Refundable deposit</dt><dd>{formatKes(booking.pricingSnapshot.refundableDepositKes)}</dd></div>}
    </dl>
    <p className="guest-price-summary__secure"><ShieldCheck aria-hidden="true" size={17} />Your details are used only to manage this booking.</p>
  </aside>
}

function HoldExpired({ data }: { data?: GuestCheckoutData }) {
  const vehicleUrl = data
    ? `/vehicles?from=${encodeURIComponent(data.booking.pickupAt)}&to=${encodeURIComponent(data.booking.returnAt)}`
    : '/vehicles'
  return <section aria-labelledby="checkout-expired-title" className="guest-checkout-message guest-checkout-message--danger">
    <AlertTriangle aria-hidden="true" size={30} />
    <h1 id="checkout-expired-title">This booking hold has expired</h1>
    <p>Your selected vehicle is no longer being held. Search again to check availability for the same dates.</p>
    <Link className="button button--primary" to={vehicleUrl}>Find a car for these dates</Link>
  </section>
}

export function GuestCheckoutPage() {
  const { bookingId = '' } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState(initialDetails)
  const [licenceFile, setLicenceFile] = useState<File | null>(null)
  const [licenceError, setLicenceError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'mpesa_online' | 'cash'>('mpesa_online')
  const [access, setAccess] = useState<GuestBookingAccess | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const checkoutQuery = useQuery({
    queryKey: ['guest-checkout', bookingId],
    queryFn: () => apiClient.get<GuestCheckoutData>(`/bookings/${encodeURIComponent(bookingId)}/checkout`),
  })

  if (checkoutQuery.isLoading) return <div aria-label="Loading checkout" className="guest-checkout-loading" role="status"><Skeleton rows={5} /></div>
  if (checkoutQuery.error instanceof ApiError && checkoutQuery.error.code === 'HOLD_EXPIRED') return <HoldExpired data={checkoutQuery.data} />
  if (checkoutQuery.isError || !checkoutQuery.data) {
    return <section className="guest-checkout-message" role="alert"><h1>We could not find this booking</h1><p>Check the booking link or return to the vehicle search.</p><Link className="button button--secondary" to="/vehicles">Browse vehicles</Link></section>
  }

  const data = checkoutQuery.data
  const mode = data.booking.mode ?? 'self_drive'
  const steps = getCheckoutSteps(mode)
  const currentStep = steps[step]
  const isExpired = expired
  const isValidDetails = details.name.trim().length >= 2
    && isKenyanPhone(details.phone)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())
    && details.idNumber.trim().length >= 4
  const canContinue = currentStep === 'details'
    ? isValidDetails
    : currentStep === 'licence'
      ? Boolean(licenceFile) && !licenceError
      : currentStep === 'terms'
        ? termsAccepted && rulesAccepted
        : true

  function updateDetails(field: keyof GuestDetails, value: string) {
    setDetails((current) => ({ ...current, [field]: value }))
    setSubmitError(null)
  }

  function chooseLicence(file?: File) {
    setLicenceFile(file ?? null)
    setLicenceError(file ? validateLicenceFile(file) : 'Upload your driving licence to continue.')
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canContinue || isExpired) return
    setSubmitError(null)

    if (currentStep !== 'payment') {
      setStep((current) => current + 1)
      return
    }

    const formData = new FormData()
    formData.set('name', details.name.trim())
    formData.set('phone', normalisePhone(details.phone))
    formData.set('email', details.email.trim())
    formData.set('idNumber', details.idNumber.trim())
    formData.set('mode', mode)
    formData.set('paymentMethod', paymentMethod)
    formData.set('termsAccepted', String(termsAccepted))
    formData.set('rulesAccepted', String(rulesAccepted))
    try {
      if (licenceFile) formData.set('licence', await compressImage(licenceFile))
      const result = await apiClient.upload<GuestBookingAccess>(`/bookings/${encodeURIComponent(bookingId)}/checkout`, formData, () => undefined)
      await apiClient.post(`/bookings/${encodeURIComponent(result.booking.reference)}/guest`, { accessToken: result.accessToken })
      setAccess(result)
      if (paymentMethod === 'cash') navigate(guestManageUrl(result.booking.reference, true))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'HOLD_EXPIRED') setExpired(true)
      else setSubmitError(getErrorMessage(error))
    }
  }

  if (isExpired && !access) return <HoldExpired data={data} />

  if (access && paymentMethod === 'mpesa_online') {
    return <div className="guest-checkout-page">
      <div className="guest-checkout__hold"><HoldCountdown holdExpiresAt={data.booking.holdExpiresAt} onExpire={() => setExpired(true)} /></div>
      {isExpired && <HoldExpired data={data} />}
      <PaymentStatus
        amountDueKes={data.booking.totalKes}
        bookingId={data.booking.id}
        bookingReference={access.booking.reference}
        initialPhone={normalisePhone(details.phone)}
        onConfirmed={() => navigate(guestManageUrl(access.booking.reference, true))}
      />
    </div>
  }

  if (isExpired) return <HoldExpired data={data} />

  const currentStepLabel = currentStep === 'details' ? 'Your details' : currentStep === 'licence' ? 'Driving licence' : currentStep === 'terms' ? 'Terms and rental rules' : 'Payment method'

  return <div className="guest-checkout-page">
    <header className="guest-checkout-heading">
      <Link to={`/vehicles?from=${encodeURIComponent(data.booking.pickupAt)}&to=${encodeURIComponent(data.booking.returnAt)}`}><ArrowLeft aria-hidden="true" size={16} /> Back to vehicles</Link>
      <h1>Complete your booking</h1>
      <p>Guest checkout — no account needed.</p>
      <div className="guest-checkout__hold"><span>Vehicle held for you</span><HoldCountdown holdExpiresAt={data.booking.holdExpiresAt} onExpire={() => setExpired(true)} /></div>
    </header>

    <div className="guest-checkout-layout">
      <section aria-label={`Checkout step ${step + 1} of ${steps.length}: ${currentStepLabel}`} className="guest-checkout-card">
        <div aria-label="Checkout progress" className="guest-checkout-steps">
          {steps.map((key, index) => <span aria-current={index === step ? 'step' : undefined} className={index <= step ? 'is-active' : ''} key={key}><i>{index < step ? <Check aria-hidden="true" size={14} /> : index + 1}</i>{key === 'details' ? 'Your details' : key === 'licence' ? 'Driving licence' : key === 'terms' ? 'Terms' : 'Payment'}</span>)}
        </div>

        <form className="guest-checkout-form" noValidate onSubmit={(event) => void submitCheckout(event)}>
          {currentStep === 'details' && <section aria-labelledby="guest-details-title">
            <h2 id="guest-details-title">Your details</h2>
            <p>Tell us who will be responsible for this booking.</p>
            <div className="guest-checkout-form__fields">
              <Input autoComplete="name" label="Full name" onChange={(event) => updateDetails('name', event.target.value)} required value={details.name} />
              <PhoneInput label="Phone number" onChange={(value) => updateDetails('phone', value)} value={details.phone} />
              <Input autoComplete="email" label="Email address" onChange={(event) => updateDetails('email', event.target.value)} required type="email" value={details.email} />
              <Input autoComplete="off" label="National ID or passport" onChange={(event) => updateDetails('idNumber', event.target.value)} required value={details.idNumber} />
            </div>
          </section>}

          {currentStep === 'licence' && <section aria-labelledby="guest-licence-title">
            <h2 id="guest-licence-title">Driving licence</h2>
            <p>Upload a clear photo or scan. Accepted: JPG, PNG, WebP, or PDF up to 5 MB.</p>
            <label className="guest-file-upload">
              <span>{licenceFile ? licenceFile.name : 'Choose driving licence file'}</span>
              <input accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" aria-label="Driving licence upload" onChange={(event) => chooseLicence(event.target.files?.[0])} type="file" />
            </label>
            {licenceError && <p className="field__error" role="alert">{licenceError}</p>}
          </section>}

          {currentStep === 'terms' && <section aria-labelledby="guest-terms-title">
            <h2 id="guest-terms-title">Terms and rental rules</h2>
            <div className="guest-rental-rules"><h3>Before you set off</h3><ul>{rentalRules.map((rule) => <li key={rule}>{rule}</li>)}</ul><p>Changes and cancellations are subject to the cancellation policy shown before you confirm.</p></div>
            <Checkbox checked={termsAccepted} label="I agree to the booking terms and privacy notice." onChange={setTermsAccepted} />
            <Checkbox checked={rulesAccepted} label="I have read and agree to the rental rules." onChange={setRulesAccepted} />
          </section>}

          {currentStep === 'payment' && <section aria-labelledby="guest-payment-title">
            <h2 id="guest-payment-title">Payment method</h2>
            <p>Choose how you would like to complete this reservation.</p>
            <label className={`guest-payment-option${paymentMethod === 'mpesa_online' ? ' is-selected' : ''}`}><input checked={paymentMethod === 'mpesa_online'} name="payment-method" onChange={() => setPaymentMethod('mpesa_online')} type="radio" /><span><strong>M-Pesa STK push</strong><small>Pay securely from your phone.</small></span></label>
            <label className={`guest-payment-option${paymentMethod === 'cash' ? ' is-selected' : ''}`}><input checked={paymentMethod === 'cash'} name="payment-method" onChange={() => setPaymentMethod('cash')} type="radio" /><span><strong>Pay at branch</strong><small>Your booking will be marked pending approval.</small></span></label>
          </section>}

          {submitError && <p className="guest-checkout-error" role="alert">{submitError}</p>}
          <div className="guest-checkout-form__actions">
            {step > 0 && <Button onClick={() => setStep((current) => Math.max(0, current - 1))} variant="secondary">Back</Button>}
            <Button className="guest-checkout-form__continue" disabled={!canContinue} type="submit">{currentStep === 'payment' ? paymentMethod === 'cash' ? 'Request booking' : 'Continue to M-Pesa' : <>Continue <ArrowRight aria-hidden="true" size={17} /></>}</Button>
          </div>
        </form>
        <p className="guest-checkout-card__privacy"><ShieldCheck aria-hidden="true" size={16} />Your information is encrypted and handled securely.</p>
      </section>
      <CheckoutPriceSummary data={data} />
    </div>
  </div>
}

function GuestAccessError() {
  return <section className="guest-checkout-message" role="alert"><AlertTriangle aria-hidden="true" size={30} /><h1>Booking link unavailable</h1><p>We could not verify this booking link. It may be invalid or expired. No booking details have been displayed.</p><Link className="button button--secondary" to="/vehicles">Browse vehicles</Link></section>
}

function GuestBookingDetails({ access, onCancelled }: { access: GuestBookingSummary; onCancelled: (refundPending: boolean) => void }) {
  const { booking, vehicle } = access
  const [cancelPrompt, setCancelPrompt] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(booking.status === 'cancelled')
  const [isCancelling, setIsCancelling] = useState(false)
  const [extensionDate, setExtensionDate] = useState('')
  const [extensionReason, setExtensionReason] = useState('')
  const [extensionMessage, setExtensionMessage] = useState<string | null>(null)
  const [extensionError, setExtensionError] = useState<string | null>(null)
  const extensionMutation = useRequestGuestExtension(booking.reference)
  const canRequestExtension = !cancelled && ['checked_out', 'overdue'].includes(booking.status)
  const canCancel = !cancelled && access.cancellationAllowed && !['completed', 'cancelled'].includes(booking.status)
  const paidKes = (booking.payments ?? []).filter((payment) => payment.status === 'paid').reduce((total, payment) => total + payment.amountKes, 0)

  async function cancelBooking() {
    setIsCancelling(true)
    setCancelError(null)
    try {
      await apiClient.post(`/bookings/${encodeURIComponent(booking.reference)}/cancel`)
      setCancelled(true)
      setCancelPrompt(false)
      onCancelled(paidKes > 0)
    } catch {
      setCancelError('We could not cancel this booking. Please contact our team.')
    } finally {
      setIsCancelling(false)
    }
  }

  async function submitExtension(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setExtensionMessage(null)
    setExtensionError(null)
    const requestedReturnAt = new Date(extensionDate)
    if (!extensionDate || !Number.isFinite(requestedReturnAt.getTime()) || requestedReturnAt <= new Date(booking.returnAt)) {
      setExtensionError('Choose a return time later than the current booking return time.')
      return
    }
    try {
      await extensionMutation.mutateAsync({
        requestedReturnAt: requestedReturnAt.toISOString(),
        reason: extensionReason.trim(),
      })
      setExtensionDate('')
      setExtensionReason('')
      setExtensionMessage('Your request was sent. Our team will check availability and contact you about the next steps.')
    } catch (requestError) {
      setExtensionError(requestError instanceof ApiError ? requestError.message : 'We could not submit your extension request.')
    }
  }

  return <section aria-labelledby="guest-booking-title" className="guest-booking-card">
    <header><p>Manage your booking</p><h1 id="guest-booking-title">{booking.reference}</h1>
      {booking.pendingApproval && <span className="guest-booking-pending" role="status">Pending approval — our team will review your payment at the branch.</span>}
      {cancelled && <span className="guest-booking-cancelled" role="status">This booking has been cancelled.</span>}
    </header>
    <dl className="guest-booking-details">
      <div><dt>Vehicle</dt><dd>{vehicle.make} {vehicle.model} · {vehicle.registration}</dd></div>
      <div><dt>Pick-up (EAT)</dt><dd>{formatEat(booking.pickupAt)}</dd></div>
      <div><dt>Return (EAT)</dt><dd>{formatEat(booking.returnAt)}</dd></div>
      <div><dt>Booking total</dt><dd>{formatKes(booking.totalKes)}</dd></div>
      <div><dt>Amount paid</dt><dd>{formatKes(paidKes)}</dd></div>
      <div><dt>Contact phone</dt><dd>{booking.customerPhone ? maskKenyanPhone(booking.customerPhone) : '—'}</dd></div>
    </dl>
    <p className="guest-booking-policy">Cancellation is free at least 48 hours before pick-up. Within 48 hours, contact our team; late cancellation may incur charges.</p>
    {cancelPrompt && <div className="guest-cancel-confirm" role="group" aria-label="Confirm cancellation">
      <p>Cancel this booking? The policy above will apply.</p>
      <Button disabled={isCancelling} onClick={() => void cancelBooking()} variant="danger">{isCancelling ? 'Cancelling…' : 'Confirm cancellation'}</Button>
      <Button onClick={() => setCancelPrompt(false)} variant="secondary">Keep booking</Button>
    </div>}
    {cancelError && <p className="guest-checkout-error" role="alert">{cancelError}</p>}
    <div className="guest-booking-actions">
      {canCancel && !cancelPrompt && <Button onClick={() => setCancelPrompt(true)} variant="danger">Cancel booking</Button>}
    </div>
    {canRequestExtension && <section aria-labelledby="guest-extension-title" className="guest-extension-panel">
      <h2 id="guest-extension-title">Need more time?</h2>
      {access.extensionRequest
        ? <p role="status">Your extension request for {formatEat(access.extensionRequest.requestedReturnAt)} is awaiting staff review. Estimated additional charge: {formatKes(access.extensionRequest.feeKes ?? 0)}. This is not approved yet.</p>
        : <form className="stack stack--md" onSubmit={(event) => void submitExtension(event)}>
          <Input label="Requested new return date and time" min={new Date(booking.returnAt).toISOString().slice(0, 16)} onChange={(event) => setExtensionDate(event.target.value)} required type="datetime-local" value={extensionDate} />
          <label className="field"><span className="field__label">Reason</span><textarea className="control" maxLength={1000} onChange={(event) => setExtensionReason(event.target.value)} required value={extensionReason} /></label>
          <p>Submitting a request does not change your booking. Staff will check availability and confirm any additional offline payment before approving it.</p>
          {extensionError && <p className="field__error" role="alert">{extensionError}</p>}
          {extensionMessage && <p role="status">{extensionMessage}</p>}
          <Button disabled={extensionMutation.isPending} type="submit">{extensionMutation.isPending ? 'Sending…' : 'Request extension'}</Button>
        </form>}
    </section>}
    <section aria-label="Pickup instructions" className="guest-pickup-instructions"><h2>Pickup instructions</h2><p>Please bring your original driving licence and National ID or passport. Our team will confirm your pickup details before your trip.</p></section>
    <Link className="guest-booking-back" to="/">Return to Gari Poa</Link>
  </section>
}

export function GuestBookingPage({ confirmation = false }: { confirmation?: boolean }) {
  const { ref = '' } = useParams()
  const [cancelled, setCancelled] = useState(false)
  const [refundPending, setRefundPending] = useState(false)
  const guestQuery = useQuery({
    queryKey: ['guest-booking', ref],
    queryFn: () => apiClient.get<GuestBookingSummary>(`/bookings/${encodeURIComponent(ref)}/guest`),
    enabled: Boolean(ref),
    retry: false,
  })

  if (!ref) return <GuestAccessError />
  if (guestQuery.isLoading) return <div aria-label="Loading booking" className="guest-checkout-loading" role="status"><Skeleton rows={4} /></div>
  if (guestQuery.isError || !guestQuery.data) return <GuestAccessError />
  if (cancelled) return <section className="guest-checkout-message"><h1>Booking cancelled</h1><p>{refundPending ? 'Your eligible full refund is awaiting owner review and processing.' : 'Your cancellation request was processed.'}</p><Link className="button button--secondary" to="/">Return to Gari Poa</Link></section>

  const access = guestQuery.data
  const { booking } = access
  const paidKes = (booking.payments ?? []).filter((payment) => payment.status === 'paid').reduce((total, payment) => total + payment.amountKes, 0)
  const isPaid = booking.status === 'confirmed' || paidKes > 0

  return <div className="guest-confirmation-page">
    {confirmation && <header className="guest-confirmation-heading"><span aria-hidden="true"><Check size={23} /></span><p>{booking.pendingApproval ? 'Booking request received' : isPaid ? 'Payment confirmed' : 'Booking reserved'}</p><h1>{booking.pendingApproval ? 'Your booking is pending approval' : 'You’re all set'}</h1></header>}
    <GuestBookingDetails access={access} onCancelled={(hasRefund) => { setRefundPending(hasRefund); setCancelled(true) }} />
    {confirmation && <section className="guest-confirmation-notes">
      <h2>Deposit and pickup</h2>
      <p>The refundable security deposit is {formatKes(booking.pricingSnapshot?.refundableDepositKes ?? 0)}. It is returned after the vehicle is checked in, subject to the rental terms.</p>
      <p>Bring your original driving licence and National ID or passport to the branch. Your booking reference is <strong>{booking.reference}</strong>.</p>
      <p>Amount paid: <strong>{formatKes(paidKes)}</strong>{booking.pendingApproval ? ' · Pay at branch — pending approval' : ''}</p>
      <Link className="button button--primary" to={guestManageUrl(booking.reference)}>Manage this booking</Link>
    </section>}
  </div>
}
