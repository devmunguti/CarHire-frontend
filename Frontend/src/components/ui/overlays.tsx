import { useEffect, useEffectEvent, useId, useRef, type PropsWithChildren } from 'react'
import { X } from 'lucide-react'
import { t } from '../../i18n'
import { Button, IconButton } from './button'

type FrameProps = PropsWithChildren<{
  open: boolean
  title: string
  onClose: () => void
  variant?: 'modal' | 'drawer'
}>

function OverlayFrame({ open, title, onClose, variant = 'modal', children }: FrameProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const close = useEffectEvent(onClose)

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusableSelector = 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    const focusableElements = () => [...(frameRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])]
      .filter((element) => !element.closest('[hidden], [aria-hidden="true"]'))
    focusableElements()[0]?.focus()
    if (!focusableElements().length) frameRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
      if (event.key === 'Tab' && frameRef.current) {
        const focusable = focusableElements()
        const first = focusable[0]
        const last = focusable.at(-1)
        if (!first || !last) {
          event.preventDefault()
          frameRef.current.focus()
        } else if (event.shiftKey && (document.activeElement === first || document.activeElement === frameRef.current)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === frameRef.current)) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div className={`overlay overlay--${variant}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section aria-labelledby={titleId} aria-modal="true" className="overlay__panel" ref={frameRef} role="dialog" tabIndex={-1}>
        <header className="overlay__header"><h2 id={titleId}>{title}</h2><IconButton icon={<X size={18} />} label={t('styleguide.cancel')} onClick={onClose} /></header>
        {children}
      </section>
    </div>
  )
}

export function Modal(props: FrameProps) {
  return <OverlayFrame {...props} variant="modal" />
}

export function Drawer(props: FrameProps) {
  return <OverlayFrame {...props} variant="drawer" />
}

export function ConfirmDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="confirm-dialog"><p>{description}</p><div className="confirm-dialog__actions"><Button onClick={onCancel} variant="secondary">{cancelLabel}</Button><Button onClick={onConfirm} variant="danger">{confirmLabel}</Button></div></div>
    </Modal>
  )
}