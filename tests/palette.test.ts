import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

/** Every design token that resolves to a literal colour, keyed by name. */
const tokens = new Map<string, string>(
  [...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/g)].map((match) => [match[1], match[2]]),
)

function channel(value: number) {
  const v = value / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function luminance(hex: string) {
  const n = hex.replace('#', '')
  const r = channel(parseInt(n.slice(0, 2), 16))
  const g = channel(parseInt(n.slice(2, 4), 16))
  const b = channel(parseInt(n.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(foreground: string, background: string) {
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function token(name: string) {
  const value = tokens.get(name)
  assert.ok(value, `token --${name} is missing from src/index.css`)
  return value as string
}

const FAMILIES = ['rose', 'lime', 'violet', 'gold', 'blue', 'indigo'] as const
const STEPS = ['wash', 'tint', 'surface', 'edge', 'soft', 'accent', 'deep', 'ink'] as const

test('every colour family exposes the same ladder of steps', () => {
  for (const family of FAMILIES) {
    for (const step of STEPS) {
      assert.ok(
        tokens.has(`${family}-${step}`),
        `--${family}-${step} is missing; families must stay symmetrical or a surface can inherit a step that does not exist`,
      )
    }
  }
})

test('a family step keeps the same lightness across every family', () => {
  // The ladder fixes one lightness per step so no column outweighs another.
  for (const step of STEPS) {
    const luminances = FAMILIES.map((family) => luminance(token(`${family}-${step}`)))
    const spread = Math.max(...luminances) - Math.min(...luminances)
    assert.ok(
      spread < 0.06,
      `the ${step} step varies in luminance by ${spread.toFixed(3)} across families; one column will read heavier than the others`,
    )
  }
})

test('body and heading text clear WCAG AA on every card surface', () => {
  const canvas = token('grey-50')
  const heading = token('grey-800')
  const body = token('grey-600')

  assert.ok(contrast(body, canvas) >= 4.5, 'secondary text must clear 4.5:1 on the canvas')
  assert.ok(contrast(heading, canvas) >= 4.5, 'primary text must clear 4.5:1 on the canvas')

  for (const family of FAMILIES) {
    const surface = token(`${family}-surface`)
    assert.ok(
      contrast(heading, surface) >= 4.5,
      `card titles fail on ${family}-surface at ${contrast(heading, surface).toFixed(2)}:1`,
    )
    assert.ok(
      contrast(body, surface) >= 4.5,
      `card body text fails on ${family}-surface at ${contrast(body, surface).toFixed(2)}:1`,
    )
    assert.ok(
      contrast(token(`${family}-deep`), surface) >= 4.5,
      `the ${family} deep tone fails on its own surface at ${contrast(token(`${family}-deep`), surface).toFixed(2)}:1`,
    )
  }
})

test('the focus ring stays visible against the surfaces it is drawn over', () => {
  // The ring sits in the outline-offset gap, so it is read against whatever is
  // behind the element rather than against the element's own fill.
  const ring = token('blue-deep')
  for (const behind of ['grey-0', 'grey-50', 'grey-100']) {
    assert.ok(
      contrast(ring, token(behind)) >= 3,
      `the focus ring fails against ${behind} at ${contrast(ring, token(behind)).toFixed(2)}:1`,
    )
  }
})

test('the neutral ramp descends without a flat step', () => {
  const ramp = ['grey-0', 'grey-25', 'grey-50', 'grey-100', 'grey-150', 'grey-200', 'grey-250',
    'grey-300', 'grey-400', 'grey-500', 'grey-600', 'grey-700', 'grey-800', 'grey-900']
  const luminances = ramp.map((name) => luminance(token(name)))
  for (let i = 1; i < luminances.length; i++) {
    assert.ok(
      luminances[i] < luminances[i - 1],
      `${ramp[i]} is not darker than ${ramp[i - 1]}; the ramp must stay monotonic`,
    )
  }
})
