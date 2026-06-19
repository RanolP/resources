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

  // Frame is the single clip boundary: a cross-line moved token leaves its source
  // `.scm-line` and travels through the frame, so the line must NOT clip — the frame does.
  let html = '<pre class="scm-frame" style="overflow:hidden;">'

  for (const line of input.lines) {
    const tokenIds = input.lineTokens[line.id] ?? []
    const step0Line = line.steps[0]
    // overflow:visible so a token mid-move can render outside its line box. A hidden line
    // collapses via height only (no opacity) — its deleted static text is already hidden
    // per-token, and keeping line opacity would fade a moved-away (still-live) token that
    // is still parented in a now-deleted source line.
    const lineStyle = step0Line.visible
      ? 'display:block;height:1.5em;overflow:visible;'
      : 'display:block;height:0;overflow:visible;'

    html += `<span class="scm-line" data-line-id="${escapeHtml(line.id)}" style="${lineStyle}">`

    for (const tokId of tokenIds) {
      const tok = tokById.get(tokId)
      if (!tok) continue
      const step0 = tok.steps[0]
      const style = stateToStyle(step0, tok.color)
      // Moved tokens slide via transform with a collapsing flow footprint — they must
      // not clip their own content, and should paint above the tokens they pass over.
      const overflow = tok.float
        ? 'overflow:visible;position:relative;z-index:1;'
        : 'overflow:hidden;'
      html += `<span id="${escapeHtml(tok.id)}" class="scm-tok" style="${style};display:inline-block;${overflow}vertical-align:top;white-space:pre;">${escapeHtml(tok.text)}</span>`
    }

    html += '</span>'
  }

  html += '</pre>'
  return html
}
