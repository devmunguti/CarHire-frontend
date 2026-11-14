import { createContext, createElement, useContext, useMemo, useState, type PropsWithChildren } from 'react'
import { en } from './en'
import { sw } from './sw'

export type Language = 'en' | 'sw'

const dictionaries: Record<Language, Record<string, string>> = { en, sw }
let activeLanguage: Language = 'en'

type TranslationContextValue = {
  language: Language
  setLanguage: (language: Language) => void
}

const TranslationContext = createContext<TranslationContextValue | null>(null)

export function TranslationProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>('en')
  const setLanguage = (next: Language) => {
    activeLanguage = next
    setLanguageState(next)
    document.documentElement.lang = next
  }
  const value = useMemo(() => ({ language, setLanguage }), [language])
  return createElement(TranslationContext.Provider, { value }, children)
}

export function t(key: string): string {
  return dictionaries[activeLanguage][key] ?? en[key] ?? key
}

export function resetLanguage() {
  activeLanguage = 'en'
  document.documentElement.lang = 'en'
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  return { t, language: context?.language ?? activeLanguage, setLanguage: context?.setLanguage }
}
