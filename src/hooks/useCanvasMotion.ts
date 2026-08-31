import { useCallback, useEffect, useRef, useState } from 'react'

export interface CanvasTransform {
  x: number
  y: number
  zoom: number
}

export type CanvasMotionMode = 'idle' | 'direct' | 'panning' | 'gliding' | 'zooming' | 'settling'

interface CanvasVelocity {
  x: number
  y: number
  zoom: number
}

interface CanvasSpringOptions {
  stiffness?: number
  damping?: number
  maxDuration?: number
  mode?: Exclude<CanvasMotionMode, 'idle' | 'direct'>
  initialVelocity?: Partial<CanvasVelocity>
}

const DEFAULT_SPRING = {
  stiffness: 230,
  damping: 27,
  maxDuration: 1100,
} as const

const ZERO_VELOCITY: CanvasVelocity = { x: 0, y: 0, zoom: 0 }

function nearlySettled(
  current: CanvasTransform,
  target: CanvasTransform,
  velocity: CanvasVelocity,
) {
  return (
    Math.abs(target.x - current.x) < 0.12 &&
    Math.abs(target.y - current.y) < 0.12 &&
    Math.abs(target.zoom - current.zoom) < 0.00015 &&
    Math.abs(velocity.x) < 0.7 &&
    Math.abs(velocity.y) < 0.7 &&
    Math.abs(velocity.zoom) < 0.0008
  )
}

/**
 * A small spring integrator for the infinite canvas. Pointer drags stay direct,
 * while wheel, fit, zoom-button, and release motion converge through the same
 * physical model so the canvas never changes easing language between inputs.
 */
export function useCanvasMotion(initial: CanvasTransform) {
  const [transform, setTransformState] = useState(initial)
  const [mode, setMode] = useState<CanvasMotionMode>('idle')
  const transformRef = useRef(initial)
  const targetRef = useRef(initial)
  const velocityRef = useRef<CanvasVelocity>({ ...ZERO_VELOCITY })
  const frameRef = useRef<number | null>(null)
  const lastFrameRef = useRef(0)
  const animationStartedRef = useRef(0)
  const springRef = useRef<Required<Pick<CanvasSpringOptions, 'stiffness' | 'damping' | 'maxDuration'>>>({
    stiffness: DEFAULT_SPRING.stiffness,
    damping: DEFAULT_SPRING.damping,
    maxDuration: DEFAULT_SPRING.maxDuration,
  })
  const reducedMotionRef = useRef(false)

  const writeTransform = useCallback((next: CanvasTransform) => {
    transformRef.current = next
    setTransformState(next)
  }, [])

  const setMotionMode = useCallback((next: CanvasMotionMode) => {
    setMode((current) => (current === next ? current : next))
  }, [])

  const stop = useCallback((resetVelocity = true) => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    lastFrameRef.current = 0
    if (resetVelocity) velocityRef.current = { ...ZERO_VELOCITY }
  }, [])

  const runSpring = useCallback(() => {
    if (frameRef.current !== null) return
    animationStartedRef.current = performance.now()

    const step = (time: number) => {
      const current = transformRef.current
      const target = targetRef.current
      const velocity = velocityRef.current
      const elapsed = time - animationStartedRef.current
      const deltaSeconds = lastFrameRef.current
        ? Math.min(0.034, Math.max(0.008, (time - lastFrameRef.current) / 1000))
        : 1 / 60
      lastFrameRef.current = time

      const { stiffness, damping, maxDuration } = springRef.current
      const decay = Math.exp(-damping * deltaSeconds)
      const nextVelocity = {
        x: (velocity.x + (target.x - current.x) * stiffness * deltaSeconds) * decay,
        y: (velocity.y + (target.y - current.y) * stiffness * deltaSeconds) * decay,
        zoom:
          (velocity.zoom + (target.zoom - current.zoom) * stiffness * deltaSeconds) * decay,
      }
      const next = {
        x: current.x + nextVelocity.x * deltaSeconds,
        y: current.y + nextVelocity.y * deltaSeconds,
        zoom: current.zoom + nextVelocity.zoom * deltaSeconds,
      }
      velocityRef.current = nextVelocity

      if (nearlySettled(next, target, nextVelocity) || elapsed >= maxDuration) {
        writeTransform(target)
        velocityRef.current = { ...ZERO_VELOCITY }
        frameRef.current = null
        lastFrameRef.current = 0
        setMotionMode('idle')
        return
      }

      writeTransform(next)
      frameRef.current = window.requestAnimationFrame(step)
    }

    frameRef.current = window.requestAnimationFrame(step)
  }, [setMotionMode, writeTransform])

  const setImmediate = useCallback(
    (next: CanvasTransform, nextMode: CanvasMotionMode = 'direct') => {
      stop()
      targetRef.current = next
      writeTransform(next)
      setMotionMode(nextMode)
    },
    [setMotionMode, stop, writeTransform],
  )

  const animateTo = useCallback(
    (next: CanvasTransform, options: CanvasSpringOptions = {}) => {
      targetRef.current = next
      springRef.current = {
        stiffness: options.stiffness ?? DEFAULT_SPRING.stiffness,
        damping: options.damping ?? DEFAULT_SPRING.damping,
        maxDuration: options.maxDuration ?? DEFAULT_SPRING.maxDuration,
      }
      animationStartedRef.current = performance.now()
      if (options.initialVelocity) {
        velocityRef.current = {
          x: options.initialVelocity.x ?? velocityRef.current.x,
          y: options.initialVelocity.y ?? velocityRef.current.y,
          zoom: options.initialVelocity.zoom ?? velocityRef.current.zoom,
        }
      }
      setMotionMode(options.mode ?? 'settling')

      if (reducedMotionRef.current) {
        setImmediate(next, 'idle')
        return
      }
      runSpring()
    },
    [runSpring, setImmediate, setMotionMode],
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPreference = () => {
      reducedMotionRef.current = media.matches
      if (media.matches && frameRef.current !== null) setImmediate(targetRef.current, 'idle')
    }
    syncPreference()
    media.addEventListener('change', syncPreference)
    return () => media.removeEventListener('change', syncPreference)
  }, [setImmediate])

  useEffect(() => () => stop(), [stop])

  return {
    transform,
    mode,
    animateTo,
    setImmediate,
    stop,
    getTransform: () => transformRef.current,
    getTarget: () => targetRef.current,
    prefersReducedMotion: () => reducedMotionRef.current,
  }
}
