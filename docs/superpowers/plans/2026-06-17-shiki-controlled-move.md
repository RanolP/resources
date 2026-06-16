# shiki-controlled-move Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone TypeScript package that compiles animated code derivations from a fluent DSL at call time and returns a presentational Vue component driven by a `:step` prop.

**Architecture:** `shikiControlledMove(grammar|hl, lang?)` returns a tagged template literal builder. Each `.step(...ops)` call appends operations. On the final `.step()` call the chain is returned as a frozen Vue component — all Shiki tokenization, pattern matching, and per-token step state computation happens synchronously via `createHighlighterCoreSync`. The component stores the compiled manifest in its closure and drives animations via the Web Animations API.

**Tech Stack:** TypeScript, Vue 3 (`defineComponent`), Shiki v4 (`createHighlighterCoreSync` + `createJavaScriptRegexEngine`), Vitest

---

## File Map

| File | Responsibility |
|---|---|
| `pnpm-workspace.yaml` | Declare `packages/*` workspace |
| `packages/shiki-controlled-move/package.json` | Package metadata, peer deps |
| `packages/shiki-controlled-move/tsconfig.json` | TS config (ESNext, bundler resolution) |
| `packages/shiki-controlled-move/vitest.config.ts` | Vitest config |
| `src/types.ts` | All shared TypeScript interfaces — single source of truth |
| `src/tokenize.ts` | Wrap `createHighlighterCoreSync` / Shiki instance → `SourceLine[]` |
| `src/pattern.ts` | `L` proxy; `parsePattern`; match pattern against `WorkingLine` |
| `src/compile.ts` | Apply `OperationDescriptor[]` per step → `CompiledAnimation` |
| `src/emit.ts` | Serialize `CompiledAnimation` → `{ html, tokens, lines }` |
| `src/component.vue` | Vue shell: accepts `compiled` closure + `:step` prop, drives Web Animations API |
| `src/builder.ts` | `shikiControlledMove` — tagged template factory, chains `.step()`, returns component |
| `src/index.ts` | Public exports: `shikiControlledMove`, `L` |
| `tests/tokenize.test.ts` | Unit tests for tokenize |
| `tests/pattern.test.ts` | Unit tests for pattern parsing and matching |
| `tests/compile.test.ts` | Unit tests for step compilation |
| `tests/emit.test.ts` | Unit tests for HTML emission |

---

## Task 1: Package scaffold

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `packages/shiki-controlled-move/package.json`
- Create: `packages/shiki-controlled-move/tsconfig.json`
- Create: `packages/shiki-controlled-move/vitest.config.ts`
- Create: `packages/shiki-controlled-move/src/.gitkeep`

- [ ] **Step 1: Create pnpm workspace**

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 2: Create package.json**

`packages/shiki-controlled-move/package.json`:
```json
{
  "name": "shiki-controlled-move",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "vue": "^3.5.0",
    "shiki": "^4.0.0",
    "@shikijs/engine-javascript": "^4.0.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

`packages/shiki-controlled-move/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "verbatimModuleSyntax": true,
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

`packages/shiki-controlled-move/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 5: Create src directory and verify setup**

```bash
mkdir -p packages/shiki-controlled-move/src packages/shiki-controlled-move/tests
touch packages/shiki-controlled-move/src/index.ts
```

Run from workspace root:
```bash
pnpm install
```

Expected: installs without errors, `packages/shiki-controlled-move` appears in workspace.

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml packages/shiki-controlled-move/
git commit -m "chore: scaffold shiki-controlled-move package"
```

---

## Task 2: Shared types

**Files:**
- Create: `packages/shiki-controlled-move/src/types.ts`

- [ ] **Step 1: Write types.ts**

`packages/shiki-controlled-move/src/types.ts`:
```ts
// --- Input types (from Shiki tokenization) ---

export interface SourceToken {
  text: string
  color: string  // lowercase hex, e.g. '#0550ae'
}

export interface SourceLine {
  tokens: SourceToken[]
}

// --- DSL descriptor types (lazy — built by L proxy, evaluated in compile.ts) ---

export type LineFilter =
  | { kind: 'all' }
  | { kind: 'single'; index: number }
  | { kind: 'range'; from: number; to: number }

export interface SelectionDescriptor {
  lineFilter: LineFilter
  pattern: string
}

export interface AnchorDescriptor {
  selection: SelectionDescriptor
  side: 'before' | 'after'
}

export type DeleteEffect = 'collapse-left' | 'collapse-right' | 'opacity' | 'collapse-opacity'
export type FoldEffect = 'left' | 'right'

export type OperationDescriptor =
  | { kind: 'fold'; selection: SelectionDescriptor; replacement: string | ((caps: Record<string, string>) => string); effect: FoldEffect }
  | { kind: 'delete-tokens'; selection: SelectionDescriptor; effect: DeleteEffect }
  | { kind: 'move'; selection: SelectionDescriptor; anchor: AnchorDescriptor }
  | { kind: 'delete-line'; lineIndex: number }
  | { kind: 'insert-line'; lineIndex: number; position: 'before' | 'after'; text: string }

// --- Compiled manifest types (output of compile.ts) ---

export interface TokenStepState {
  maxWidth: string    // e.g. '3ch' | '0ch'
  opacity: number     // 1 | 0
  transform: string   // e.g. 'translate(0px,0px)' | 'translate(5ch,-1.5em)'
}

export interface LineStepState {
  visible: boolean
}

export interface CompiledToken {
  id: string
  text: string
  color: string
  steps: TokenStepState[]
}

export interface CompiledLine {
  id: string
  steps: LineStepState[]
}

export interface CompiledAnimation {
  html: string
  tokens: CompiledToken[]
  lines: CompiledLine[]
  stepCount: number
}

// --- Internal working state for compiler ---

export interface WorkingToken {
  id: string
  text: string
  color: string
}

export interface WorkingLine {
  id: string
  tokens: WorkingToken[]
}

export interface WorkingState {
  lines: WorkingLine[]
  nextId: number
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shiki-controlled-move/src/types.ts
git commit -m "feat(scm): add shared types"
```

---

## Task 3: Sync tokenizer

**Files:**
- Create: `packages/shiki-controlled-move/src/tokenize.ts`
- Test: `packages/shiki-controlled-move/tests/tokenize.test.ts`

The tokenizer wraps Shiki's synchronous API to produce `SourceLine[]`. It accepts either a TextMate grammar object (creates its own `createHighlighterCoreSync` instance) or an existing Shiki highlighter + language name.

- [ ] **Step 1: Write the failing test**

`packages/shiki-controlled-move/tests/tokenize.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/shiki-controlled-move && pnpm vitest run tests/tokenize.test.ts
```

Expected: FAIL — `createTokenizer` not found.

- [ ] **Step 3: Write tokenize.ts**

`packages/shiki-controlled-move/src/tokenize.ts`:
```ts
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
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
      themes: [],
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/shiki-controlled-move && pnpm vitest run tests/tokenize.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shiki-controlled-move/src/tokenize.ts packages/shiki-controlled-move/tests/tokenize.test.ts
git commit -m "feat(scm): add sync tokenizer"
```

---

## Task 4: Pattern matching + L proxy

**Files:**
- Create: `packages/shiki-controlled-move/src/pattern.ts`
- Test: `packages/shiki-controlled-move/tests/pattern.test.ts`

`pattern.ts` has two responsibilities:
1. `parsePattern` / `matchPattern` — convert `'$A + $B'` patterns to matches with captures against a line's text
2. `L` proxy — creates `SelectionDescriptor` and `OperationDescriptor` objects lazily

- [ ] **Step 1: Write the failing test**

`packages/shiki-controlled-move/tests/pattern.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parsePattern, matchPattern } from '../src/pattern.js'
import type { WorkingToken } from '../src/types.js'

const tok = (text: string): WorkingToken => ({ id: 't0', text, color: '#000' })

describe('parsePattern', () => {
  it('parses a literal pattern into a single literal part', () => {
    const parts = parsePattern('1 + 1')
    expect(parts).toEqual([{ kind: 'literal', text: '1 + 1' }])
  })

  it('parses $NAME into a capture part', () => {
    const parts = parsePattern('$A')
    expect(parts).toEqual([{ kind: 'capture', name: 'A' }])
  })

  it('parses mixed pattern into ordered parts', () => {
    const parts = parsePattern('$A + $B')
    expect(parts).toEqual([
      { kind: 'capture', name: 'A' },
      { kind: 'literal', text: ' + ' },
      { kind: 'capture', name: 'B' },
    ])
  })
})

describe('matchPattern', () => {
  it('finds a literal match and returns token ids', () => {
    const tokens: WorkingToken[] = [
      { id: 'a', text: '1', color: '#000' },
      { id: 'b', text: ' + ', color: '#000' },
      { id: 'c', text: '1', color: '#000' },
    ]
    const matches = matchPattern('1 + 1', tokens)
    expect(matches).toHaveLength(1)
    expect(matches[0].tokenIds).toEqual(['a', 'b', 'c'])
    expect(matches[0].captures).toEqual({})
  })

  it('finds multiple non-overlapping matches of the same pattern', () => {
    const tokens: WorkingToken[] = [
      { id: 'a', text: '1', color: '#000' },
      { id: 'b', text: ' + ', color: '#000' },
      { id: 'c', text: '1', color: '#000' },
      { id: 'd', text: ' + ', color: '#000' },
      { id: 'e', text: '1', color: '#000' },
    ]
    const matches = matchPattern('1 + 1', tokens)
    expect(matches).toHaveLength(2)
  })

  it('captures $NAME groups', () => {
    const tokens: WorkingToken[] = [
      { id: 'a', text: '2', color: '#000' },
      { id: 'b', text: ' + ', color: '#000' },
      { id: 'c', text: '3', color: '#000' },
    ]
    const matches = matchPattern('$A + $B', tokens)
    expect(matches).toHaveLength(1)
    expect(matches[0].captures).toEqual({ A: '2', B: '3' })
    expect(matches[0].tokenIds).toEqual(['a', 'b', 'c'])
  })

  it('returns empty array when pattern has no match', () => {
    const tokens: WorkingToken[] = [{ id: 'a', text: 'hello', color: '#000' }]
    const matches = matchPattern('xyz', tokens)
    expect(matches).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/shiki-controlled-move && pnpm vitest run tests/pattern.test.ts
```

Expected: FAIL — `parsePattern` and `matchPattern` not found.

- [ ] **Step 3: Write pattern.ts (core matching)**

`packages/shiki-controlled-move/src/pattern.ts`:
```ts
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
    // advance past this match to avoid infinite loop on zero-length match
    if (m[0].length === 0) re.lastIndex++
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/shiki-controlled-move && pnpm vitest run tests/pattern.test.ts
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shiki-controlled-move/src/pattern.ts packages/shiki-controlled-move/tests/pattern.test.ts
git commit -m "feat(scm): add pattern matching and L proxy"
```

---

## Task 5: Step compiler

**Files:**
- Create: `packages/shiki-controlled-move/src/compile.ts`
- Test: `packages/shiki-controlled-move/tests/compile.test.ts`

The compiler takes `SourceLine[]` (from the tokenizer), a list of `OperationDescriptor[][]` (one array per step), and produces a `CompiledAnimation` (minus `html` — that comes from emit.ts).

- [ ] **Step 1: Write the failing test**

`packages/shiki-controlled-move/tests/compile.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { compile } from '../src/compile.js'
import { L } from '../src/pattern.js'
import type { SourceLine } from '../src/types.js'

// A minimal tokenizer stub
function lines(code: string): SourceLine[] {
  return code.split('\n').map((text) => ({
    tokens: [{ text, color: '#000000' }],
  }))
}

describe('compile', () => {
  it('produces one step state per step including step 0', () => {
    const result = compile(lines('a + b'), [[L('a').delete()]])
    // stepCount = 2 (step 0 = initial, step 1 = after delete)
    expect(result.stepCount).toBe(2)
    result.tokens.forEach((t) => expect(t.steps).toHaveLength(2))
  })

  it('token is visible at step 0, hidden at step 1 after delete', () => {
    const result = compile(lines('abc'), [[L('abc').delete()]])
    const tok = result.tokens.find((t) => t.text === 'abc')!
    expect(tok.steps[0].opacity).toBe(1)
    expect(tok.steps[1].opacity).toBe(0)
  })

  it('foldTo hides old tokens and shows new token at step 1', () => {
    const initial = lines('1 + 1')
    const result = compile(initial, [[L('1 + 1').foldTo('2')]])
    const oldTok = result.tokens.find((t) => t.text === '1 + 1')!
    const newTok = result.tokens.find((t) => t.text === '2')!
    expect(oldTok.steps[0].opacity).toBe(1)
    expect(oldTok.steps[1].opacity).toBe(0)
    expect(newTok.steps[0].opacity).toBe(0)
    expect(newTok.steps[1].opacity).toBe(1)
  })

  it('foldTo with callback computes replacement at compile time', () => {
    const initial = lines('3 + 4')
    // Manually construct initial SourceLine with separate tokens
    const twoTokenLine: SourceLine[] = [{
      tokens: [
        { text: '3', color: '#000' },
        { text: ' + ', color: '#000' },
        { text: '4', color: '#000' },
      ],
    }]
    const result = compile(twoTokenLine, [[L('$A + $B').foldTo(($) => String(+$.A + +$.B))]])
    expect(result.tokens.some((t) => t.text === '7')).toBe(true)
  })

  it('line delete makes line invisible at step 1', () => {
    const result = compile(lines('hello'), [[L[0].delete()]])
    const line = result.lines[0]
    expect(line.steps[0].visible).toBe(true)
    expect(line.steps[1].visible).toBe(false)
  })

  it('maxWidth is set to text length in ch', () => {
    const result = compile(lines('abc'), [])
    const tok = result.tokens[0]
    expect(tok.steps[0].maxWidth).toBe('3ch')
  })

  it('returns lineTokens mapping each line id to its initial token ids', () => {
    const result = compile(lines('abc'), [])
    const lineId = result.lines[0].id
    expect(result.lineTokens[lineId]).toEqual([result.tokens[0].id])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/shiki-controlled-move && pnpm vitest run tests/compile.test.ts
```

Expected: FAIL — `compile` not found.

- [ ] **Step 3: Write compile.ts**

`packages/shiki-controlled-move/src/compile.ts`:
```ts
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

export interface PartialAnimation {
  tokens: Map<string, PartialToken>
  lines: Map<string, PartialLine>
  working: WorkingState
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
  }

  // Snapshot step 0 (initial state)
  snapshotStep()

  // Capture line→token order from step-0 working state (for HTML emission)
  const lineTokens: Record<string, string[]> = {}
  for (const wl of working.lines) {
    lineTokens[wl.id] = wl.tokens.map((t) => t.id)
  }

  // Apply each step
  for (const ops of steps) {
    for (const op of ops) {
      applyOp(op, working, tokMap, lineMap, nextId, tokenize)
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
  tokenize?: (code: string) => SourceLine[],
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
        tokMap.set(newTok.id, { id: newTok.id, text: newTok.text, color: newTok.color, stepStates: [] })

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
    lineMap.set(newLine.id, { id: newLine.id, stepStates: [] })
    newLine.tokens.forEach((t) => tokMap.set(t.id, { id: t.id, text: t.text, color: t.color, stepStates: [] }))
    const insertAt = op.position === 'before' ? op.lineIndex : op.lineIndex + 1
    working.lines.splice(insertAt, 0, newLine)
  } else if (op.kind === 'move') {
    // Teleport: source tokens collapse, new tokens appear at anchor position.
    // The tokens do not visually travel (no translate transform); they collapse at source
    // and expand at target. True traveling animation requires a transform override pass
    // after snapshotStep, which is out of scope for this initial implementation.
    const srcLines = filterLines(working, op.selection.lineFilter)
    for (const wl of srcLines) {
      const matches = matchPattern(op.selection.pattern, wl.tokens)
      for (const match of [...matches].reverse()) {
        // Build replacement text from matched tokens
        const movedText = match.tokenIds
          .map((id) => wl.tokens.find((t) => t.id === id)?.text ?? '')
          .join('')
        const movedColor = wl.tokens.find((t) => t.id === match.tokenIds[0])?.color ?? '#24292f'

        // Find anchor line and position
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
          tokMap.set(newTok.id, { id: newTok.id, text: newTok.text, color: newTok.color, stepStates: [] })
          anchorLine.tokens.splice(anchorIdx, 0, newTok)
          break
        }

        // Delete source tokens
        const toDelete = new Set(match.tokenIds)
        const firstIdx = wl.tokens.findIndex((t) => t.id === match.tokenIds[0])
        const lastIdx  = wl.tokens.findIndex((t) => t.id === match.tokenIds[match.tokenIds.length - 1])
        wl.tokens = [...wl.tokens.slice(0, firstIdx), ...wl.tokens.slice(lastIdx + 1)]
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/shiki-controlled-move && pnpm vitest run tests/compile.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shiki-controlled-move/src/compile.ts packages/shiki-controlled-move/tests/compile.test.ts
git commit -m "feat(scm): add step compiler"
```

---

## Task 6: HTML emitter

**Files:**
- Create: `packages/shiki-controlled-move/src/emit.ts`
- Test: `packages/shiki-controlled-move/tests/emit.test.ts`

Converts a compiled manifest (tokens + lines + stepCount) into a static `html` string where each token is a `<span>` with its step-0 inline styles. Lines are `<span class="scm-line" data-line-id="...">`.

- [ ] **Step 1: Write the failing test**

`packages/shiki-controlled-move/tests/emit.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { emitHtml } from '../src/emit.js'
import type { CompiledToken, CompiledLine } from '../src/types.js'

function makeToken(id: string, text: string, color: string, steps: { maxWidth: string; opacity: number; transform: string }[]): CompiledToken {
  return { id, text, color, steps }
}

describe('emitHtml', () => {
  it('wraps each line in a span with data-line-id', () => {
    const lines: CompiledLine[] = [{ id: 'l0', steps: [{ visible: true }] }]
    const tokens: CompiledToken[] = [
      makeToken('t0', 'hello', '#24292f', [{ maxWidth: '5ch', opacity: 1, transform: 'translate(0px,0px)' }]),
    ]
    const html = emitHtml({ tokens, lines, lineTokens: { l0: ['t0'] } })
    expect(html).toContain('data-line-id="l0"')
  })

  it('renders each token as a span with id and step-0 inline style', () => {
    const lines: CompiledLine[] = [{ id: 'l0', steps: [{ visible: true }] }]
    const tokens: CompiledToken[] = [
      makeToken('t0', 'abc', '#0550ae', [{ maxWidth: '3ch', opacity: 1, transform: 'translate(0px,0px)' }]),
    ]
    const html = emitHtml({ tokens, lines, lineTokens: { l0: ['t0'] } })
    expect(html).toContain('id="t0"')
    expect(html).toContain('color:#0550ae')
    expect(html).toContain('max-width:3ch')
  })

  it('escapes HTML special characters in token text', () => {
    const lines: CompiledLine[] = [{ id: 'l0', steps: [{ visible: true }] }]
    const tokens: CompiledToken[] = [
      makeToken('t0', 'a<b>', '#000', [{ maxWidth: '4ch', opacity: 1, transform: 'translate(0px,0px)' }]),
    ]
    const html = emitHtml({ tokens, lines, lineTokens: { l0: ['t0'] } })
    expect(html).toContain('a&lt;b&gt;')
    expect(html).not.toContain('a<b>')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/shiki-controlled-move && pnpm vitest run tests/emit.test.ts
```

Expected: FAIL — `emitHtml` not found.

- [ ] **Step 3: Write emit.ts**

`packages/shiki-controlled-move/src/emit.ts`:
```ts
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
  const lineById = new Map(input.lines.map((l) => [l.id, l]))

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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/shiki-controlled-move && pnpm vitest run tests/emit.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/shiki-controlled-move/src/emit.ts packages/shiki-controlled-move/tests/emit.test.ts
git commit -m "feat(scm): add HTML emitter"
```

---

## Task 7: Vue component

**Files:**
- Create: `packages/shiki-controlled-move/src/component.ts`

The component is a plain `defineComponent` (not `.vue` SFC — avoids a build step dependency). It receives the `CompiledAnimation` via a closure prop injected by the builder, and `:step` as a public prop.

- [ ] **Step 1: Write component.ts**

`packages/shiki-controlled-move/src/component.ts`:
```ts
import { defineComponent, h, ref, watch, onMounted } from 'vue'
import type { CompiledAnimation } from './types.js'

const EASING_FWD = 'cubic-bezier(0.4, 0, 0.2, 1)'
const EASING_REV = 'cubic-bezier(0.8, 0, 0.6, 1)'
const DURATION = 850

export function createAnimatedComponent(compiled: CompiledAnimation) {
  return defineComponent({
    name: 'ShikiControlledMove',
    props: {
      step: {
        type: Number,
        required: true,
      },
    },
    setup(props) {
      const root = ref<HTMLElement | null>(null)
      let prevStep = props.step

      function animate(from: number, to: number) {
        if (!root.value) return
        const clampedFrom = Math.max(0, Math.min(from, compiled.stepCount - 1))
        const clampedTo   = Math.max(0, Math.min(to,   compiled.stepCount - 1))
        if (clampedFrom === clampedTo) return

        const fwd = clampedTo > clampedFrom
        const easing = fwd ? EASING_FWD : EASING_REV

        for (const token of compiled.tokens) {
          const fromState = token.steps[clampedFrom]
          const toState   = token.steps[clampedTo]
          if (!fromState || !toState) continue
          const el = root.value.querySelector<HTMLElement>(`#${CSS.escape(token.id)}`)
          if (!el) continue
          el.animate(
            [
              { maxWidth: fromState.maxWidth, opacity: fromState.opacity, transform: fromState.transform },
              { maxWidth: toState.maxWidth,   opacity: toState.opacity,   transform: toState.transform },
            ],
            { duration: DURATION, easing, fill: 'forwards' },
          )
        }

        for (const line of compiled.lines) {
          const fromState = line.steps[clampedFrom]
          const toState   = line.steps[clampedTo]
          if (!fromState || !toState) continue
          const el = root.value.querySelector<HTMLElement>(`[data-line-id="${CSS.escape(line.id)}"]`)
          if (!el) continue
          el.animate(
            [
              { height: fromState.visible ? '1.5em' : '0px', opacity: fromState.visible ? 1 : 0 },
              { height: toState.visible   ? '1.5em' : '0px', opacity: toState.visible   ? 1 : 0 },
            ],
            { duration: DURATION, easing, fill: 'forwards' },
          )
        }
      }

      watch(
        () => props.step,
        (next) => {
          animate(prevStep, next)
          prevStep = next
        },
      )

      onMounted(() => {
        // Apply step-0 state immediately if step !== 0 (e.g. navigating back into a slide)
        if (props.step !== 0) animate(0, props.step)
      })

      return () =>
        h('div', { ref: root, class: 'scm-root', style: 'font-family: "JetBrains Mono", monospace; font-size: var(--slidev-code-font-size, 0.875em); line-height: 1.5;' }, [
          h('div', { innerHTML: compiled.html }),
        ])
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/shiki-controlled-move && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shiki-controlled-move/src/component.ts
git commit -m "feat(scm): add Vue component shell"
```

---

## Task 8: Builder + public exports

**Files:**
- Create: `packages/shiki-controlled-move/src/builder.ts`
- Create: `packages/shiki-controlled-move/src/index.ts`

The builder wires together tokenize → compile → emit → createAnimatedComponent. The tagged template literal captures the code string; `.step()` accumulates operations; the last call returns the component.

- [ ] **Step 1: Write builder.ts**

`packages/shiki-controlled-move/src/builder.ts`:
```ts
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

  // Trigger compilation when accessed as a component (e.g. used in a template or assigned)
  // We compile lazily on first property access via Proxy to keep the DSL synchronous.
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

  // Make this usable as a Vue component by forwarding component definition properties
  get setup() { return this.build().setup }
  get name() { return this.build().name }
  get props() { return this.build().props }
  get render() { return (this.build() as { render?: unknown }).render }
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
```

- [ ] **Step 2: Write index.ts**

`packages/shiki-controlled-move/src/index.ts`:
```ts
export { shikiControlledMove } from './builder.js'
export { L } from './pattern.js'
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/shiki-controlled-move && pnpm tsc --noEmit
```

Expected: no errors (fix any type issues before proceeding).

- [ ] **Step 4: Commit**

```bash
git add packages/shiki-controlled-move/src/builder.ts packages/shiki-controlled-move/src/index.ts
git commit -m "feat(scm): add builder and public exports"
```

---

## Task 9: Wire into presentation + run all tests

**Files:**
- Modify: `slides.md` — add an example slide using `shikiControlledMove`
- Create: `components/SumTypeAnim.ts` or inline in a slide's `<script setup>`

- [ ] **Step 1: Run all package tests**

```bash
cd packages/shiki-controlled-move && pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Add the package as a workspace dependency**

In root `package.json`, add:
```json
{
  "dependencies": {
    "shiki-controlled-move": "workspace:*"
  }
}
```

Then:
```bash
pnpm install
```

- [ ] **Step 3: Create a demo component for the sum type animation**

`components/SumTypeAnim.ts`:
```ts
import { L, shikiControlledMove } from 'shiki-controlled-move'

// Import the funnylambda grammar from the existing setup file
import { funnylambda } from '../setup/shiki-grammar.js'  // extract grammar from setup/shiki.ts

export const SumTypeAnim = shikiControlledMove(funnylambda)`
data Maybe[A] = .none + .some(A)

.none    := n -> s -> n
.some(a) := n -> s -> s(a)
`
  .step(
    L('.none').foldTo('none-handler'),
    L('.some(a)').foldTo('some-handler'),
  )
  .step(
    L('none-handler').foldTo('n -> s -> n'),
    L('some-handler').foldTo('n -> s -> s(a)'),
  )
```

> **Note:** Extract the `funnylambda` grammar object from `setup/shiki.ts` into a separate `setup/shiki-grammar.ts` file so it can be imported without the Slidev-specific `defineShikiSetup` wrapper.

- [ ] **Step 4: Add a test slide**

In `slides.md`, add a test slide before the existing content:
```markdown
---
---

# SumTypeAnim test

<SumTypeAnim :step="$slidev.nav.clicks" />
<span v-click />
<span v-click />
```

- [ ] **Step 5: Verify in browser**

Open http://localhost:3030, navigate to the test slide, click forward and back to verify animations play and reverse correctly.

- [ ] **Step 6: Commit**

```bash
git add components/SumTypeAnim.ts slides.md setup/shiki-grammar.ts
git commit -m "feat: wire shiki-controlled-move into presentation"
```
