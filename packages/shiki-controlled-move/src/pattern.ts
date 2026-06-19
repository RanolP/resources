import type {
  LineFilter,
  SelectionDescriptor,
  AnchorDescriptor,
  OperationDescriptor,
  DeleteEffect,
  FoldEffect,
  WorkingToken,
} from './types.js'

// --- Pattern parsing ---

export type PatternPart =
  | { kind: 'literal'; text: string }
  | { kind: 'capture'; name: string }

export function parsePattern(pattern: string): PatternPart[] {
  const parts: PatternPart[] = []
  const re = /\$([A-Za-z][A-Za-z0-9]*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(pattern)) !== null) {
    if (m.index > last) parts.push({ kind: 'literal', text: pattern.slice(last, m.index) })
    parts.push({ kind: 'capture', name: m[1] })
    last = m.index + m[0].length
  }
  if (last < pattern.length) parts.push({ kind: 'literal', text: pattern.slice(last) })
  return parts
}

interface PatternMatch {
  tokenIds: string[]
  captures: Record<string, string>
}

// Build a regex from pattern parts. Each capture becomes (\S+).
function partsToRegex(parts: PatternPart[]): RegExp {
  const src = parts
    .map((p) => (p.kind === 'literal' ? escapeRegex(p.text) : '(\\S+)'))
    .join('')
  return new RegExp(src, 'g')
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function matchPattern(
  pattern: string,
  tokens: WorkingToken[],
  focus?: { pattern: string; nth: number },
  nth?: number,
): PatternMatch[] {
  const parts = parsePattern(pattern)
  const captureNames = parts.filter((p): p is { kind: 'capture'; name: string } => p.kind === 'capture').map((p) => p.name)
  const re = partsToRegex(parts)
  const focusRe = focus ? partsToRegex(parsePattern(focus.pattern)) : null

  // Build full-line string and a char-offset index
  const fullText = tokens.map((t) => t.text).join('')
  const offsets: number[] = []
  let off = 0
  for (const t of tokens) {
    offsets.push(off)
    off += t.text.length
  }

  const results: PatternMatch[] = []
  let m: RegExpExecArray | null
  re.lastIndex = 0
  while ((m = re.exec(fullText)) !== null) {
    const start = m.index
    const end = m.index + m[0].length
    const captures: Record<string, string> = {}
    captureNames.forEach((name, i) => { captures[name] = m![i + 1] })
    // Restart from start+1 to allow overlapping matches
    re.lastIndex = start + 1

    if (focusRe) {
      // Narrow to the nth occurrence of `focus` within the matched span; the rest of the
      // match is context that stays untouched. Skip the match if that occurrence is absent.
      const span = fullText.slice(start, end)
      let fm: RegExpExecArray | null
      let count = 0
      let range: [number, number] | null = null
      focusRe.lastIndex = 0
      while ((fm = focusRe.exec(span)) !== null) {
        if (count === focus!.nth) { range = [start + fm.index, start + fm.index + fm[0].length]; break }
        count++
        focusRe.lastIndex = fm.index + 1
      }
      if (!range) continue
      results.push({ tokenIds: tokensInRange(tokens, offsets, range[0], range[1]), captures })
    } else {
      results.push({ tokenIds: tokensInRange(tokens, offsets, start, end), captures })
    }
  }
  if (nth !== undefined) return results[nth] ? [results[nth]] : []
  return results
}

function tokensInRange(
  tokens: WorkingToken[],
  offsets: number[],
  start: number,
  end: number,
): string[] {
  const ids: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const tStart = offsets[i]
    const tEnd = tStart + tokens[i].text.length
    if (tStart < end && tEnd > start) ids.push(tokens[i].id)
  }
  return ids
}

// --- Selection builder (returned by L proxy, carries OperationDescriptor lazily) ---

class SelectionBuilder {
  constructor(private readonly desc: SelectionDescriptor) {}

  // Narrow the operation to the nth occurrence of `sub` within the matched span. The
  // outer pattern still matches (for context/disambiguation) but only the focused tokens
  // are folded/deleted/moved — e.g. L[9]('map(pair(').focus('(').foldTo('∘').
  focus(sub: string, nth = 0): SelectionBuilder {
    return new SelectionBuilder({ ...this.desc, focus: { pattern: sub, nth } })
  }

  foldTo(
    replacement: string | ((caps: Record<string, string>) => string),
    effect: FoldEffect = 'right',
  ): OperationDescriptor {
    return { kind: 'fold', selection: this.desc, replacement, effect }
  }

  delete(effect: DeleteEffect = 'collapse-right'): OperationDescriptor {
    return { kind: 'delete-tokens', selection: this.desc, effect }
  }

  moveTo(anchor: AnchorDescriptor): OperationDescriptor {
    return { kind: 'move', selection: this.desc, anchor }
  }

  copyTo(anchor: AnchorDescriptor): OperationDescriptor {
    return { kind: 'copy', selection: this.desc, anchor }
  }

  before(): AnchorBuilder {
    return new AnchorBuilder(this.desc, 'before')
  }

  after(): AnchorBuilder {
    return new AnchorBuilder(this.desc, 'after')
  }
}

// Returned by SelectionBuilder.before()/after(). It is a valid AnchorDescriptor (usable
// as a moveTo target) and also carries .insert() to drop new tokens at that position.
class AnchorBuilder implements AnchorDescriptor {
  constructor(
    readonly selection: SelectionDescriptor,
    readonly side: 'before' | 'after',
  ) {}

  insert(content: string): OperationDescriptor {
    return { kind: 'insert-tokens', anchor: { selection: this.selection, side: this.side }, text: content }
  }
}

// --- Line handle (returned by L[n], callable) ---

class LineHandle {
  constructor(private readonly filter: LineFilter) {}

  // L[n]('pattern') or L[n]('pattern', nth) — returns a SelectionBuilder
  __call(pattern: string, nth?: number): SelectionBuilder {
    return new SelectionBuilder({ lineFilter: this.filter, pattern, nth })
  }

  delete(): OperationDescriptor {
    if (this.filter.kind !== 'single') throw new Error('delete() on a line requires a single line index')
    return { kind: 'delete-line', lineIndex: this.filter.index }
  }

  insertLineBefore(text: string): OperationDescriptor {
    if (this.filter.kind !== 'single') throw new Error('insertLineBefore() requires a single line index')
    return { kind: 'insert-line', lineIndex: this.filter.index, position: 'before', text }
  }

  insertLineAfter(text: string): OperationDescriptor {
    if (this.filter.kind !== 'single') throw new Error('insertLineAfter() requires a single line index')
    return { kind: 'insert-line', lineIndex: this.filter.index, position: 'after', text }
  }
}

// --- L proxy ---
// L('pattern')       → SelectionBuilder (all lines)
// L[n]('pattern')    → SelectionBuilder (line n) via LineHandle.__call
// L[n].delete()      → OperationDescriptor
// L.range(n,m)       → LineHandle

function makeL(): typeof L {
  const callable = (pattern: string, nth?: number): SelectionBuilder =>
    new SelectionBuilder({ lineFilter: { kind: 'all' }, pattern, nth })

  return new Proxy(callable as typeof L, {
    get(_target, key) {
      if (key === 'range') {
        return (from: number, to: number) => {
          const handle = new LineHandle({ kind: 'range', from, to })
          return new Proxy(handle.__call.bind(handle), {
            get: (_t, k) => (handle as never)[k as never],
          })
        }
      }
      if (typeof key === 'string' && /^\d+$/.test(key)) {
        const index = Number(key)
        const handle = new LineHandle({ kind: 'single', index })
        return new Proxy(handle.__call.bind(handle), {
          get: (_t, k) => (handle as never)[k as never],
        })
      }
    },
  })
}

// Type for the L export
type LProxy = {
  (pattern: string, nth?: number): SelectionBuilder
  [n: number]: ((pattern: string, nth?: number) => SelectionBuilder) & {
    delete(): OperationDescriptor
    insertLineBefore(text: string): OperationDescriptor
    insertLineAfter(text: string): OperationDescriptor
  }
  range(from: number, to: number): (pattern: string, nth?: number) => SelectionBuilder
}

export const L: LProxy = makeL() as LProxy
