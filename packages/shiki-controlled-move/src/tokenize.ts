import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import githubLightDefault from 'shiki/themes/github-light-default.mjs'
import type { SourceLine } from './types.js'

interface TextMateGrammar {
  name: string
  scopeName: string
  displayName?: string
  patterns: unknown[]
  repository: Record<string, unknown>
}

interface ShikiHighlighter {
  codeToTokens(
    code: string,
    options: { lang: string; theme: string },
  ): { tokens: Array<Array<{ content: string; color?: string }>> }
}

export type TokenizerInput =
  | { kind: 'grammar'; grammar: TextMateGrammar; theme?: string }
  | { kind: 'highlighter'; hl: ShikiHighlighter; lang: string; theme?: string }

const DEFAULT_THEME = 'github-light-default'

export function createTokenizer(input: TokenizerInput): (code: string) => SourceLine[] {
  if (input.kind === 'grammar') {
    const theme = input.theme ?? DEFAULT_THEME
    const hl = createHighlighterCoreSync({
      themes: [githubLightDefault],
      langs: [input.grammar as never],
      engine: createJavaScriptRegexEngine(),
    })
    return (code) => extractLines(hl, input.grammar.name, theme, code)
  }
  const theme = input.theme ?? DEFAULT_THEME
  return (code) => extractLines(input.hl, input.lang, theme, code)
}

function extractLines(
  hl: ShikiHighlighter,
  lang: string,
  theme: string,
  code: string,
): SourceLine[] {
  const { tokens } = hl.codeToTokens(code, { lang, theme })
  const lines: SourceLine[] = tokens.map((lineTokens) => ({
    tokens: lineTokens.map((t) => ({
      text: t.content,
      color: (t.color ?? '#24292f').toLowerCase(),
    })),
  }))
  // Shiki always appends an empty trailing line — strip it
  if (lines.length > 0 && lines[lines.length - 1].tokens.every((t) => t.text === '')) {
    lines.pop()
  }
  return lines
}
