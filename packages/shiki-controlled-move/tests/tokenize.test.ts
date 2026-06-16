import { describe, it, expect } from 'vitest'
import { createTokenizer } from '../src/tokenize.js'

const simpleGrammar = {
  name: 'testlang',
  scopeName: 'source.testlang',
  patterns: [
    { match: '\\b\\d+\\b', name: 'constant.numeric.testlang' },
    { match: '\\b[a-z]+\\b', name: 'variable.other.testlang' },
  ],
  repository: {},
}

describe('createTokenizer', () => {
  it('tokenizes a single line into tokens with text and color', () => {
    const tokenize = createTokenizer({ kind: 'grammar', grammar: simpleGrammar })
    const lines = tokenize('42 hello')
    expect(lines).toHaveLength(1)
    expect(lines[0].tokens[0].text).toBe('42')
    expect(lines[0].tokens[0].color).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('produces one SourceLine per newline', () => {
    const tokenize = createTokenizer({ kind: 'grammar', grammar: simpleGrammar })
    const lines = tokenize('abc\n123')
    expect(lines).toHaveLength(2)
    expect(lines[0].tokens[0].text).toBe('abc')
    expect(lines[1].tokens[0].text).toBe('123')
  })

  it('trims trailing empty line from Shiki output', () => {
    const tokenize = createTokenizer({ kind: 'grammar', grammar: simpleGrammar })
    const lines = tokenize('abc\n')
    // Shiki adds an empty trailing line — we strip it
    expect(lines).toHaveLength(1)
  })

  it('normalizes colors to lowercase hex', () => {
    const tokenize = createTokenizer({ kind: 'grammar', grammar: simpleGrammar })
    const lines = tokenize('42')
    expect(lines[0].tokens[0].color).toBe(lines[0].tokens[0].color.toLowerCase())
  })
})
