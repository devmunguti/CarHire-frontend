import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ContactPage } from './ContactPage'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Marker: () => null,
  Popup: () => null,
  TileLayer: () => null,
}))

function renderContact() {
  return render(<MemoryRouter><ContactPage /></MemoryRouter>)
}

function fillContactForm(phone = '0712 345 678') {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.test' } })
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: phone } })
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'I would like to ask about a booking.' } })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, data: { received: true } }, { status: 201 })))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('contact form', () => {
  it('rejects invalid Kenyan phone numbers without submitting', async () => {
    renderContact()
    fillContactForm('123456')
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    expect(await screen.findByText(/valid Kenyan mobile number/)).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not submit when the honeypot is filled', () => {
    const { container } = renderContact()
    fillContactForm()
    const honeypot = container.querySelector<HTMLInputElement>('input[name="companyWebsite"]')
    expect(honeypot).not.toBeNull()
    fireEvent.change(honeypot!, { target: { value: 'spam' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    expect(fetch).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('reports a successful message submission', async () => {
    renderContact()
    fillContactForm()
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Thanks for reaching out')
    expect(fetch).toHaveBeenCalledWith('/contact', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"phone":"254712345678"'),
    }))
  })

  it('shows the rate-limit message returned by the contact endpoint', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 429 }))
    renderContact()
    fillContactForm()
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many messages')
  })

  it('reports an endpoint failure without presenting a success state', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ success: false }, { status: 500 }))
    renderContact()
    fillContactForm()
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not send your message')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
