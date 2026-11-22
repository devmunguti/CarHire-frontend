import { useEffect, useState } from 'react'
import { Toast } from './ui'
import { t } from '../i18n'

export function BackendConnectionNotice() {
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const showNotice = () => setUnavailable(true)
    const hideNotice = () => setUnavailable(false)
    window.addEventListener('autohire:backend-unavailable', showNotice)
    window.addEventListener('autohire:backend-available', hideNotice)
    return () => {
      window.removeEventListener('autohire:backend-unavailable', showNotice)
      window.removeEventListener('autohire:backend-available', hideNotice)
    }
  }, [])

  return unavailable
    ? <div className="backend-connection-notice"><Toast message={t('backend.unavailable')} onClose={() => setUnavailable(false)} tone="danger" /></div>
    : null
}
