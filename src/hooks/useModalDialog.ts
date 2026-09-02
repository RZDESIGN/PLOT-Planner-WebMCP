import { useEffect, useRef, useState } from 'react'

/**
 * Shared behaviour for a modal dialog: close on Escape, and hand focus back to
 * whatever opened it once it goes away.
 *
 * Without the second part a keyboard visitor is dropped on `document.body`
 * when a dialog closes and has to tab in from the top of the page to get back
 * to where they were.
 *
 * The opener is captured in a lazy initialiser, which runs during the first
 * render. An effect would be too late: `autoFocus` has already moved focus into
 * the dialog by then, so the dialog would end up remembering its own input.
 *
 * Returns a ref to attach to the dialog's outermost element. It distinguishes
 * "focus was still inside the dialog when it closed", which should restore,
 * from "focus has deliberately moved elsewhere", which should not.
 */
export function useModalDialog(open: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [opener] = useState<HTMLElement | null>(
    () => (typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)),
  )

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  useEffect(() => {
    const container = containerRef
    return () => {
      if (!opener || opener === document.body) return
      if (!document.body.contains(opener) || typeof opener.focus !== 'function') return
      const active = document.activeElement as HTMLElement | null
      const stillInsideDialog =
        !active || active === document.body || Boolean(container.current?.contains(active))
      if (stillInsideDialog) opener.focus()
    }
  }, [opener])

  return containerRef
}
