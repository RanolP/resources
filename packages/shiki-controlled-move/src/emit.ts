import type { CompiledToken, CompiledLine, TokenStepState } from './types.js'

export interface EmitInput {
  tokens: CompiledToken[]
  lines: CompiledLine[]
  lineTokens: Record<string, string[]>  // lineId → ordered token IDs
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stateToStyle(state: TokenStepState, color: string): string {
  return [
    `color:${color}`,
    `max-width:${state.maxWidth}`,
    `opacity:${state.opacity}`,
    `transform:${state.transform}`,
  ].join(';')
}

export function emitHtml(input: EmitInput): string {
  const tokById = new Map(input.tokens.map((t) => [t.id, t]))

  let html = '<pre class="scm-frame">'

  for (const line of input.lines) {
    const tokenIds = input.lineTokens[line.id] ?? []
    const step0Line = line.steps[0]
    const lineStyle = step0Line.visible
      ? 'display:block;height:1.5em;overflow:visible;'
      : 'display:block;height:0;overflow:visible;opacity:0;'

    html += `<span class="scm-line" data-line-id="${escapeHtml(line.id)}" style="${lineStyle}">`

    for (const tokId of tokenIds) {
      const tok = tokById.get(tokId)
      if (!tok) continue
      const step0 = tok.steps[0]
      const style = stateToStyle(step0, tok.color)
      html += `<span id="${escapeHtml(tok.id)}" class="scm-tok" style="${style};display:inline-block;overflow:hidden;vertical-align:top;white-space:pre;">${escapeHtml(tok.text)}</span>`
    }

    html += '</span>'
  }

  html += '</pre>'
  return html
}
