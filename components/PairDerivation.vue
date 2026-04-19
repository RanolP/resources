<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $slidev } = useSlideContext()

// Five β-reduction stages for `map′∘pair` RHS (clicks 0..4, capped at 4):
//   0: map′(pair(a)(b))
//   1: map′(.pair(a, b))                               — fold pair(a)(b)
//   2: (.pair(a, b) -> f -> f(a)(b))(.pair(a, b))      — inline map′
//   3: (f -> f(a)(b))                                  — destructure β-reduce
//   4: f -> f(a)(b)                                    — drop parens
const stateIdx = computed(() =>
  Math.max(0, Math.min($slidev.nav.clicks, 4)),
)
const stateClass = computed(() => `state-s${stateIdx.value}`)

// Per-token active range. Tokens that persist across several stages stay
// `active` through their whole range — no animation at intermediate
// stage boundaries. Only tokens that actually enter or leave at a given
// boundary run the collapse / expand transition.
const rng = (first: number, last: number) => {
  const s = stateIdx.value
  if (s < first) return 'future'
  if (s > last) return 'past'
  return 'active'
}

// Direction tracking: reverse playback swaps to the inverse-bezier and
// mirrors the copy-boundary timing so back-navigation is a true
// time-reverse of forward motion.
const dir = ref<'fwd' | 'rev'>('fwd')
let lastClicks = $slidev.nav.clicks
watch(
  () => $slidev.nav.clicks,
  (n) => {
    dir.value = n >= lastClicks ? 'fwd' : 'rev'
    lastClicks = n
  },
)
</script>

<template>
  <div class="deriv font-mono" :class="[`dir-${dir}`, stateClass]">
    <pre class="frame"><!--
 --><span class="line l-def"><span class="id">map′</span> = <span class="ctor">.pair</span>(<span class="id">a</span>, <span class="id">b</span>) -&gt; <span class="id">f</span> -&gt; <span class="id">f</span>(<span class="id">a</span>)(<span class="id">b</span>)</span><!--
 --><span class="line"></span><!--
 --><span class="line"><span class="id">map′∘pair</span> = <span class="id">a</span> -&gt; <span class="id">b</span> -&gt; <!--
   map′ identifier in the slot. S1→S2 replaces it with the inlined lambda
   body, which copies from the `map′ = ...` def line on line 0 (see
   `.binder` / `.body` below).
   --><span class="uv" :class="rng(0, 1)" style="--uv-w:4ch"><span class="id">map′</span></span><!--
   Lambda wrap parens — NEW syntax added at S1→S2 (def line has no outer
   parens around its body), so these fade in normally rather than copy.
   --><span class="uv" :class="rng(2, 3)" style="--uv-w:1ch">(</span><!--
   Binder `.pair(a, b) -> `: COPY from def line col 7 (where .pair begins
   on the top line). At S0/S1 parked at def position, invisible; at
   S1→S2 flies DOWN to slot natural position. Destructure β at S2→S3
   fades it back out in place.
   --><span class="uv binder" :class="rng(2, 2)" style="--uv-w:15ch"><span class="ctor">.pair</span>(<span class="id">a</span>, <span class="id">b</span>) -&gt; </span><!--
   Body `f -> f(a)(b)`: COPY from def line col 22 (right after the
   binder on the top line). Flies down S1→S2 alongside the binder, then
   persists through S3 and S4 as the final reduced form.
   --><span class="uv body" :class="rng(2, 4)" style="--uv-w:12ch"><span class="id">f</span> -&gt; <span class="id">f</span>(<span class="id">a</span>)(<span class="id">b</span>)</span><!--
   --><span class="uv" :class="rng(2, 3)" style="--uv-w:1ch">)</span><!--
   Argument group `(.pair(a, b))` — `(` and `)` persist S0-S2 (first as
   map′'s call parens, then as the application parens after inlining);
   dropped at S2→S3 along with the destructured argument.
   --><span class="uv" :class="rng(0, 2)" style="--uv-w:1ch">(</span><!--
   S0-only inner: `pair(a)(b)` folds to `.pair(a, b)` at S0→S1.
   --><span class="uv" :class="rng(0, 0)" style="--uv-w:10ch"><span class="id">pair</span>(<span class="id">a</span>)(<span class="id">b</span>)</span><!--
   Persistent argument `.pair(a, b)` — S1-S2, unchanged through inlining.
   --><span class="uv" :class="rng(1, 2)" style="--uv-w:11ch"><span class="ctor">.pair</span>(<span class="id">a</span>, <span class="id">b</span>)</span><!--
   --><span class="uv" :class="rng(0, 2)" style="--uv-w:1ch">)</span><!--
 --></span><!--
 --><span class="line"></span><!--
 --><span class="line"><span class="id">map′∘pair</span>(<span class="num">1</span>)(<span class="num">2</span>)(<span class="id">a</span> -&gt; <span class="id">b</span> -&gt; <span class="id">a</span>)</span><!--
 --><span class="line"><span class="id">map′∘pair</span>(<span class="num">1</span>)(<span class="num">2</span>)(<span class="id">a</span> -&gt; <span class="id">b</span> -&gt; <span class="id">b'</span>)</span><!--
--></pre>
  </div>
</template>

<style scoped>
.deriv {
  color: #24292f;
  font-size: var(--slidev-code-font-size);
  line-height: var(--slidev-code-line-height);
  --ease:    cubic-bezier(0.4, 0, 0.2, 1);
  --t-dur:   850ms;
}
.deriv.dir-rev { --ease: cubic-bezier(0.8, 0, 0.6, 1); }

.frame {
  margin: 0;
  background: #f6f8fa;
  padding: 0.75em 1em;
  border-radius: 6px;
  white-space: pre;
  overflow: hidden;
}

.ctor { color: #116329; font-weight: 600; }
.id   { color: #24292f; }
.num  { color: #0550ae; }

.line {
  display: block;
  height: 1.5em;
  overflow: visible;
}

/* Per-token inline-block that interpolates max-width between 0 and its
 * content width (--uv-w set inline). Persistent tokens stay `active`
 * across several stages — only the stage-boundary transitions animate
 * their neighbours. */
.uv {
  display: inline-block;
  max-width: var(--uv-w, 50ch);
  overflow: hidden;
  vertical-align: top;
  opacity: 1;
  transition:
    max-width var(--t-dur) var(--ease),
    opacity   var(--t-dur) var(--ease);
}
.uv.past,
.uv.future { max-width: 0; opacity: 0; }

/* ====================================================================
 * Copy-from-def: the binder + body visually originate from the
 * `map′ = .pair(a, b) -> f -> f(a)(b)` def line at the top of the
 * frame, and fly down to the slot at S1→S2.
 *
 * Because the forward transition snaps both tokens' max-width at t=0
 * (see `.dir-fwd.state-s2` rules below), the flow anchors at the
 * MOMENT the copy becomes visible are the POST-snap anchors, not the
 * S1 ones. Compute translate X from those post-snap anchors so the
 * copy lands pixel-aligned on the def-line text:
 *   - binder post-snap anchor: 22 (prefix) + 4 (map′ still full) + 0
 *     (outer( still 0) = col 26. Def target for `.pair`: col 7.
 *     Δ = -19ch.
 *   - body   post-snap anchor: 22 + 4 + 0 + 15 (binder snapped to
 *     full width) = col 41. Def target for `f`: col 22.
 *     Δ = -19ch. (Coincidentally the same as the binder — the gap
 *     between the two tokens in the slot matches the gap between
 *     their def-line positions, so the offset is uniform.)
 * Y offset: slot is on line 2 of the pre (def → blank → slot), each
 * line is 1.5em, so -3em parks the token on the def line. */
.binder, .body {
  transform: translate(0, 0);
  transition:
    max-width var(--t-dur) var(--ease),
    opacity   var(--t-dur) var(--ease),
    transform var(--t-dur) var(--ease);
}
.state-s0 .binder, .state-s1 .binder,
.state-s0 .body,   .state-s1 .body {
  transform: translate(-19ch, -3em);
}

/* Forward S1→S2 — copy fly-DOWN.
 * max-width + opacity snap at START (t=0): the copy appears at FULL
 * width and FULL opacity at the def-line position instantly, then
 * translate interpolates it down to the slot natural flow. Pure
 * vertical-ish motion, no reveal-while-moving. */
.dir-fwd.state-s2 .binder,
.dir-fwd.state-s2 .body {
  transition:
    max-width 0ms,
    opacity   0ms,
    transform var(--t-dur) var(--ease);
}

/* Reverse S2→S1 — copy fly-UP.
 * max-width + opacity snap at END (t=850ms) so the copy stays visible
 * at full size throughout the up-travel, then vanishes the moment it
 * arrives back at the def line. Mirror of the forward motion. */
.dir-rev.state-s1 .binder,
.dir-rev.state-s1 .body {
  transition:
    max-width 0ms         var(--ease) var(--t-dur),
    opacity   0ms         var(--ease) var(--t-dur),
    transform var(--t-dur) var(--ease);
}
</style>
