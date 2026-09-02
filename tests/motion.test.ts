import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const indexCss = read('src/index.css')
const appCss = read('src/App.css')

function duration(name: string) {
  const match = indexCss.match(new RegExp(`--${name}:\\s*(\\d+)ms;`))
  assert.ok(match, `--${name} is missing from src/index.css`)
  return Number((match as RegExpMatchArray)[1])
}

test('the duration scale ascends without a repeated step', () => {
  const scale = ['dur-0', 'dur-1', 'dur-2', 'dur-3', 'dur-4', 'dur-5', 'dur-6', 'dur-7'].map(duration)
  for (let i = 1; i < scale.length; i++) {
    assert.ok(
      scale[i] > scale[i - 1],
      `dur-${i} (${scale[i]}ms) must be longer than dur-${i - 1} (${scale[i - 1]}ms)`,
    )
  }
  assert.ok(scale[0] <= 80, 'press feedback must stay under 80ms to feel immediate')
  assert.ok(scale[2] <= 200, 'hover feedback must stay under 200ms or the interface feels sluggish')
})

test('an exit timer in a component matches the CSS duration it waits on', () => {
  // A surface stays mounted for its exit animation. If the JS timeout and the
  // CSS duration drift apart, the surface is either cut off mid-animation or
  // lingers on screen after it has finished.
  const pairs: Array<[string, string, string]> = [
    ['src/App.tsx', 'DIALOG_EXIT_MS', 'dur-2'],
    ['src/components/Toast.tsx', 'TOAST_EXIT_MS', 'dur-2'],
    ['src/components/WorkspaceControls.tsx', 'MENU_EXIT_MS', 'dur-1'],
  ]
  for (const [file, constant, token] of pairs) {
    const match = read(file).match(new RegExp(`const ${constant} = (\\d+)`))
    assert.ok(match, `${constant} is missing from ${file}`)
    assert.equal(
      Number((match as RegExpMatchArray)[1]),
      duration(token),
      `${constant} must equal --${token}; the exit animation and the unmount timer have drifted apart`,
    )
  }
})

test('reduced motion neutralises duration and delay, not only duration', () => {
  const block = appCss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/)
  assert.ok(block, 'the reduced-motion block is missing from src/App.css')
  const rules = (block as RegExpMatchArray)[0]
  for (const property of [
    'animation-duration',
    'transition-duration',
    'animation-delay',
    'transition-delay',
  ]) {
    assert.match(
      rules,
      new RegExp(`${property}:[^;]*!important`),
      `reduced motion must neutralise ${property}; a staggered entrance still waits without it`,
    )
  }
  assert.match(rules, /::view-transition-group/, 'view transitions must be neutralised too')
})

test('no stylesheet hard-codes a duration or an easing curve', () => {
  // Durations and curves live in the token layer so the whole product can be
  // retimed in one place. `.01ms` and `0ms` are the reduced-motion sentinels;
  // the other two are per-item stagger deltas, which are offsets not durations.
  const allowed = new Set(['.01ms', '0ms', '24ms', '30ms'])
  const durations = (appCss.match(/[\d.]+ms/g) || []).filter((value) => !allowed.has(value))
  assert.deepEqual(durations, [], `these durations should use a --dur-* token: ${durations.join(', ')}`)

  const curves = appCss.match(/cubic-bezier\([^)]*\)/g) || []
  assert.deepEqual(curves, [], `these easing curves should use an --ease-* token: ${curves.join(', ')}`)
})

test('no stylesheet hard-codes a colour outside the token layer', () => {
  const hexes = appCss.match(/#[0-9a-fA-F]{3,8}\b/g) || []
  assert.deepEqual(hexes, [], `these colours should use a token: ${[...new Set(hexes)].join(', ')}`)
})
