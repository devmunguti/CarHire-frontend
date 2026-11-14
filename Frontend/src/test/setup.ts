import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { resetLanguage } from '../i18n'

afterEach(() => {
  cleanup()
  resetLanguage()
})