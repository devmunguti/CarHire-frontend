import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AboutPage } from './AboutPage'

function renderAbout() {
  return render(<MemoryRouter><AboutPage /></MemoryRouter>)
}

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('about page questions', () => {
  it('expands and collapses questions with keyboard activation', async () => {
    const user = userEvent.setup()
    renderAbout()
    const first = screen.getByRole('button', { name: 'How does it work?' })
    const second = screen.getByRole('button', { name: 'Can I rent a car without a credit card?' })

    expect(first).toHaveAttribute('aria-expanded', 'true')
    second.focus()
    await user.keyboard('{Enter}')
    expect(second).toHaveAttribute('aria-expanded', 'true')
    expect(first).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard(' ')
    expect(second).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports pointer activation and keeps the answer region connected to its button', () => {
    renderAbout()
    const button = screen.getByRole('button', { name: 'What are the requirements for renting a car?' })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const answerId = button.getAttribute('aria-controls')
    expect(document.getElementById(answerId!)).toHaveTextContent('valid driving licence')
  })

  it('omits the video when no URL is configured and opens an accessible modal when configured', async () => {
    const user = userEvent.setup()
    renderAbout()
    expect(screen.queryByRole('region', { name: 'Our story video' })).not.toBeInTheDocument()
    cleanup()

    vi.stubEnv('VITE_ABOUT_VIDEO_URL', 'https://example.test/story')
    renderAbout()
    await user.click(screen.getByRole('button', { name: 'Play our story video' }))

    const dialog = screen.getByRole('dialog', { name: 'Our story' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByTitle('Gari Poa story video')).toHaveAttribute('src', 'https://example.test/story')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
