import { matchPattern } from './pattern.js'
import type {
  SourceLine,
  OperationDescriptor,
  WorkingState,
  WorkingToken,
  WorkingLine,
  CompiledToken,
  CompiledLine,
  TokenStepState,
} from './types.js'

// Opaque step index so we can append later
interface PartialToken {
  id: string
  text: string
  color: string
  stepStates: TokenStepState[]  // grows as we add steps
}

interface PartialLine {
  id: string
  stepStates: { visible: boolean }[]
}

function visibleState(text: string): TokenStepState {
  return { maxWidth: `${text.length}ch`, opacity: 1, transform: 'translate(0px,0px)' }
}

const hiddenState: TokenStepState = { maxWidth: '0ch', opacity: 0, transform: 'translate(0px,0px)' }

export function compile(
  initialLines: SourceLine[],
  steps: OperationDescriptor[][],
  // Optional tokenizer for re-highlighting replacements
  tokenize?: (code: string) => SourceLine[],
): { tokens: CompiledToken[]; lines: CompiledLine[]; stepCount: number; lineTokens: Record<string, string[]> } {
  let idCounter = 0
  const nextId = () => `t${idCounter++}`

  // Build initial working state from SourceLine[]
  const working: WorkingState = {
    lines: initialLines.map((sl, li) => ({
      id: `l${li}`,
      tokens: sl.tokens.map((st) => ({
        id: nextId(),
        text: st.text,
        color: st.color,
      })),
    })),
    nextId: idCounter,
  }

  // Partial records track all tokens/lines ever seen
  const tokMap = new Map<string, PartialToken>()
  const lineMap = new Map<string, PartialLine>()

  // Tracks how many steps have been snapshotted so far (for backfilling new tokens/lines)
  let snapshotCount = 0

  // Register initial tokens and lines
  for (const wl of working.lines) {
    lineMap.set(wl.id, { id: wl.id, stepStates: [] })
    for (const wt of wl.tokens) {
      tokMap.set(wt.id, { id: wt.id, text: wt.text, color: wt.color, stepStates: [] })
    }
  }

  // Helper: record the current working state as step N states
  function snapshotStep() {
    const liveTokenIds = new Set(working.lines.flatMap((l) => l.tokens.map((t) => t.id)))
    const liveLineIds = new Set(working.lines.map((l) => l.id))

    for (const [id, pt] of tokMap) {
      pt.stepStates.push(liveTokenIds.has(id) ? visibleState(pt.text) : hiddenState)
    }
    for (const [id, pl] of lineMap) {
      pl.stepStates.push({ visible: liveLineIds.has(id) })
    }
    snapshotCount++
  }

  // Snapshot step 0 (initial state)
  snapshotStep()

  // Capture line→token order from step-0 working state (for HTML emission)
  const lineTokens: Record<string, string[]> = {}
  for (const wl of working.lines) {
    lineTokens[wl.id] = wl.tokens.map((t) => t.id)
  }

  // Registration helpers that backfill hidden states for already-snapshotted steps
  function registerToken(id: string, text: string, color: string) {
    const pt: PartialToken = { id, text, color, stepStates: [] }
    // Backfill hidden states for all steps already snapshotted
    for (let i = 0; i < snapshotCount; i++) pt.stepStates.push(hiddenState)
    tokMap.set(id, pt)
  }

  function registerLine(id: string) {
    const pl: PartialLine = { id, stepStates: [] }
    for (let i = 0; i < snapshotCount; i++) pl.stepStates.push({ visible: false })
    lineMap.set(id, pl)
  }

  // Apply each step
  for (const ops of steps) {
    for (const op of ops) {
      applyOp(op, working, tokMap, lineMap, nextId, tokenize, registerToken, registerLine)
    }
    snapshotStep()
  }

  const stepCount = steps.length + 1

  const tokens: CompiledToken[] = [...tokMap.values()].map((pt) => ({
    id: pt.id,
    text: pt.text,
    color: pt.color,
    steps: pt.stepStates,
  }))

  const lines: CompiledLine[] = [...lineMap.values()].map((pl) => ({
    id: pl.id,
    steps: pl.stepStates,
  }))

  return { tokens, lines, stepCount, lineTokens }
}

function applyOp(
  op: OperationDescriptor,
  working: WorkingState,
  tokMap: Map<string, PartialToken>,
  lineMap: Map<string, PartialLine>,
  nextId: () => string,
  tokenize: ((code: string) => SourceLine[]) | undefined,
  registerToken: (id: string, text: string, color: string) => void,
  registerLine: (id: string) => void,
) {
  if (op.kind === 'delete-tokens') {
    const lines = filterLines(working, op.selection.lineFilter)
    for (const wl of lines) {
      const matches = matchPattern(op.selection.pattern, wl.tokens)
      const toDelete = new Set(matches.flatMap((m) => m.tokenIds))
      wl.tokens = wl.tokens.filter((t) => !toDelete.has(t.id))
    }
  } else if (op.kind === 'fold') {
    const lines = filterLines(working, op.selection.lineFilter)
    for (const wl of lines) {
      const matches = matchPattern(op.selection.pattern, wl.tokens)
      // Process matches in reverse order so indices stay valid
      for (const match of [...matches].reverse()) {
        const caps: Record<string, string> = match.captures
        const replacementText =
          typeof op.replacement === 'function' ? op.replacement(caps) : op.replacement

        // Get color via tokenizer or fallback to first matched token's color
        const firstTok = wl.tokens.find((t) => t.id === match.tokenIds[0])
        const repColor = getReplacementColor(replacementText, tokenize, firstTok?.color ?? '#24292f')

        const newTok: WorkingToken = {
          id: nextId(),
          text: replacementText,
          color: repColor,
        }
        registerToken(newTok.id, newTok.text, newTok.color)

        // Replace matched tokens with the new single token
        const firstIdx = wl.tokens.findIndex((t) => t.id === match.tokenIds[0])
        const lastIdx  = wl.tokens.findIndex((t) => t.id === match.tokenIds[match.tokenIds.length - 1])
        wl.tokens = [
          ...wl.tokens.slice(0, firstIdx),
          newTok,
          ...wl.tokens.slice(lastIdx + 1),
        ]
      }
    }
  } else if (op.kind === 'delete-line') {
    const idx = op.lineIndex
    if (idx >= 0 && idx < working.lines.length) {
      working.lines.splice(idx, 1)
    }
  } else if (op.kind === 'insert-line') {
    const text = op.text
    const color = '#24292f'
    const newLine: WorkingLine = {
      id: `l${nextId()}`,
      tokens: tokenize
        ? tokenize(text)
            .flatMap((sl) => sl.tokens)
            .map((st) => ({ id: nextId(), text: st.text, color: st.color }))
        : [{ id: nextId(), text, color }],
    }
    registerLine(newLine.id)
    newLine.tokens.forEach((t) => registerToken(t.id, t.text, t.color))
    const insertAt = op.position === 'before' ? op.lineIndex : op.lineIndex + 1
    working.lines.splice(insertAt, 0, newLine)
  } else if (op.kind === 'move') {
    const srcLines = filterLines(working, op.selection.lineFilter)
    for (const wl of srcLines) {
      const matches = matchPattern(op.selection.pattern, wl.tokens)
      for (const match of [...matches].reverse()) {
        const movedText = match.tokenIds
          .map((id) => wl.tokens.find((t) => t.id === id)?.text ?? '')
          .join('')
        const movedColor = wl.tokens.find((t) => t.id === match.tokenIds[0])?.color ?? '#24292f'

        // Delete source tokens FIRST so anchorIdx is computed on the updated array
        const firstIdx = wl.tokens.findIndex((t) => t.id === match.tokenIds[0])
        const lastIdx  = wl.tokens.findIndex((t) => t.id === match.tokenIds[match.tokenIds.length - 1])
        wl.tokens = [...wl.tokens.slice(0, firstIdx), ...wl.tokens.slice(lastIdx + 1)]

        // Now resolve anchor (wl may === anchorLine — already mutated above)
        const anchorFilter = op.anchor.selection.lineFilter
        const anchorLines = filterLines(working, anchorFilter)
        for (const anchorLine of anchorLines) {
          const anchorMatches = matchPattern(op.anchor.selection.pattern, anchorLine.tokens)
          if (anchorMatches.length === 0) continue
          const anchorMatch = anchorMatches[0]
          const anchorIdx = op.anchor.side === 'before'
            ? anchorLine.tokens.findIndex((t) => t.id === anchorMatch.tokenIds[0])
            : anchorLine.tokens.findIndex((t) => t.id === anchorMatch.tokenIds[anchorMatch.tokenIds.length - 1]) + 1

          const newTok: WorkingToken = { id: nextId(), text: movedText, color: movedColor }
          registerToken(newTok.id, newTok.text, newTok.color)
          anchorLine.tokens.splice(anchorIdx, 0, newTok)
          break
        }
      }
    }
  }
}

function filterLines(working: WorkingState, filter: import('./types.js').LineFilter): WorkingLine[] {
  if (filter.kind === 'all') return working.lines
  if (filter.kind === 'single') return working.lines[filter.index] ? [working.lines[filter.index]] : []
  return working.lines.slice(filter.from, filter.to + 1)
}

function getReplacementColor(
  text: string,
  tokenize: ((code: string) => SourceLine[]) | undefined,
  fallback: string,
): string {
  if (!tokenize) return fallback
  const lines = tokenize(text)
  return lines[0]?.tokens[0]?.color ?? fallback
}
