import { describe, it, expect } from 'vitest'
import { parsePattern, matchPattern } from '../src/pattern.js'
import type { WorkingToken } from '../src/types.js'

const tok = (text: string): WorkingToken => ({ id: 't0', text, color: '#000' })

describe('parsePattern', () => {
  it('parses a literal pattern into a single literal part', () => {
    const parts = parsePattern('1 + 1')
    expect(parts).toEqual([{ kind: 'literal', text: '1 + 1' }])
  })

  it('parses $NAME into a capture part', () => {
    const parts = parsePattern('$A')
    expect(parts).toEqual([{ kind: 'capture', name: 'A' }])
  })

  it('parses mixed pattern into ordered parts', () => {
    const parts = parsePattern('$A + $B')
    expect(parts).toEqual([
      { kind: 'capture', name: 'A' },
      { kind: 'literal', text: ' + ' },
      { kind: 'capture', name: 'B' },
    ])
  })
})

describe('matchPattern', () => {
  it('finds a literal match and returns token ids', () => {
    const tokens: WorkingToken[] = [
      { id: 'a', text: '1', color: '#000' },
      { id: 'b', text: ' + ', color: '#000' },
      { id: 'c', text: '1', color: '#000' },
    ]
    const matches = matchPattern('1 + 1', tokens)
    expect(matches).toHaveLength(1)
    expect(matches[0].tokenIds).toEqual(['a', 'b', 'c'])
    expect(matches[0].captures).toEqual({})
  })

  it('finds multiple non-overlapping matches of the same pattern', () => {
    const tokens: WorkingToken[] = [
      { id: 'a', text: '1', color: '#000' },
      { id: 'b', text: ' + ', color: '#000' },
      { id: 'c', text: '1', color: '#000' },
      { id: 'd', text: ' + ', color: '#000' },
      { id: 'e', text: '1', color: '#000' },
    ]
    const matches = matchPattern('1 + 1', tokens)
    expect(matches).toHaveLength(2)
  })

  it('captures $NAME groups', () => {
    const tokens: WorkingToken[] = [
      { id: 'a', text: '2', color: '#000' },
      { id: 'b', text: ' + ', color: '#000' },
      { id: 'c', text: '3', color: '#000' },
    ]
    const matches = matchPattern('$A + $B', tokens)
    expect(matches).toHaveLength(1)
    expect(matches[0].captures).toEqual({ A: '2', B: '3' })
    expect(matches[0].tokenIds).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array when pattern has no match', () => {
    const tokens: WorkingToken[] = [{ id: 'a', text: 'hello', color: '#000' }]
    const matches = matchPattern('xyz', tokens)
    expect(matches).toHaveLength(0)
  })
})
