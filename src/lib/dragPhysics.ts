export interface DragVelocity {
  x: number
  y: number
}

export interface DragPose {
  /** Degrees of lean, positive when travelling right. */
  tilt: number
  /** 0 to 1, how far the object is lifted off the board. */
  lift: number
  stretchX: number
  stretchY: number
  scale: number
}

/**
 * A sample older than this is treated as stale rather than as motion. Without
 * the guard, resuming a drag after a paused frame reads as one enormous jump.
 */
export const DRAG_SAMPLE_WINDOW_MS = 220

/** How much of a new reading to accept per sample. Lower is smoother. */
export const DRAG_SMOOTHING = 0.4

export function smoothVelocity(current: DragVelocity, next: DragVelocity): DragVelocity {
  return {
    x: current.x + (next.x - current.x) * DRAG_SMOOTHING,
    y: current.y + (next.y - current.y) * DRAG_SMOOTHING,
  }
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/**
 * The single physical model for anything carried across the board.
 *
 * Cards and loose notes used to move differently: a card leaned and stretched
 * with the hand that carried it while a note slid rigidly, which made two
 * objects on the same canvas feel like they obeyed different rules. Both now
 * read their pose from here.
 */
export function dragPose(velocity: DragVelocity, resting = false): DragPose {
  if (resting) return { tilt: 0, lift: 0, stretchX: 1, stretchY: 1, scale: 1 }
  const speed = Math.hypot(velocity.x, velocity.y)
  const tilt = clamp(velocity.x * 5.8, -7.5, 7.5)
  const lift = Math.min(1, speed / 1.65)
  const stretch = Math.min(0.025, Math.abs(velocity.x) * 0.012)
  return {
    tilt,
    lift,
    stretchX: 1 + stretch,
    stretchY: 1 - stretch * 0.45,
    scale: 1.025 + lift * 0.012,
  }
}
