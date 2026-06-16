import { createTokenizer, type TokenizerInput } from './tokenize.js'
import { compile } from './compile.js'
import { emitHtml } from './emit.js'
import { createAnimatedComponent } from './component.js'
import type { OperationDescriptor, CompiledAnimation } from './types.js'

class AnimationBuilder {
  private readonly steps: OperationDescriptor[][] = []

  constructor(
    private readonly code: string,
    private readonly input: TokenizerInput,
  ) {}

  step(...ops: OperationDescriptor[]): AnimationBuilderWithStep {
    this.steps.push(ops)
    return new AnimationBuilderWithStep(this.code, this.input, this.steps)
  }
}

class AnimationBuilderWithStep {
  constructor(
    private readonly code: string,
    private readonly input: TokenizerInput,
    private readonly steps: OperationDescriptor[][],
  ) {}

  step(...ops: OperationDescriptor[]): AnimationBuilderWithStep {
    this.steps.push(ops)
    return this
  }

  private _compiled: ReturnType<typeof createAnimatedComponent> | null = null

  private build() {
    if (this._compiled) return this._compiled
    const tokenize = createTokenizer(this.input)
    const initialLines = tokenize(this.code)
    const { tokens, lines, stepCount, lineTokens } = compile(initialLines, this.steps, tokenize)

    const animation: CompiledAnimation = {
      html: emitHtml({ tokens, lines, lineTokens }),
      tokens,
      lines,
      stepCount,
    }
    this._compiled = createAnimatedComponent(animation)
    return this._compiled
  }

  get setup() { return this.build().setup }
  get name() { return this.build().name }
  get props() { return this.build().props }
  get render() { return (this.build() as { render?: unknown }).render }
  get component() { return this.build() }
}

interface TextMateGrammar {
  name: string
  scopeName: string
  displayName?: string
  patterns: unknown[]
  repository: Record<string, unknown>
}

interface ShikiHighlighter {
  codeToTokens(code: string, options: { lang: string; theme: string }): {
    tokens: Array<Array<{ content: string; color?: string }>>
  }
}

export function shikiControlledMove(grammar: TextMateGrammar, options?: { theme?: string }): (strings: TemplateStringsArray) => AnimationBuilder
export function shikiControlledMove(hl: ShikiHighlighter, lang: string, options?: { theme?: string }): (strings: TemplateStringsArray) => AnimationBuilder
export function shikiControlledMove(
  grammarOrHl: TextMateGrammar | ShikiHighlighter,
  langOrOptions?: string | { theme?: string },
  options?: { theme?: string },
) {
  const input: TokenizerInput = typeof langOrOptions === 'string'
    ? { kind: 'highlighter', hl: grammarOrHl as ShikiHighlighter, lang: langOrOptions, theme: options?.theme }
    : { kind: 'grammar', grammar: grammarOrHl as TextMateGrammar, theme: (langOrOptions as { theme?: string } | undefined)?.theme }

  return (strings: TemplateStringsArray) => {
    const code = strings.raw[0].replace(/^\n/, '').replace(/\n\s*$/, '')
    return new AnimationBuilder(code, input)
  }
}
