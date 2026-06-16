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

export function matchPattern(pattern: string, tokens: WorkingToken[]): PatternMatch[] {
  const parts = parsePattern(pattern)
  const captureNames = parts.filter((p): p is { kind: 'capture'; name: string } => p.kind === 'capture').map((p) => p.name)
  const re = partsToRegex(parts)

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
    const tokenIds = tokensInRange(tokens, offsets, start, end)
    const captures: Record<string, string> = {}
    captureNames.forEach((name, i) => { captures[name] = m![i + 1] })
    results.push({ tokenIds, captures })
    // Restart from start+1 to allow overlapping matches
    re.lastIndex = start + 1
  }
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

  before(): AnchorDescriptor {
    return { selection: this.desc, side: 'before' }
  }

  after(): AnchorDescriptor {
    return { selection: this.desc, side: 'after' }
  }
}

// --- Line handle (returned by L[n], callable) ---

class LineHandle {
  constructor(private readonly filter: LineFilter) {}

  // L[n]('pattern') — returns a SelectionBuilder
  __call(pattern: string): SelectionBuilder {
    return new SelectionBuilder({ lineFilter: this.filter, pattern })
  }

  delete(): OperationDescriptor {
    if (this.filter.kind !== 'single') throw new Error('delete() on a line requires a single line index')
    return { kind: 'delete-line', lineIndex: this.filter.index }
  }

  insertBefore(text: string): OperationDescriptor {
    if (this.filter.kind !== 'single') throw new Error('insertBefore() requires a single line index')
    return { kind: 'insert-line', lineIndex: this.filter.index, position: 'before', text }
  }

  insertAfter(text: string): OperationDescriptor {
    if (this.filter.kind !== 'single') throw new Error('insertAfter() requires a single line index')
    return { kind: 'insert-line', lineIndex: this.filter.index, position: 'after', text }
  }
}

// --- L proxy ---
// L('pattern')       → SelectionBuilder (all lines)
// L[n]('pattern')    → SelectionBuilder (line n) via LineHandle.__call
// L[n].delete()      → OperationDescriptor
// L.range(n,m)       → LineHandle

function makeL(): typeof L {
  const callable = (pattern: string): SelectionBuilder =>
    new SelectionBuilder({ lineFilter: { kind: 'all' }, pattern })

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
  (pattern: string): SelectionBuilder
  [n: number]: ((pattern: string) => SelectionBuilder) & {
    delete(): OperationDescriptor
    insertBefore(text: string): OperationDescriptor
    insertAfter(text: string): OperationDescriptor
  }
  range(from: number, to: number): (pattern: string) => SelectionBuilder
}

export const L: LProxy = makeL() as LProxy
