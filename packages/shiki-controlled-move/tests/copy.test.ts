import { describe, it, expect } from 'vitest'
import { compile } from '../src/compile.js'
import { L } from '../src/pattern.js'
import type { SourceLine } from '../src/types.js'

function lines(code: string): SourceLine[] {
  return code.split('\n').map((text) => ({
    tokens: [{ text, color: '#000000' }],
  }))
}

describe('copyTo', () => {
  it('duplicates a span: originals stay put, copy glides cross-line', () => {
    const before = compile(lines('abc\nxyz'), [])
    const result = compile(lines('abc\nxyz'), [
      [L[0]('abc').copyTo(L[1]('xyz').after())],
    ])

    // Token count increased by the copied span's length (duplication, not move).
    expect(result.tokens.length).toBe(before.tokens.length + 1)

    // Originals stay live and unmoved after the copy step.
    const originals = result.tokens.filter((t) => t.text === 'abc')
    expect(originals.length).toBe(2)
    const original = originals.find((t) => !t.float)!
    expect(original).toBeDefined()
    expect(original.steps[1].opacity).toBe(1)
    expect(original.steps[1].transform).toBe('translate(0px,0px)')

    // The new (copied) token is float, visible, and glides to the other row (non-zero dy).
    const copy = originals.find((t) => t.float)!
    expect(copy).toBeDefined()
    expect(copy.steps[1].opacity).toBe(1)
    const dyMatch = /,(-?\d*\.?\d+)em\)/.exec(copy.steps[1].transform)
    expect(dyMatch).not.toBeNull()
    expect(Number(dyMatch![1])).not.toBe(0)
  })

  it('copies a span whose first token is displaced: DOM home tracks its logical column', () => {
    // line0 'A B', line1 'X', line2 'Y'.
    const src: SourceLine[] = [
      { tokens: [{ text: 'A', color: '#000' }, { text: ' ', color: '#000' }, { text: 'B', color: '#000' }] },
      { tokens: [{ text: 'X', color: '#000' }] },
      { tokens: [{ text: 'Y', color: '#000' }] },
    ]
    const result = compile(src, [
      // Move 'A' to before 'X': 'A' is now logically in line1 but its DOM slot stays in line0.
      [L[0]('A').moveTo(L[1]('X').before())],
      // Copy 'AX' (whose first token 'A' is displaced) down after 'Y'.
      [L[1]('AX').copyTo(L[2]('Y').after())],
    ])

    const line1Id = result.lines[1].id
    const dom = result.lineTokens[line1Id]
    const origX = result.tokens.find((t) => t.text === 'X' && !t.float)!
    const copyTokens = result.tokens.filter((t) => t.float && dom.includes(t.id))

    // The copy ids must be spliced at 'A's logical column (before the original 'X'), not
    // appended at the end of the line — so every copy id precedes the original 'X' in DOM.
    expect(copyTokens.length).toBeGreaterThan(0)
    for (const c of copyTokens) {
      expect(dom.indexOf(c.id)).toBeLessThan(dom.indexOf(origX.id))
    }
  })

  it('a displaced token fades out in place when it dies (no snap back to DOM origin)', () => {
    const result = compile(lines('A\nX'), [
      // Copy 'A' to after 'X': the copy is displaced (DOM home line0, glides to line1).
      [L[0]('A').copyTo(L[1]('X').after())],
      // Delete the copy (now logically in line1).
      [L[1]('A').delete()],
    ])
    const copy = result.tokens.find((t) => t.float && t.text === 'A')!
    expect(copy).toBeDefined()
    // While alive (step 1) it sits at its displaced spot via a non-zero transform.
    expect(copy.steps[1].opacity).toBe(1)
    expect(copy.steps[1].transform).not.toBe('translate(0px,0px)')
    // When it dies (step 2) it must fade IN PLACE — same transform, opacity 0 — rather than
    // resetting to translate(0px,0px), which would fly it back to its DOM-home line.
    expect(copy.steps[2].opacity).toBe(0)
    expect(copy.steps[2].transform).toBe(copy.steps[1].transform)
  })
})
