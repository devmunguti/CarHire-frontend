import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthContext'
import { TranslationProvider } from './i18n'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TranslationProvider><AuthProvider><RouterProvider router={router} /></AuthProvider></TranslationProvider>
    </QueryClientProvider>
  )
}