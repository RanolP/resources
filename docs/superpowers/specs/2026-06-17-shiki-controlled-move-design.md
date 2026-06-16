# shiki-controlled-move — Design Spec

**Date:** 2026-06-17
**Status:** Approved

## Overview

A standalone TypeScript package (`packages/shiki-controlled-move/`) that replaces hand-crafted animated derivation components (currently ~500 lines of Vue + CSS each) with a declarative, precompiled animation library. The author writes the initial code as a string and declares step-by-step token transformations via a fluent DSL. The library compiles the full animation to a frozen data structure at call time and returns a presentational Vue component driven by a `:step` prop.

---

## API

### Entry point

```ts
import { L, shikiControlledMove } from 'shiki-controlled-move'

const AnimatedCode = shikiControlledMove(grammar)`
  const a = 1 + 1 + 3 + 3
  const b = 2 + 2 + 1 + 1
`
  .step(
    L('1 + 1').foldTo('2'),
  )
  .step(
    L[0]('3 + 3').foldTo('6'),
    L[1]('2 + 2').foldTo('4'),
  )
  .step(
    L('$A + $B').foldTo(($) => String(+$.A + +$.B)),
  )
```

`shikiControlledMove` accepts either:
- A **TextMate grammar object** — language name inferred from `grammar.name` / `grammar.scopeName`; library creates its own sync tokenizer
- A **Shiki instance + language name** — `shikiControlledMove(shikiInstance, 'funnylambda')`

The tagged template literal captures the initial code string. Each `.step(...ops)` call is variadic — all operations passed to a single `.step()` fire simultaneously. The chain is **fully synchronous**; by the time the last `.step()` returns, the entire animation is compiled.

### `L` proxy

`L` is a callable proxy:

| Form | Selects |
|---|---|
| `L(pattern)` | All matches across all lines |
| `L[n](pattern)` | All matches within line `n` |
| `L.range(n, m)(pattern)` | All matches within lines `n`–`m` |

### Patterns

Plain text matches literally. `$NAME` matches any single whitespace-free token and captures it by name. Multiple matches within the same `L(pattern)` call all fold/delete simultaneously. When using a capture callback (`.foldTo(($) => ...)`), the callback is invoked once per match during the precompile pass — not at render time. Each invocation receives that match's own `$` capture object and must return a string synchronously.

### Selection methods

```ts
selection.foldTo(text)              // collapse selection, expand replacement (default: right)
selection.foldTo(text, 'left')      // collapse-left direction
selection.foldTo(text, 'right')     // collapse-right direction (default)
selection.foldTo(($) => string)     // computed replacement from named captures
selection.foldTo(($) => string, 'left')

selection.delete()                  // collapse-right (default)
selection.delete('collapse-left')
selection.delete('collapse-right')
selection.delete('opacity')
selection.delete('collapse-opacity')

selection.moveTo(anchor)            // token physically travels to anchor position
selection.before()                  // returns anchor at start of selection
selection.after()                   // returns anchor at end of selection
```

### Line methods

```ts
L[n].insertBefore(text)   // insert new line above line n
L[n].insertAfter(text)    // insert new line below line n
L[n].delete()             // collapse entire line (height → 0)
```

### Component usage

```vue
<AnimatedCode :step="$slidev.nav.clicks" />
```

The component is presentational — no `useSlideContext`, no internal click tracking. The consumer wires the step source.

---

## Precompile pipeline

Runs synchronously at call-chain evaluation time. Produces a frozen `CompiledAnimation` object stored in the component's closure.

### Step 1 — Tokenize

Run the sync highlighter against the initial code string → `Line[]`, each holding `Token[]({ text, color })`. Every token is assigned a stable ID (`t_L{line}_{index}`).

### Step 2 — Evaluate steps

Walk each `.step()` in order. For each step, apply its operations against the **current** token state to produce the **next** token state:

- **`L[n](pattern)`** — pattern-match against line `n`'s current token sequence. `$NAME` captures bind to matched token runs. Returns a `Selection`.
- **`.foldTo(text | fn, effect?)`** — re-tokenize the replacement text via the sync highlighter (for correct colors); produce new token IDs. Mark old tokens as exiting with the given effect; mark new tokens as entering.
- **`.delete(effect?)`** — mark matched tokens as exiting with the given effect.
- **`L[n].delete()`** — mark the line as height-collapsing.
- **`L[n].insertBefore/After(text)`** — inject a new line with new token IDs.
- **`.moveTo(anchor)`** — record source and target positions (line index + character offset); compute `translate(Δcol ch, Δline × 1.5em)` in character units (no DOM measurement required).

### Step 3 — Build token manifest

```ts
interface TokenStepState {
  maxWidth: string    // '3ch' | '0'
  opacity: number     // 1 | 0
  transform: string   // 'translate(0,0)' | 'translate(5ch,-1.5em)'
}

interface CompiledToken {
  id: string
  steps: TokenStepState[]   // one entry per step, including step 0
}

interface CompiledLine {
  id: string
  steps: { visible: boolean }[]
}

interface CompiledAnimation {
  html: string               // static innerHTML — all tokens rendered once with step-0 inline styles
  tokens: CompiledToken[]
  lines: CompiledLine[]
  stepCount: number
}
```

Every token that ever exists across all steps is present in `tokens`. Tokens that don't exist at a given step have `maxWidth: '0'` and `opacity: 0`.

### Step 4 — Emit HTML

Serialize to a static `html` string: a `<pre>` containing `<span class="line" data-line="n">` elements, each holding `<span class="tok" id="{token.id}" style="{step-0 inline styles}">` elements. No per-step state in markup — all state lives in the compiled manifest and is applied by JS at runtime.

---

## Vue component model

```vue
<template>
  <div ref="root">
    <div v-html="compiled.html" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = defineProps<{ step: number }>()
const root = ref<HTMLElement>()

// compiled is captured from the builder closure — frozen at call time
let prevStep = props.step

function animate(from: number, to: number) {
  const fwd = to > from
  const easing = fwd
    ? 'cubic-bezier(0.4, 0, 0.2, 1)'
    : 'cubic-bezier(0.8, 0, 0.6, 1)'

  for (const token of compiled.tokens) {
    const fromState = token.steps[from]
    const toState   = token.steps[to]
    root.value
      ?.querySelector(`#${token.id}`)
      ?.animate([fromState, toState], { duration: 850, easing, fill: 'forwards' })
  }

  for (const line of compiled.lines) {
    const fromState = line.steps[from]
    const toState   = line.steps[to]
    // animate height: '1.5em' ↔ '0' + opacity
    root.value
      ?.querySelector(`[data-line="${line.id}"]`)
      ?.animate(
        [
          { height: fromState.visible ? '1.5em' : '0', opacity: fromState.visible ? 1 : 0 },
          { height: toState.visible   ? '1.5em' : '0', opacity: toState.visible   ? 1 : 0 },
        ],
        { duration: 850, easing, fill: 'forwards' }
      )
  }
}

watch(() => props.step, (next, prev) => {
  animate(prev, next)
  prevStep = next
})
</script>
```

---

## Package structure

```
packages/shiki-controlled-move/
  src/
    index.ts          — exports: shikiControlledMove, L
    tokenize.ts       — sync Shiki/grammar wrapper → Line[]
    pattern.ts        — L proxy, Selection, $NAME capture matching
    compile.ts        — step evaluation → CompiledAnimation
    emit.ts           — CompiledAnimation → { html, tokens, lines }
    component.vue     — Vue shell (Web Animations API driver)
  package.json
  tsconfig.json
```

### `package.json` (key fields)

```json
{
  "name": "shiki-controlled-move",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "peerDependencies": {
    "vue": "^3.5.0",
    "shiki": "^3.0.0"
  }
}
```

---

## Key invariants

- **Call-time compilation** — `shikiControlledMove(...)\`...\`.step(...)` is fully synchronous; `CompiledAnimation` is frozen before the expression returns
- **Presentational** — the component has no side effects beyond Web Animations API calls; it never reads `useSlideContext`
- **No runtime JS between steps** — step changes drive `element.animate()` calls only; no recomputation, no diffing
- **Character-unit transforms** — `moveTo` positions are expressed in `ch`/`em` units derived from token character offsets; no DOM measurement at any stage
- **Direction-aware easing** — forward and reverse transitions use inverse bezier curves, mirroring duration and per-element delay for true time-reverse playback
