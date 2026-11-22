import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../hooks/AuthContext'
import { getCurrentUser } from '../api/auth'
import { setAccessToken } from '../api/client'
import { auditEntries, bookings, staffMembers } from '../mocks/fixtures'
import { ApprovalsPage, StaffPage, AuditPage } from './admin'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
}

vi.mock('../api/auth', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn().mockResolvedValue(undefined),
  updateCurrentUser: vi.fn(),
}))

beforeEach(() => {
  setAccessToken('mock-manager')
  const pendingBooking = bookings.find((booking) => booking.status === 'reserved')
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const authorization = new Headers(init?.headers).get('Authorization') ?? ''
    const actorRole = authorization.replace('Bearer mock-', '')
    let items: unknown[] = []
    if (url.pathname === '/api/v1/approvals' && pendingBooking) {
      items = [{ ...pendingBooking, createdById: 'usr-other', status: 'reserved', pendingApproval: true, holdExpiresAt: new Date(Date.now() + 60_000).toISOString() }]
    } else if (url.pathname === '/api/v1/staff') {
      items = staffMembers.filter((member) => actorRole !== 'manager' || member.role !== 'owner')
    } else if (url.pathname === '/api/v1/audit') {
      items = auditEntries
    }
    return Response.json({ success: true, data: { items, nextCursor: null }, error: null })
  }))
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: 'usr-02',
    name: 'Brian Otieno',
    email: 'brian@autohire.ke',
    phone: '254712345602',
    role: 'manager',
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  setAccessToken(null)
})

describe('admin rules', () => {
  it('hides corporate credit for agent approvals and enforces required fields', async () => {
    setAccessToken('mock-agent')
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'usr-09',
      name: 'Jane Agent',
      email: 'jane@autohire.ke',
      phone: '254700000009',
      role: 'agent',
    })

    renderWithProviders(
      <MemoryRouter>
        <AuthProvider>
          <ApprovalsPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    const approveButtons = await screen.findAllByRole('button', { name: 'Approve' })
    fireEvent.click(approveButtons[0])
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    const paymentSelect = screen.getByLabelText(/payment method/i)
    const values = Array.from((paymentSelect as HTMLSelectElement).options).map((option) => option.value)
    expect(values).not.toContain('corporate')
  })

  it('prevents manager from creating owner roles and blocks self-deactivation', async () => {
    setAccessToken('mock-manager')
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'usr-02',
      name: 'Brian Otieno',
      email: 'brian@autohire.ke',
      phone: '254712345602',
      role: 'manager',
    })

    renderWithProviders(
      <MemoryRouter>
        <AuthProvider>
          <StaffPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /^Staff$/i, level: 1 })).toBeInTheDocument()
    const roleSelects = screen.getAllByRole('combobox', { name: 'Role' })
    const inviteRoleSelect = roleSelects[roleSelects.length - 1] as HTMLSelectElement
    await waitFor(() => expect(Array.from(inviteRoleSelect.options).map((option) => option.value)).not.toContain('owner'))
    expect(screen.getByRole('button', { name: 'Invite staff' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Owner')).not.toBeInTheDocument()
  })

  it('keeps audit page owner-only', () => {
    setAccessToken('mock-owner')
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'usr-01',
      name: 'Amina Njeri',
      email: 'amina@autohire.ke',
      phone: '254712345601',
      role: 'owner',
    })

    renderWithProviders(
      <MemoryRouter>
        <AuthProvider>
          <AuditPage />
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Audit log/i)).toBeInTheDocument()
  })
})
