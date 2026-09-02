import { useEffect, useState } from 'react'

/**
 * Keeps a conditionally rendered surface mounted for the length of its exit
 * animation. React unmounts immediately when a condition flips, so without
 * this a dialog, menu, or toast can only ever animate in and then vanish.
 *
 * Returns `mounted` for the render guard and `closing` for the class that
 * drives the exit. Exit motion is deliberately shorter than entrance motion:
 * something arriving deserves attention, something leaving should get out of
 * the way.
 *
 * `exitMs` must match the CSS exit duration, or the surface will either be
 * cut off mid-animation or linger after it finishes.
 */
export function usePresence(open: boolean, exitMs: number) {
  const [closing, setClosing] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)

  // Opening and closing are both derived during render, so the surface never
  // waits a frame to appear.
  if (open !== wasOpen) {
    setWasOpen(open)
    setClosing(!open)
  }

  // The only effect is the timer itself, which is a genuine external system.
  useEffect(() => {
    if (!closing) return
    const timer = setTimeout(() => setClosing(false), exitMs)
    return () => clearTimeout(timer)
  }, [closing, exitMs])

  return { mounted: open || closing, closing }
}

/**
 * Remembers the last non-empty value it was given. Pair with `usePresence`
 * when a surface renders from state that clears on close, so the exit frame
 * still has content to draw instead of flashing empty.
 */
export function useLatched<T>(value: T | null | undefined): T | null {
  const [latched, setLatched] = useState<T | null>(value ?? null)
  const [seen, setSeen] = useState<T | null | undefined>(value)
  if (value !== seen) {
    setSeen(value)
    if (value !== null && value !== undefined) setLatched(value)
  }
  return value ?? latched
}
