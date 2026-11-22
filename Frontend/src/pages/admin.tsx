import { useState, type FormEvent } from 'react'
import { Button, ConfirmDialog, DataTable, ErrorState, Input, Modal, Select, Skeleton, Toast } from '../components/ui'
import { useAuth } from '../hooks/AuthContext'
import { canApproveBooking } from '../hooks/useCan'
import { useTranslation } from '../i18n'
import {
  useApproveOfflinePayment,
  useAuditEntries,
  useInviteStaff,
  usePendingApprovals,
  useStaff,
  useUpdateStaff,
} from '../api/queries'
import type { AuditEntry, Booking, OfflineApprovalRequest, StaffInvitationRequest, StaffMember, UserRole } from '../api/types'
import { DashboardPage as DashboardViewPage } from '../features/dashboard/DashboardPage'
import { PagePlaceholder } from './PagePlaceholder'

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa_manual', label: 'M-Pesa Manual' },
  { value: 'bank', label: 'Bank EFT' },
  { value: 'corporate', label: 'Corporate Credit' },
] as const

const roleOptions = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'agent', label: 'Agent' },
  { value: 'driver', label: 'Driver' },
  { value: 'mechanic', label: 'Mechanic' },
] as const

function formatTime(value: string | undefined, showDate = true) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    dateStyle: showDate ? 'medium' : undefined,
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatAge(value: string | undefined) {
  if (!value) return '—'
  const diffMs = Date.now() - new Date(value).getTime()
  const hours = Math.max(0, Math.floor(diffMs / (60 * 60 * 1000)))
  const minutes = Math.max(0, Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000)))
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

function formatHoldRemaining(value: string | undefined) {
  if (!value) return '—'
  const diffMs = new Date(value).getTime() - Date.now()
  if (diffMs <= 0) return 'Expired'
  const minutes = Math.max(0, Math.ceil(diffMs / (60 * 1000)))
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }
  return `${minutes}m`
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The request could not be completed.'
}

function localDateToUtcStart(value: string) {
  return value ? new Date(`${value}T00:00:00+03:00`).toISOString() : undefined
}

function localDateToUtcEnd(value: string) {
  return value ? new Date(`${value}T23:59:59.999+03:00`).toISOString() : undefined
}

function BookingsPage() {
  const { t } = useTranslation()
  return <PagePlaceholder title={t('page.bookings')} />
}

export function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() })
      setNotice('Profile updated.')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-shell">
      <header className="page-header"><div><p className="eyebrow">Gari Poa</p><h1>Profile</h1></div></header>
      <form className="card-panel stack stack--md" onSubmit={(event) => void submit(event)}>
        <Input label="Full name" onChange={(event) => setName(event.target.value)} required value={name} />
        <Input label="Email" readOnly value={user?.email ?? ''} />
        <Input label="Phone" onChange={(event) => setPhone(event.target.value)} required value={phone} />
        {notice && <p role="status">{notice}</p>}
        {error && <p className="field__error" role="alert">{error}</p>}
        <Button disabled={saving} type="submit">{saving ? 'Saving…' : 'Save profile'}</Button>
      </form>
    </section>
  )
}

export function ApprovalsPage() {
  const { user } = useAuth()
  const approvals = usePendingApprovals()
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<OfflineApprovalRequest['paymentMethod']>('cash')
  const [reference, setReference] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmStep, setConfirmStep] = useState(false)
  const approvalMutation = useApproveOfflinePayment(selectedBooking?.id ?? '')

  const availableMethods = user?.role === 'agent'
    ? paymentMethods.filter((option) => option.value !== 'corporate')
    : paymentMethods

  function openApproval(booking: Booking) {
    setSelectedBooking(booking)
    setPaymentMethod('cash')
    setReference('')
    setReason('')
    setError(null)
    setConfirmStep(false)
  }

  function closeApproval() {
    setSelectedBooking(null)
    setConfirmStep(false)
    setError(null)
  }

  async function submitApproval() {
    if (!selectedBooking || !user) return
    if (!canApproveBooking(user.id, selectedBooking.createdById ?? '')) {
      setError('This booking was created by the current user and cannot be approved.')
      return
    }
    if (!reference.trim()) {
      setError('Payment reference or receipt code is required.')
      return
    }
    if (paymentMethod === 'corporate' && !reason.trim()) {
      setError('Reason is required for corporate override.')
      return
    }
    if (selectedBooking.holdExpiresAt && Date.parse(selectedBooking.holdExpiresAt) <= Date.now()) {
      setError('This booking hold has expired. Recheck availability and reserve the vehicle again.')
      return
    }

    try {
      await approvalMutation.mutateAsync({ paymentMethod, reference: reference.trim(), reason: reason.trim() || undefined })
      setToast('Offline approval recorded successfully.')
      closeApproval()
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const rows = (approvals.data ?? []).map((booking) => ({
    ...booking,
    canApprove: canApproveBooking(user?.id ?? '', booking.createdById ?? ''),
  }))

  return (
    <section className="page-shell">
      <header className="page-header"><div><p className="eyebrow">Gari Poa</p><h1>Approvals</h1></div></header>
      <div className="stack stack--lg">
        <div className="card-panel">
          {approvals.isLoading && <Skeleton rows={4} />}
          {approvals.isError && <ErrorState onRetry={() => void approvals.refetch()} retryLabel="Retry" title={errorMessage(approvals.error)} />}
          {!approvals.isLoading && !approvals.isError && (
            <DataTable
              columns={[
                { key: 'booking', header: 'Booking', render: (row: Booking) => <><strong>{row.reference}</strong><div className="muted">{row.customerName}</div></> },
                { key: 'vehicle', header: 'Vehicle', render: (row: Booking) => row.vehicleName ?? row.vehicleRegistration ?? row.vehicleId },
                { key: 'age', header: 'Age', render: (row: Booking) => <span>{formatAge(row.createdAt ?? row.pickupAt)}</span> },
                { key: 'hold', header: 'Hold', render: (row: Booking) => <span>{formatHoldRemaining(row.holdExpiresAt)}</span> },
                { key: 'amount', header: 'Amount', render: (row: Booking) => <strong>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(row.totalKes)}</strong> },
                { key: 'action', header: 'Action', render: (row: Booking & { canApprove: boolean }) => (
                  <Button disabled={!row.canApprove} onClick={() => openApproval(row)} size="sm" variant={row.canApprove ? 'primary' : 'secondary'}>
                    {row.canApprove ? 'Approve' : 'Locked'}
                  </Button>
                ) },
              ]}
              empty={<div className="empty-state">No bookings are waiting approval.</div>}
              rowKey={(row) => row.id}
              rows={rows}
            />
          )}
        </div>
      </div>
      {selectedBooking && (
        <Modal open title="Approve offline payment" onClose={closeApproval}>
          {!confirmStep ? (
            <div className="modal-body stack stack--md">
              <Select
                error={error ?? undefined}
                label="Payment method"
                onChange={(event) => setPaymentMethod(event.target.value as OfflineApprovalRequest['paymentMethod'])}
                options={availableMethods.map((method) => ({ value: method.value, label: method.label }))}
                value={paymentMethod}
              />
              {user?.role === 'agent' && <p className="field__hint" title="Manager approval required">Corporate Credit is unavailable for agents.</p>}
              <Input label="Payment reference / receipt code" onChange={(event) => setReference(event.target.value)} value={reference} />
              <Input label="Reason" onChange={(event) => setReason(event.target.value)} placeholder={paymentMethod === 'corporate' ? 'Required for corporate override' : 'Optional notes'} value={reason} />
              {error && <p className="field__error" role="alert">{error}</p>}
              <div className="confirm-dialog__actions">
                <Button onClick={closeApproval} variant="secondary">Cancel</Button>
                <Button onClick={() => {
                  if (paymentMethod === 'corporate' && !reason.trim()) {
                    setError('Reason is required for corporate override.')
                    return
                  }
                  if (!reference.trim()) {
                    setError('Payment reference or receipt code is required.')
                    return
                  }
                  setError(null)
                  setConfirmStep(true)
                }} variant="primary">Review</Button>
              </div>
            </div>
          ) : (
            <div className="modal-body stack stack--md">
              <div className="info-grid">
                <div><span className="label">Vehicle</span><strong>{selectedBooking.vehicleName ?? selectedBooking.vehicleRegistration ?? selectedBooking.vehicleId}</strong></div>
                <div><span className="label">Amount</span><strong>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(selectedBooking.totalKes)}</strong></div>
                <div><span className="label">Payment</span><strong>{paymentMethods.find((option) => option.value === paymentMethod)?.label}</strong></div>
              </div>
              {error && <p className="field__error" role="alert">{error}</p>}
              <div className="confirm-dialog__actions">
                <Button onClick={() => setConfirmStep(false)} variant="secondary">Back</Button>
                <Button disabled={approvalMutation.isPending} onClick={() => void submitApproval()} variant="primary">
                  {approvalMutation.isPending ? 'Saving…' : 'Confirm approval'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </section>
  )
}

export function StaffPage() {
  const { user } = useAuth()
  const staff = useStaff()
  const inviteMutation = useInviteStaff()
  const updateMutation = useUpdateStaff()
  const [invite, setInvite] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'agent' as UserRole,
    branch: user?.branch ?? 'Nairobi HQ',
    languages: 'English, Kiswahili',
    licenceClass: '',
    licenceExpiresAt: '',
    psvExpiresAt: '',
  })
  const [memberToDeactivate, setMemberToDeactivate] = useState<StaffMember | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const roleChoices = user?.role === 'manager'
    ? roleOptions.filter((option) => option.value !== 'owner')
    : roleOptions

  async function applyInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    setError(null)
    if (!invite.name.trim() || !invite.email.trim() || !invite.phone.trim()) {
      setError('Name, email and phone are required.')
      return
    }
    const request: StaffInvitationRequest = {
      name: invite.name.trim(),
      email: invite.email.trim(),
      phone: invite.phone.trim(),
      role: invite.role,
      branch: invite.branch.trim(),
    }
    if (invite.role === 'driver') {
      if (!invite.licenceClass || !invite.licenceExpiresAt || !invite.psvExpiresAt) {
        setError('Driver licence class and expiry dates are required.')
        return
      }
      request.driverProfile = {
        languages: invite.languages.split(',').map((language) => language.trim()).filter(Boolean),
        licenceClass: invite.licenceClass.trim(),
        licenceExpiresAt: new Date(`${invite.licenceExpiresAt}T00:00:00+03:00`).toISOString(),
        psvExpiresAt: new Date(`${invite.psvExpiresAt}T00:00:00+03:00`).toISOString(),
      }
    }
    try {
      const created = await inviteMutation.mutateAsync(request)
      setNotice(`Invitation sent to ${created.email}. It expires ${formatTime(created.expiresAt)}.`)
      setInvite((current) => ({ ...current, name: '', email: '', phone: '' }))
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function updateRole(member: StaffMember, role: UserRole) {
    setError(null)
    try {
      await updateMutation.mutateAsync({ id: member.id, request: { role } })
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function updateActive(member: StaffMember, active: boolean) {
    setError(null)
    try {
      await updateMutation.mutateAsync({ id: member.id, request: { active } })
      setMemberToDeactivate(null)
      setNotice(active ? 'The staff account has been reactivated.' : 'The staff member has been deactivated and logged out.')
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  const rows = staff.data ?? []
  const activeOwners = rows.filter((member) => member.role === 'owner' && member.active).length

  return (
    <section className="page-shell">
      <header className="page-header"><div><p className="eyebrow">Gari Poa</p><h1>Staff</h1></div></header>
      <div className="split-layout">
        <div className="card-panel">
          {staff.isLoading && <Skeleton rows={5} />}
          {staff.isError && <ErrorState onRetry={() => void staff.refetch()} retryLabel="Retry" title={errorMessage(staff.error)} />}
          {!staff.isLoading && !staff.isError && (
            <DataTable
              columns={[
                { key: 'name', header: 'Name', render: (row: StaffMember) => <><strong>{row.name}</strong><div className="muted">{row.email}</div></> },
                { key: 'phone', header: 'Phone', render: (row: StaffMember) => row.phone },
                { key: 'role', header: 'Role', render: (row: StaffMember) => (
                  <Select
                    disabled={row.id === user?.id || (user?.role === 'manager' && row.role === 'owner')}
                    label={`Role for ${row.name}`}
                    onChange={(event) => void updateRole(row, event.target.value as UserRole)}
                    options={roleChoices.map((option) => ({ value: option.value, label: option.label }))}
                    value={row.role}
                  />
                ) },
                { key: 'branch', header: 'Branch', render: (row: StaffMember) => row.branch },
                { key: 'status', header: 'Active', render: (row: StaffMember) => row.active ? 'Yes' : 'No' },
                { key: 'last', header: 'Last login', render: (row: StaffMember) => formatTime(row.lastLogin) },
                { key: 'toggle', header: 'Actions', render: (row: StaffMember) => (
                  <Button
                    disabled={row.id === user?.id || (row.role === 'owner' && row.active && activeOwners <= 1) || updateMutation.isPending}
                    onClick={() => row.active ? setMemberToDeactivate(row) : void updateActive(row, true)}
                    size="sm"
                    variant="secondary"
                  >
                    {row.active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                ) },
              ]}
              empty={<div className="empty-state">No staff records found.</div>}
              rowKey={(row) => row.id}
              rows={rows}
            />
          )}
        </div>
        <aside className="card-panel">
          <h2>Invite staff</h2>
          <form className="stack stack--md" onSubmit={(event) => void applyInvite(event)}>
            <Input label="Full name" onChange={(event) => setInvite((current) => ({ ...current, name: event.target.value }))} required value={invite.name} />
            <Input label="Email" onChange={(event) => setInvite((current) => ({ ...current, email: event.target.value }))} required type="email" value={invite.email} />
            <Input label="Phone" onChange={(event) => setInvite((current) => ({ ...current, phone: event.target.value }))} required type="tel" value={invite.phone} />
            <Select label="Role" onChange={(event) => setInvite((current) => ({ ...current, role: event.target.value as UserRole }))} options={roleChoices.map((option) => ({ value: option.value, label: option.label }))} value={invite.role} />
            <Input label="Branch" onChange={(event) => setInvite((current) => ({ ...current, branch: event.target.value }))} required value={invite.branch} />
            {invite.role === 'driver' && (
              <>
                <Input label="Languages (comma-separated)" onChange={(event) => setInvite((current) => ({ ...current, languages: event.target.value }))} required value={invite.languages} />
                <Input label="Licence class" onChange={(event) => setInvite((current) => ({ ...current, licenceClass: event.target.value }))} required value={invite.licenceClass} />
                <Input label="Licence expiry" onChange={(event) => setInvite((current) => ({ ...current, licenceExpiresAt: event.target.value }))} required type="date" value={invite.licenceExpiresAt} />
                <Input label="PSV expiry" onChange={(event) => setInvite((current) => ({ ...current, psvExpiresAt: event.target.value }))} required type="date" value={invite.psvExpiresAt} />
              </>
            )}
            {notice && <p className="field__hint" role="status">{notice}</p>}
            {error && <p className="field__error" role="alert">{error}</p>}
            <Button disabled={inviteMutation.isPending} type="submit">{inviteMutation.isPending ? 'Sending…' : 'Invite staff'}</Button>
          </form>
        </aside>
      </div>
      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel="Deactivate"
        description={memberToDeactivate ? `This will log out ${memberToDeactivate.name} immediately and lock them out of the workspace.` : 'This will log the user out immediately.'}
        onCancel={() => setMemberToDeactivate(null)}
        onConfirm={() => memberToDeactivate && void updateActive(memberToDeactivate, false)}
        open={Boolean(memberToDeactivate)}
        title="Deactivate staff member"
      />
    </section>
  )
}

export function AuditPage() {
  const { user } = useAuth()
  const [actorFilter, setActorFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const audit = useAuditEntries({
    ...(actorFilter !== 'all' ? { actorId: actorFilter } : {}),
    ...(actionFilter !== 'all' ? { action: actionFilter } : {}),
    ...(entityFilter !== 'all' ? { entity: entityFilter } : {}),
    ...(localDateToUtcStart(fromDate) ? { from: localDateToUtcStart(fromDate) } : {}),
    ...(localDateToUtcEnd(toDate) ? { to: localDateToUtcEnd(toDate) } : {}),
  })

  if (!user || user.role !== 'owner') {
    return <section className="page-shell"><div className="card-panel"><h1>Access denied</h1><p>You must be an owner to view the audit log.</p></div></section>
  }

  const entries = audit.data ?? []
  const actorOptions = ['all', ...new Set(entries.flatMap((entry) => entry.actorId ? [entry.actorId] : []))]
  const actionOptions = ['all', ...new Set(entries.map((entry) => entry.action))]
  const entityOptions = ['all', ...new Set(entries.map((entry) => entry.entity))]

  return (
    <section className="page-shell">
      <header className="page-header"><div><p className="eyebrow">Gari Poa</p><h1>Audit log</h1></div></header>
      <div className="card-panel stack stack--md">
        <div className="filter-grid">
          <Input label="From date" onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
          <Input label="To date" onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
          <Select label="Actor" onChange={(event) => setActorFilter(event.target.value)} options={actorOptions.map((value) => ({ value, label: value === 'all' ? 'All actors' : entries.find((entry) => entry.actorId === value)?.actor ?? value }))} value={actorFilter} />
          <Select label="Action" onChange={(event) => setActionFilter(event.target.value)} options={actionOptions.map((value) => ({ value, label: value === 'all' ? 'All actions' : value }))} value={actionFilter} />
          <Select label="Entity" onChange={(event) => setEntityFilter(event.target.value)} options={entityOptions.map((value) => ({ value, label: value === 'all' ? 'All entities' : value }))} value={entityFilter} />
        </div>
        {audit.isLoading && <Skeleton rows={5} />}
        {audit.isError && <ErrorState onRetry={() => void audit.refetch()} retryLabel="Retry" title={errorMessage(audit.error)} />}
        {!audit.isLoading && !audit.isError && (
          <>
            <DataTable
              columns={[
                { key: 'time', header: 'Time (EAT)', render: (row: AuditEntry) => <span>{formatTime(row.createdAt)}</span> },
                { key: 'actor', header: 'Actor', render: (row: AuditEntry) => row.actor },
                { key: 'action', header: 'Action', render: (row: AuditEntry) => row.action },
                { key: 'entity', header: 'Entity', render: (row: AuditEntry) => row.entity },
                { key: 'diff', header: 'Details', render: (row: AuditEntry) => (
                  <button onClick={() => setExpanded((current) => ({ ...current, [row.id]: !current[row.id] }))} type="button">
                    {expanded[row.id] ? 'Hide details' : 'View details'}
                  </button>
                ) },
              ]}
              empty={<div className="empty-state">No audit records match the selected filters.</div>}
              rowKey={(row) => row.id}
              rows={entries}
            />
            {entries.map((entry) => expanded[entry.id] && (
              <div className="audit-diff" key={`${entry.id}-diff`}>
                {entry.before || entry.after ? (
                  <>
                    <h3>Before</h3><pre>{JSON.stringify(entry.before ?? {}, null, 2)}</pre>
                    <h3>After</h3><pre>{JSON.stringify(entry.after ?? {}, null, 2)}</pre>
                  </>
                ) : (
                  <p>Change snapshots are not stored for this operation; request data is excluded from the audit log.</p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  )
}

export { DashboardViewPage as DashboardPage, BookingsPage }
