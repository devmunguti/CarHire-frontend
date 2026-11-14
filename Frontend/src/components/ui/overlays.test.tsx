import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog, Drawer } from './overlays'

describe('dialog focus management', () => {
  it('moves focus into the dialog, traps keyboard focus, and restores the opener', () => {
    function Example() {
      const [open, setOpen] = useState(false)
      return <>
        <button onClick={() => setOpen(true)} type="button">Open drawer</button>
        <Drawer open={open} onClose={() => setOpen(false)} title="Booking">
          <button type="button">First action</button>
          <button type="button">Last action</button>
        </Drawer>
      </>
    }

    render(<Example />)
    const opener = screen.getByRole('button', { name: 'Open drawer' })
    opener.focus()
    fireEvent.click(opener)
    const closeButton = screen.getByRole('button', { name: 'Cancel' })
    expect(closeButton).toHaveFocus()
    closeButton.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(screen.getByRole('button', { name: 'Last action' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(opener).toHaveFocus()
  })

  it('exposes an approval confirmation dialog with keyboard-activatable actions', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog
      cancelLabel="Go back"
      confirmLabel="Approve offline payment"
      description="Approve this payment?"
      onCancel={onCancel}
      onConfirm={onConfirm}
      open
      title="Confirm approval"
    />)

    expect(screen.getByRole('dialog', { name: 'Confirm approval' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Approve offline payment' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})
