import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TranslationProvider, useTranslation } from './index'

function TranslationProbe() {
  const { language, setLanguage, t } = useTranslation()
  return <>
    <label>Language<select aria-label="Language" onChange={(event) => setLanguage?.(event.target.value as 'en' | 'sw')} value={language}>
      <option value="en">English</option>
      <option value="sw">Kiswahili</option>
    </select></label>
    <p>{t('nav.home')}</p>
    <p>{t('page.timeline')}</p>
  </>
}

describe('translations', () => {
  it('switches languages and falls back to English for a missing Swahili key', () => {
    render(<TranslationProvider><TranslationProbe /></TranslationProvider>)
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'sw' } })
    expect(screen.getByText('Nyumbani')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'sw')
  })
})
