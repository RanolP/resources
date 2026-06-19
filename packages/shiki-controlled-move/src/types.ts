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
  | { kind: 'insert-tokens'; anchor: AnchorDescriptor; text: string }

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
  // true when this token is moved at some step: it keeps its source DOM slot and
  // slides to the destination via transform, so it must not clip its own overflow.
  float?: boolean
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
