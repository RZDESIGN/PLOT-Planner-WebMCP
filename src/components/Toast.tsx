import { Check, Info, TriangleAlert, X } from 'lucide-react'
import type { AppToast } from '../hooks/useBoard'

export function Toast({ toast, onDismiss }: { toast: AppToast | null; onDismiss: () => void }) {
  if (!toast) return null
  const Icon = toast.tone === 'success' ? Check : toast.tone === 'error' ? TriangleAlert : Info
  return (
    <div className={`app-toast tone-${toast.tone}`} role="status" aria-live="polite">
      <span className="toast-icon"><Icon size={17} /></span>
      <div><strong>{toast.title}</strong><p>{toast.detail}</p></div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification"><X size={16} /></button>
    </div>
  )
}
