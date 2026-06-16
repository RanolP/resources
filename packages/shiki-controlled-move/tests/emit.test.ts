import { describe, it, expect } from 'vitest'
import { emitHtml } from '../src/emit.js'
import type { CompiledToken, CompiledLine } from '../src/types.js'

function makeToken(id: string, text: string, color: string, steps: { maxWidth: string; opacity: number; transform: string }[]): CompiledToken {
  return { id, text, color, steps }
}

describe('emitHtml', () => {
  it('wraps each line in a span with data-line-id', () => {
    const lines: CompiledLine[] = [{ id: 'l0', steps: [{ visible: true }] }]
    const tokens: CompiledToken[] = [
      makeToken('t0', 'hello', '#24292f', [{ maxWidth: '5ch', opacity: 1, transform: 'translate(0px,0px)' }]),
    ]
    const html = emitHtml({ tokens, lines, lineTokens: { l0: ['t0'] } })
    expect(html).toContain('data-line-id="l0"')
  })

  it('renders each token as a span with id and step-0 inline style', () => {
    const lines: CompiledLine[] = [{ id: 'l0', steps: [{ visible: true }] }]
    const tokens: CompiledToken[] = [
      makeToken('t0', 'abc', '#0550ae', [{ maxWidth: '3ch', opacity: 1, transform: 'translate(0px,0px)' }]),
    ]
    const html = emitHtml({ tokens, lines, lineTokens: { l0: ['t0'] } })
    expect(html).toContain('id="t0"')
    expect(html).toContain('color:#0550ae')
    expect(html).toContain('max-width:3ch')
  })

  it('escapes HTML special characters in token text', () => {
    const lines: CompiledLine[] = [{ id: 'l0', steps: [{ visible: true }] }]
    const tokens: CompiledToken[] = [
      makeToken('t0', 'a<b>', '#000', [{ maxWidth: '4ch', opacity: 1, transform: 'translate(0px,0px)' }]),
    ]
    const html = emitHtml({ tokens, lines, lineTokens: { l0: ['t0'] } })
    expect(html).toContain('a&lt;b&gt;')
    expect(html).not.toContain('a<b>')
  })
})
