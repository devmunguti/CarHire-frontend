import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { isMockApiEnabled } from './api/config'
import App from './App'
import './App.css'
import './index.css'

async function startApp() {
  if (isMockApiEnabled) {
    const { worker } = await import('./mocks/browser')
    await worker.start()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void startApp()