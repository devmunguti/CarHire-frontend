import { useState } from 'react'
import type { BookingExtension, BookingExtensionDecisionRequest } from '../../api/types'
import { useBookingExtensions, useReviewBookingExtension } from '../../api/queries'
import { Button, DataTable, ErrorState, Input, Modal, Select, Skeleton } from '../../components/ui'
import { formatEat, formatKes } from '../../lib'

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa_manual', label: 'M-Pesa manual' },
  { value: 'bank', label: 'Bank EFT' },
] as const

export function ExtensionsPage() {
  const requests = useBookingExtensions()
  const review = useReviewBookingExtension()
  const [selected, setSelected] = useState<BookingExtension | null>(null)
  const [decision, setDecision] = useState<BookingExtensionDecisionRequest['decision']>('approve')
  const [paymentMethod, setPaymentMethod] = useState<NonNullable<BookingExtensionDecisionRequest['paymentMethod']>>('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  function openReview(request: BookingExtension, nextDecision: 'approve' | 'decline') {
    setSelected(request)
    setDecision(nextDecision)
    setPaymentMethod('cash')
    setPaymentReference('')
    setReviewNote('')
    setError(null)
  }

  async function submitReview() {
    if (!selected) return
    if (decision === 'approve' && (selected.feeKes ?? 0) > 0 && !paymentReference.trim()) {
      setError('Enter the offline payment receipt before approving the extension.')
      return
    }
    setError(null)
    try {
      await review.mutateAsync({
        id: selected.id,
        request: {
          decision,
          ...(decision === 'approve' && (selected.feeKes ?? 0) > 0 ? { paymentMethod, paymentReference: paymentReference.trim() } : {}),
          ...(reviewNote.trim() ? { reviewNote: reviewNote.trim() } : {}),
        },
      })
      setSelected(null)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The extension request could not be reviewed.')
    }
  }

  return <section className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Rental operations</p><h1>Extension requests</h1><p>Review availability and collect the quoted offline payment before approval.</p></div></header>
    <div className="card-panel">
      {requests.isLoading && <Skeleton rows={4} />}
      {requests.isError && <ErrorState onRetry={() => void requests.refetch()} retryLabel="Retry" title="Extension requests could not be loaded" />}
      {!requests.isLoading && !requests.isError && <DataTable
        columns={[
          { key: 'booking', header: 'Booking', render: (row: BookingExtension) => <><strong>{row.reference}</strong><div className="muted">{row.booking?.customerName ?? 'Guest'} · {row.booking?.vehicle ?? 'Vehicle'}</div></> },
          { key: 'current', header: 'Current return', render: (row: BookingExtension) => formatEat(row.currentReturnAt) },
          { key: 'requested', header: 'Requested return', render: (row: BookingExtension) => formatEat(row.requestedReturnAt) },
          { key: 'fee', header: 'Estimated fee', render: (row: BookingExtension) => formatKes(row.feeKes ?? 0) },
          { key: 'reason', header: 'Reason', render: (row: BookingExtension) => row.reason },
          { key: 'actions', header: 'Review', render: (row: BookingExtension) => <div className="extension-review-actions">
            <Button onClick={() => openReview(row, 'approve')} size="sm">Approve</Button>
            <Button onClick={() => openReview(row, 'decline')} size="sm" variant="secondary">Decline</Button>
          </div> },
        ]}
        empty={<div className="empty-state">No extension requests are awaiting review.</div>}
        rowKey={(row) => row.id}
        rows={requests.data ?? []}
      />}
    </div>
    {selected && <Modal open onClose={() => setSelected(null)} title={`${decision === 'approve' ? 'Approve' : 'Decline'} extension · ${selected.reference}`}>
      <div className="modal-body stack stack--md">
        <div className="info-grid">
          <div><span className="label">Vehicle</span><strong>{selected.booking?.vehicle ?? '—'}</strong></div>
          <div><span className="label">Requested return</span><strong>{formatEat(selected.requestedReturnAt)}</strong></div>
          <div><span className="label">Estimated fee</span><strong>{formatKes(selected.feeKes ?? 0)}</strong></div>
        </div>
        {decision === 'approve' && (selected.feeKes ?? 0) > 0 && <>
          <p>Verify the vehicle is still available and collect this amount offline before approving.</p>
          <Select label="Payment method" onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} options={paymentMethods.map((method) => ({ value: method.value, label: method.label }))} value={paymentMethod} />
          <Input label="Payment receipt / reference" onChange={(event) => setPaymentReference(event.target.value)} value={paymentReference} />
        </>}
        <label className="field"><span className="field__label">Review note</span><textarea className="control" maxLength={1000} onChange={(event) => setReviewNote(event.target.value)} value={reviewNote} /></label>
        {error && <p className="field__error" role="alert">{error}</p>}
        <div className="confirm-dialog__actions">
          <Button onClick={() => setSelected(null)} variant="secondary">Cancel</Button>
          <Button disabled={review.isPending} onClick={() => void submitReview()} variant={decision === 'approve' ? 'primary' : 'danger'}>{review.isPending ? 'Saving…' : decision === 'approve' ? 'Confirm extension' : 'Decline request'}</Button>
        </div>
      </div>
    </Modal>}
  </section>
}
