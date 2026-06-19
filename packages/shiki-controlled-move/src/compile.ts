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

  // lineOrder: visual order of all line IDs (including deleted ones). Insertions splice here.
  const lineOrder: string[] = working.lines.map((wl) => wl.id)

  // lineCurrentTokens: tracks current token IDs per line for pattern matching (mutated by ops)
  const lineCurrentTokens: Record<string, string[]> = {}
  // lineAllTokens: accumulates ALL token IDs ever in a line in DOM order (append-only, for emitHtml)
  const lineAllTokens: Record<string, string[]> = {}
  for (const wl of working.lines) {
    lineCurrentTokens[wl.id] = wl.tokens.map((t) => t.id)
    lineAllTokens[wl.id] = wl.tokens.map((t) => t.id)
  }

  // displaced: tokens whose DOM slot (source) differs from their logical position
  // (destination) after a move. They keep their source DOM element and slide to the
  // destination via a transform — a true interpolation, not hide-at-source/show-at-dest.
  const displaced = new Set<string>()

  // Last live transform per token. When a displaced token (a copy/move that is held at its
  // visual spot by a non-zero transform) later dies, it must fade OUT in place — not snap to
  // translate(0,0), which is its DOM-home origin on another line and would make it fly back
  // there while fading. So we remember the transform it had while alive and reuse it on death.
  const lastTransform = new Map<string, string>()

  // Helper: record the current working state as step N states.
  // Each token gets two positions: its DOM-flow position (walking lineAllTokens, where a
  // displaced token contributes zero width so the source gap closes) and its logical
  // position (walking working.lines). The transform = logical - DOM, so a moved token
  // interpolates from its source slot to its destination as the step animates.
  function snapshotStep() {
    const liveTokenIds = new Set(working.lines.flatMap((l) => l.tokens.map((t) => t.id)))
    const liveLineIds = new Set(working.lines.map((l) => l.id))

    const textLen = (id: string) => tokMap.get(id)?.text.length ?? 0

    // DOM layout: visible lines in visual order, summing footprints
    const domCol = new Map<string, number>()
    const domRow = new Map<string, number>()
    let domRowCounter = 0
    for (const lineId of lineOrder) {
      // Assign every line (live or not) a row, but only advance the counter for live lines.
      // A deleted line therefore gets the row of the next visible line it collapsed into
      // (height 0), so a displaced token orphaned in a deleted source line still gets a
      // correct domRow and its transform keeps pointing at the live destination.
      const row = domRowCounter
      if (liveLineIds.has(lineId)) domRowCounter++
      let col = 0
      for (const tid of lineAllTokens[lineId] ?? []) {
        domCol.set(tid, col)
        domRow.set(tid, row)
        const footprint = liveTokenIds.has(tid) && !displaced.has(tid) ? textLen(tid) : 0
        col += footprint
      }
    }

    // Logical layout: working.lines is the true current order/position
    const logCol = new Map<string, number>()
    const logRow = new Map<string, number>()
    working.lines.forEach((wl, row) => {
      let col = 0
      for (const t of wl.tokens) {
        logCol.set(t.id, col)
        logRow.set(t.id, row)
        col += textLen(t.id)
      }
    })

    for (const [id, pt] of tokMap) {
      if (!liveTokenIds.has(id)) {
        // A dead displaced token fades out in place at its last position; everything else
        // collapses at its own DOM slot (transform 0,0).
        const lt = displaced.has(id) ? lastTransform.get(id) : undefined
        pt.stepStates.push(lt ? { maxWidth: '0ch', opacity: 0, transform: lt } : hiddenState)
        continue
      }
      const footprint = displaced.has(id) ? 0 : pt.text.length
      const dCol = domCol.get(id) ?? 0
      const dRow = domRow.get(id) ?? 0
      const lCol = logCol.has(id) ? logCol.get(id)! : dCol
      const lRow = logRow.has(id) ? logRow.get(id)! : dRow
      const dx = lCol - dCol
      const dy = (lRow - dRow) * 1.5
      const transform = dx === 0 && dy === 0 ? 'translate(0px,0px)' : `translate(${dx}ch,${dy}em)`
      lastTransform.set(id, transform)
      pt.stepStates.push({ maxWidth: `${footprint}ch`, opacity: 1, transform })
    }
    for (const [id, pl] of lineMap) {
      pl.stepStates.push({ visible: liveLineIds.has(id) })
    }
    snapshotCount++
  }

  // Snapshot step 0 (initial state)
  snapshotStep()

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
      applyOp(op, working, tokMap, lineMap, nextId, tokenize, registerToken, registerLine, lineCurrentTokens, lineAllTokens, lineOrder, displaced)
    }
    snapshotStep()
  }

  const stepCount = steps.length + 1

  const tokens: CompiledToken[] = [...tokMap.values()].map((pt) => ({
    id: pt.id,
    text: pt.text,
    color: pt.color,
    steps: pt.stepStates,
    float: displaced.has(pt.id),
  }))

  // lines ordered by lineOrder (visual order) so emitHtml renders them in correct position
  const lineById = new Map([...lineMap.entries()].map(([id, pl]) => [id, { id: pl.id, steps: pl.stepStates }]))
  const lines: CompiledLine[] = lineOrder.map((id) => lineById.get(id)!).filter(Boolean)

  return { tokens, lines, stepCount, lineTokens: lineAllTokens }
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
  lineCurrentTokens: Record<string, string[]>,
  lineAllTokens: Record<string, string[]>,
  lineOrder: string[],
  displaced: Set<string>,
) {
  if (op.kind === 'delete-tokens') {
    const lines = filterLines(working, op.selection.lineFilter)
    for (const wl of lines) {
      const matches = matchPattern(op.selection.pattern, wl.tokens, op.selection.focus, op.selection.nth)
      const toDelete = new Set(matches.flatMap((m) => m.tokenIds))
      wl.tokens = wl.tokens.filter((t) => !toDelete.has(t.id))
      // Keep lineCurrentTokens in sync; lineAllTokens keeps deleted tokens (they animate out)
      lineCurrentTokens[wl.id] = wl.tokens.map((t) => t.id)
    }
  } else if (op.kind === 'fold') {
    const lines = filterLines(working, op.selection.lineFilter)
    for (const wl of lines) {
      const matches = matchPattern(op.selection.pattern, wl.tokens, op.selection.focus, op.selection.nth)
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

        // Replace matched tokens with the new single token in working state
        const firstIdx = wl.tokens.findIndex((t) => t.id === match.tokenIds[0])
        const lastIdx  = wl.tokens.findIndex((t) => t.id === match.tokenIds[match.tokenIds.length - 1])
        wl.tokens = [
          ...wl.tokens.slice(0, firstIdx),
          newTok,
          ...wl.tokens.slice(lastIdx + 1),
        ]

        // lineCurrentTokens: replace matched IDs with newTok.id
        const ltIds = lineCurrentTokens[wl.id]
        if (ltIds) {
          const firstLtIdx = ltIds.indexOf(match.tokenIds[0])
          const lastLtIdx  = ltIds.indexOf(match.tokenIds[match.tokenIds.length - 1])
          if (firstLtIdx !== -1 && lastLtIdx !== -1) {
            lineCurrentTokens[wl.id] = [
              ...ltIds.slice(0, firstLtIdx),
              newTok.id,
              ...ltIds.slice(lastLtIdx + 1),
            ]
          }
        }

        // lineAllTokens: insert newTok after the last matched token (old tokens stay for animation)
        const allIds = lineAllTokens[wl.id]
        if (allIds) {
          const lastMatchedId = match.tokenIds[match.tokenIds.length - 1]
          const insertAfterIdx = allIds.lastIndexOf(lastMatchedId)
          if (insertAfterIdx !== -1) {
            lineAllTokens[wl.id] = [
              ...allIds.slice(0, insertAfterIdx + 1),
              newTok.id,
              ...allIds.slice(insertAfterIdx + 1),
            ]
          } else {
            lineAllTokens[wl.id] = [...allIds, newTok.id]
          }
        }
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
    const tokenIds = newLine.tokens.map((t) => t.id)
    lineCurrentTokens[newLine.id] = tokenIds
    lineAllTokens[newLine.id] = [...tokenIds]
    // Capture reference line ID before splice (working.lines[op.lineIndex] shifts after)
    const refLineId = working.lines[op.lineIndex]?.id
    const insertAt = op.position === 'before' ? op.lineIndex : op.lineIndex + 1
    working.lines.splice(insertAt, 0, newLine)
    // Mirror into lineOrder so emitHtml renders lines in correct visual order
    const refOrderIdx = refLineId !== undefined ? lineOrder.indexOf(refLineId) : -1
    if (refOrderIdx !== -1) {
      const spliceAt = op.position === 'before' ? refOrderIdx : refOrderIdx + 1
      lineOrder.splice(spliceAt, 0, newLine.id)
    } else {
      lineOrder.push(newLine.id)
    }
  } else if (op.kind === 'move') {
    const srcLines = filterLines(working, op.selection.lineFilter)
    for (const wl of srcLines) {
      const matches = matchPattern(op.selection.pattern, wl.tokens, op.selection.focus, op.selection.nth)
      for (const match of [...matches].reverse()) {
        // Keep the SAME token objects — identity is preserved so they slide rather than
        // being deleted at the source and recreated at the destination.
        const movedTokens = match.tokenIds
          .map((id) => wl.tokens.find((t) => t.id === id))
          .filter((t): t is WorkingToken => t !== undefined)
        if (movedTokens.length === 0) continue

        // Remove from the source logical line. lineAllTokens still holds them at the
        // source DOM slot (that element is the one that visibly slides to the anchor).
        const movedSet = new Set(movedTokens.map((t) => t.id))
        wl.tokens = wl.tokens.filter((t) => !movedSet.has(t.id))
        lineCurrentTokens[wl.id] = wl.tokens.map((t) => t.id)

        // Resolve anchor (wl may === anchorLine — already mutated above)
        const anchorLines = filterLines(working, op.anchor.selection.lineFilter)
        for (const anchorLine of anchorLines) {
          const anchorMatches = matchPattern(op.anchor.selection.pattern, anchorLine.tokens, op.anchor.selection.focus, op.anchor.selection.nth)
          if (anchorMatches.length === 0) continue
          const anchorMatch = anchorMatches[0]
          const anchorIdx = op.anchor.side === 'before'
            ? anchorLine.tokens.findIndex((t) => t.id === anchorMatch.tokenIds[0])
            : anchorLine.tokens.findIndex((t) => t.id === anchorMatch.tokenIds[anchorMatch.tokenIds.length - 1]) + 1

          // Insert the same tokens at the logical destination (identity preserved)
          anchorLine.tokens.splice(anchorIdx, 0, ...movedTokens)
          lineCurrentTokens[anchorLine.id] = anchorLine.tokens.map((t) => t.id)
          // Mark displaced: DOM stays at source, transform slides them to the destination
          for (const t of movedTokens) displaced.add(t.id)
          break
        }
      }
    }
  } else if (op.kind === 'copy') {
    // Like move, but the originals stay put. New duplicate tokens are created whose DOM home
    // is the source line (spliced in just before the first original, so they peel off it) and
    // whose logical home is the anchor destination. They are marked displaced, so snapshotStep
    // glides them from source to destination while the originals stay full-width, transform 0.
    const srcLines = filterLines(working, op.selection.lineFilter)
    for (const wl of srcLines) {
      const matches = matchPattern(op.selection.pattern, wl.tokens, op.selection.focus, op.selection.nth)
      for (const match of [...matches].reverse()) {
        const sourceTokens = match.tokenIds
          .map((id) => wl.tokens.find((t) => t.id === id))
          .filter((t): t is WorkingToken => t !== undefined)
        if (sourceTokens.length === 0) continue

        // Create duplicate tokens (new ids, same text/color). registerToken backfills hidden
        // states for prior steps so they only appear from this step onward.
        const copies: WorkingToken[] = sourceTokens.map((t) => ({ id: nextId(), text: t.text, color: t.color }))
        copies.forEach((t) => registerToken(t.id, t.text, t.color))

        // DOM home = source line: splice the copy ids immediately before the first original id,
        // so copies share the originals' start column and visibly peel off them.
        const allIds = lineAllTokens[wl.id]
        if (allIds) {
          const copyIds = copies.map((t) => t.id)
          // Anchor at the source's first token. When that token is itself displaced (its DOM
          // slot lives on another line after an earlier move/copy), it is absent from this
          // line's DOM list, so fall back to its *logical* column: splice after the nearest
          // preceding logical token that does have a DOM slot here (or before the nearest
          // following one), not at the end of the line.
          let domIdx = allIds.indexOf(sourceTokens[0].id)
          if (domIdx === -1) {
            const logical = lineCurrentTokens[wl.id] ?? []
            const srcLogIdx = logical.indexOf(sourceTokens[0].id)
            domIdx = allIds.length // fallback: append at end
            let found = false
            // nearest preceding logical token that has a DOM slot here → splice after it
            for (let i = srcLogIdx - 1; i >= 0 && !found; i--) {
              const di = allIds.indexOf(logical[i])
              if (di !== -1) { domIdx = di + 1; found = true }
            }
            // else nearest following logical token with a DOM slot → splice before it
            for (let i = srcLogIdx + 1; i < logical.length && !found; i++) {
              const di = allIds.indexOf(logical[i])
              if (di !== -1) { domIdx = di; found = true }
            }
          }
          lineAllTokens[wl.id] = [...allIds.slice(0, domIdx), ...copyIds, ...allIds.slice(domIdx)]
        }

        // Logical home = destination: resolve anchor exactly as move does.
        const anchorLines = filterLines(working, op.anchor.selection.lineFilter)
        for (const anchorLine of anchorLines) {
          const anchorMatches = matchPattern(op.anchor.selection.pattern, anchorLine.tokens, op.anchor.selection.focus, op.anchor.selection.nth)
          if (anchorMatches.length === 0) continue
          const anchorMatch = anchorMatches[0]
          const anchorIdx = op.anchor.side === 'before'
            ? anchorLine.tokens.findIndex((t) => t.id === anchorMatch.tokenIds[0])
            : anchorLine.tokens.findIndex((t) => t.id === anchorMatch.tokenIds[anchorMatch.tokenIds.length - 1]) + 1

          anchorLine.tokens.splice(anchorIdx, 0, ...copies)
          lineCurrentTokens[anchorLine.id] = anchorLine.tokens.map((t) => t.id)
          for (const t of copies) displaced.add(t.id)
          break
        }
      }
    }
  } else if (op.kind === 'insert-tokens') {
    // Insert new tokens at an anchor (L[n]('pat').after()/before()). They grow in from
    // this step while following tokens shift to make room — like a fold's replacement,
    // but without removing anything.
    const anchorLines = filterLines(working, op.anchor.selection.lineFilter)
    for (const anchorLine of anchorLines) {
      const anchorMatches = matchPattern(op.anchor.selection.pattern, anchorLine.tokens, op.anchor.selection.focus, op.anchor.selection.nth)
      if (anchorMatches.length === 0) continue
      const anchorMatch = anchorMatches[0]
      const anchorIdx = op.anchor.side === 'before'
        ? anchorLine.tokens.findIndex((t) => t.id === anchorMatch.tokenIds[0])
        : anchorLine.tokens.findIndex((t) => t.id === anchorMatch.tokenIds[anchorMatch.tokenIds.length - 1]) + 1

      const newTokens: WorkingToken[] = tokenize
        ? tokenize(op.text)
            .flatMap((sl) => sl.tokens)
            .map((st) => ({ id: nextId(), text: st.text, color: st.color }))
        : [{ id: nextId(), text: op.text, color: '#24292f' }]
      newTokens.forEach((t) => registerToken(t.id, t.text, t.color))

      // Logical insertion
      anchorLine.tokens.splice(anchorIdx, 0, ...newTokens)
      lineCurrentTokens[anchorLine.id] = anchorLine.tokens.map((t) => t.id)

      // DOM insertion at the matching anchor position
      const anchorAllIds = lineAllTokens[anchorLine.id]
      if (anchorAllIds) {
        const anchorTokenId = op.anchor.side === 'before'
          ? anchorMatch.tokenIds[0]
          : anchorMatch.tokenIds[anchorMatch.tokenIds.length - 1]
        const insertAt = op.anchor.side === 'before'
          ? anchorAllIds.indexOf(anchorTokenId)
          : anchorAllIds.lastIndexOf(anchorTokenId) + 1
        const newIds = newTokens.map((t) => t.id)
        lineAllTokens[anchorLine.id] = insertAt !== -1
          ? [...anchorAllIds.slice(0, insertAt), ...newIds, ...anchorAllIds.slice(insertAt)]
          : [...anchorAllIds, ...newIds]
      }
      break
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
