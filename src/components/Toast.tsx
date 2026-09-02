import { Check, Info, TriangleAlert, X } from 'lucide-react'
import type { AppToast } from '../hooks/useBoard'
import { useLatched, usePresence } from '../hooks/usePresence'

/** Matches the exit duration of `.app-toast.is-closing` in App.css. */
const TOAST_EXIT_MS = 150

export function Toast({ toast, onDismiss }: { toast: AppToast | null; onDismiss: () => void }) {
  const { mounted, closing } = usePresence(Boolean(toast), TOAST_EXIT_MS)
  // Hold the last toast so the exit animation has something to render.
  const visible = useLatched(toast)
  if (!mounted || !visible) return null
  const Icon = visible.tone === 'success' ? Check : visible.tone === 'error' ? TriangleAlert : Info
  // An error is the one toast a reader must not miss, so it interrupts;
  // confirmations wait for a natural pause.
  const isError = visible.tone === 'error'
  return (
    <div
      className={`app-toast tone-${visible.tone}${closing ? ' is-closing' : ''}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <span className="toast-icon"><Icon size={17} /></span>
      <div><strong>{visible.title}</strong><p>{visible.detail}</p></div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification"><X size={16} /></button>
    </div>
  )
}
