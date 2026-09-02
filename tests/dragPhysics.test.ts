import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DRAG_SAMPLE_WINDOW_MS,
  DRAG_SMOOTHING,
  dragPose,
  smoothVelocity,
} from '../src/lib/dragPhysics.ts'

test('a resting object has no lean, lift or stretch', () => {
  const pose = dragPose({ x: 2, y: 2 }, true)
  assert.deepEqual(pose, { tilt: 0, lift: 0, stretchX: 1, stretchY: 1, scale: 1 })
})

test('lean follows the direction of travel and stays within its limit', () => {
  assert.ok(dragPose({ x: 0.5, y: 0 }).tilt > 0, 'moving right should lean right')
  assert.ok(dragPose({ x: -0.5, y: 0 }).tilt < 0, 'moving left should lean left')
  assert.equal(dragPose({ x: 0, y: 0 }).tilt, 0)
  // A flick must not spin the object; the lean is capped.
  assert.equal(dragPose({ x: 40, y: 0 }).tilt, 7.5)
  assert.equal(dragPose({ x: -40, y: 0 }).tilt, -7.5)
})

test('lift responds to speed in any direction and saturates at one', () => {
  assert.equal(dragPose({ x: 0, y: 0 }).lift, 0)
  assert.ok(dragPose({ x: 0, y: 1 }).lift > 0, 'vertical motion lifts too')
  assert.equal(dragPose({ x: 10, y: 10 }).lift, 1)
  const slow = dragPose({ x: 0.2, y: 0 }).lift
  const fast = dragPose({ x: 0.9, y: 0 }).lift
  assert.ok(fast > slow, 'faster travel lifts further')
})

test('stretch conserves the silhouette: what widens also shortens', () => {
  const pose = dragPose({ x: 1.5, y: 0 })
  assert.ok(pose.stretchX > 1, 'a moving object stretches along its travel')
  assert.ok(pose.stretchY < 1, 'and compresses across it')
  assert.ok(pose.stretchX <= 1.025, 'stretch stays subtle')
})

test('smoothing eases toward a new reading rather than snapping to it', () => {
  const eased = smoothVelocity({ x: 0, y: 0 }, { x: 1, y: 1 })
  assert.equal(eased.x, DRAG_SMOOTHING)
  assert.ok(eased.x < 1, 'a single sample must not take over the reading')

  // Repeated samples converge on the target.
  let current = { x: 0, y: 0 }
  for (let i = 0; i < 20; i++) current = smoothVelocity(current, { x: 1, y: 0 })
  assert.ok(current.x > 0.99, 'sustained motion should converge')
})

test('the stale-sample window is long enough to survive a dropped frame', () => {
  // Three frames at 60fps is 50ms; the window must comfortably exceed that or
  // a hitch during a drag reads as the object stopping.
  assert.ok(DRAG_SAMPLE_WINDOW_MS > 100, 'window is too tight for a slow frame')
  assert.ok(DRAG_SAMPLE_WINDOW_MS < 500, 'window is so wide that stale samples read as motion')
})
