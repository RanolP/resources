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

interface ExplanationPart {
  content: string
}

interface RawToken {
  content: string
  color?: string
  explanation?: ExplanationPart[]
}

interface ShikiHighlighter {
  codeToTokensBase(
    code: string,
    options: { lang: string; theme: string; includeExplanation?: boolean },
  ): Array<Array<RawToken>>
  // fallback for highlighters that only expose the merged API
  codeToTokens?(
    code: string,
    options: { lang: string; theme: string; includeExplanation?: boolean },
  ): { tokens: Array<Array<RawToken>> }
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
  // TextMate's tokenizeLine2 merges adjacent tokens that share color+fontStyle
  // (e.g. `fst(pair(` collapses into one token), which destroys the fine token
  // boundaries pattern selection relies on. includeExplanation gives us the
  // per-scope breakdown so we can split merged tokens back to grammar boundaries.
  const rawLines = hl.codeToTokensBase
    ? hl.codeToTokensBase(code, { lang, theme, includeExplanation: true })
    : hl.codeToTokens!(code, { lang, theme, includeExplanation: true }).tokens
  const lines: SourceLine[] = rawLines.map((lineTokens) => ({
    tokens: lineTokens
      .filter((t) => t.content !== '')
      .flatMap((t) => {
        const color = (t.color ?? '#24292f').toLowerCase()
        if (t.explanation && t.explanation.length > 1) {
          return t.explanation
            .filter((e) => e.content !== '')
            .map((e) => ({ text: e.content, color }))
        }
        return [{ text: t.content, color }]
      }),
  }))
  // Shiki always appends an empty trailing line — strip it
  if (lines.length > 0 && lines[lines.length - 1].tokens.every((t) => t.text === '')) {
    lines.pop()
  }
  return lines
}
