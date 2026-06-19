import { describe, it, expect } from 'vitest'
import { compile } from '../src/compile.js'
import { L } from '../src/pattern.js'
import type { SourceLine } from '../src/types.js'

// A minimal tokenizer stub
function lines(code: string): SourceLine[] {
  return code.split('\n').map((text) => ({
    tokens: [{ text, color: '#000000' }],
  }))
}

describe('compile', () => {
  it('produces one step state per step including step 0', () => {
    const result = compile(lines('a + b'), [[L('a').delete()]])
    // stepCount = 2 (step 0 = initial, step 1 = after delete)
    expect(result.stepCount).toBe(2)
    result.tokens.forEach((t) => expect(t.steps).toHaveLength(2))
  })

  it('token is visible at step 0, hidden at step 1 after delete', () => {
    const result = compile(lines('abc'), [[L('abc').delete()]])
    const tok = result.tokens.find((t) => t.text === 'abc')!
    expect(tok.steps[0].opacity).toBe(1)
    expect(tok.steps[1].opacity).toBe(0)
  })

  it('foldTo hides old tokens and shows new token at step 1', () => {
    const initial = lines('1 + 1')
    const result = compile(initial, [[L('1 + 1').foldTo('2')]])
    const oldTok = result.tokens.find((t) => t.text === '1 + 1')!
    const newTok = result.tokens.find((t) => t.text === '2')!
    expect(oldTok.steps[0].opacity).toBe(1)
    expect(oldTok.steps[1].opacity).toBe(0)
    expect(newTok.steps[0].opacity).toBe(0)
    expect(newTok.steps[1].opacity).toBe(1)
  })

  it('foldTo with callback computes replacement at compile time', () => {
    const twoTokenLine: SourceLine[] = [{
      tokens: [
        { text: '3', color: '#000' },
        { text: ' + ', color: '#000' },
        { text: '4', color: '#000' },
      ],
    }]
    const result = compile(twoTokenLine, [[L('$A + $B').foldTo(($) => String(+$.A + +$.B))]])
    expect(result.tokens.some((t) => t.text === '7')).toBe(true)
  })

  it('line delete makes line invisible at step 1', () => {
    const result = compile(lines('hello'), [[L[0].delete()]])
    const line = result.lines[0]
    expect(line.steps[0].visible).toBe(true)
    expect(line.steps[1].visible).toBe(false)
  })

  it('maxWidth is set to text length in ch', () => {
    const result = compile(lines('abc'), [])
    const tok = result.tokens[0]
    expect(tok.steps[0].maxWidth).toBe('3ch')
  })

  it('returns lineTokens mapping each line id to its initial token ids', () => {
    const result = compile(lines('abc'), [])
    const lineId = result.lines[0].id
    expect(result.lineTokens[lineId]).toEqual([result.tokens[0].id])
  })

  it('cross-line move gives a non-zero vertical (em) transform', () => {
    // Move 'abc' (line 0) to after 'xyz' (line 1): its DOM slot stays on line 0 while
    // its logical row becomes line 1, so the transform must carry a vertical (em) offset.
    const result = compile(lines('abc\nxyz'), [
      [L[0]('abc').moveTo(L[1]('xyz').after())],
    ])
    const tok = result.tokens.find((t) => t.text === 'abc')!
    expect(tok.float).toBe(true)
    const dyMatch = /,(-?\d*\.?\d+)em\)/.exec(tok.steps[1].transform)
    expect(dyMatch).not.toBeNull()
    expect(Number(dyMatch![1])).not.toBe(0)
  })

  it('moved token stays opacity 1 after its source line is deleted', () => {
    const result = compile(lines('abc\nxyz'), [
      [L[0]('abc').moveTo(L[1]('xyz').after())],
      [L[0].delete()],
    ])
    const tok = result.tokens.find((t) => t.text === 'abc')!
    // Still logically live (now in line 1), so it must not fade out with its old line.
    expect(tok.steps[2].opacity).toBe(1)
  })

  it('foldTo new token is included in lineTokens', () => {
    const initial = lines('1 + 1')
    const result = compile(initial, [[L('1 + 1').foldTo('2')]])
    const lineId = result.lines[0].id
    const newTok = result.tokens.find((t) => t.text === '2')!
    expect(result.lineTokens[lineId]).toContain(newTok.id)
  })
})
