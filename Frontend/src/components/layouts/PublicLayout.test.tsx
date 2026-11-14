import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { company } from '../../config/company'
import { resetLanguage, TranslationProvider } from '../../i18n'
import { PublicLayout } from './PublicLayout'

afterEach(() => {
  cleanup()
  resetLanguage()
})

describe('public layout company details', () => {
  it('uses the company config for the header and footer', () => {
    render(<TranslationProvider><MemoryRouter initialEntries={['/']}><Routes><Route element={<PublicLayout />}><Route element={<p>Home content</p>} path="/" /></Route></Routes></MemoryRouter></TranslationProvider>)

    expect(screen.getAllByText(company.name)).toHaveLength(2)
    expect(screen.getAllByText(company.phone)).toHaveLength(2)
    expect(screen.getByText(company.address)).toBeInTheDocument()
    expect(screen.queryByText(company.email)).not.toBeInTheDocument()
    expect(document.querySelector('[href^="mailto:"]')).toBeNull()
  })

  it('switches public navigation to Swahili', () => {
    render(<TranslationProvider><MemoryRouter initialEntries={['/']}><Routes><Route element={<PublicLayout />}><Route element={<p>Home content</p>} path="/" /></Route></Routes></MemoryRouter></TranslationProvider>)
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'sw' } })
    expect(screen.getByRole('navigation', { name: 'Urambazaji mkuu' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Urambazaji mkuu' })).getByRole('link', { name: 'Magari' })).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'sw')
  })
})
