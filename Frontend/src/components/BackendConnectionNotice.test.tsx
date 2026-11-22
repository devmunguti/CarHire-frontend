import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BackendConnectionNotice } from './BackendConnectionNotice'

describe('BackendConnectionNotice', () => {
  it('shows an alert when the backend cannot be reached and clears it after reconnecting', () => {
    render(<BackendConnectionNotice />)

    act(() => window.dispatchEvent(new Event('autohire:backend-unavailable')))
    expect(screen.getByRole('alert')).toHaveTextContent('The backend is unavailable')

    act(() => window.dispatchEvent(new Event('autohire:backend-available')))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('can be dismissed', () => {
    render(<BackendConnectionNotice />)
    act(() => window.dispatchEvent(new Event('autohire:backend-unavailable')))

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
