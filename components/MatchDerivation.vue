<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $slidev } = useSlideContext()
// Derivation animation (above usage) caps at 'folded' — clicks >= 3 freeze
// the upper block so the reduction below can play without disturbing it.
const derivStates = ['original', 'inlined', 'extracted', 'folded'] as const
const derivState = computed(() => {
  const idx = Math.max(0, Math.min($slidev.nav.clicks, derivStates.length - 1))
  return derivStates[idx]
})

// Usage-line beta-reduction animation. Each token span covers a
// [first, last] stage range during which it sits `active`; outside
// that range it is `future` (not yet appeared) or `past` (already
// consumed) — both parked at max-width 0 opacity 0. Pure width +
// opacity, no transform. The five stage-specific expression tokens
// (stages 0..4) live INSIDE a `.slot` wrapper that stacks them
// absolutely at its top-left, so their left edges coincide — during
// a transition the outgoing and incoming expression are both visible,
// expanding/collapsing from the same anchor.
//   0: if (true) ( 1 )      ( 0 )                    — clicks ≤ 3
//   1: true ( 1 )      ( 0 )                         — click 4 (reduce-if)
//   2: (then -> otherwise -> then) ( 1 )      ( 0 )  — click 5 (inline-true)
//   3: (otherwise -> 1)      ( 0 )                   — click 6 (assign-then)
//   4: 1                                              — click ≥ 7 (assign-otherwise)
const usageIdx = computed(() => {
  const c = $slidev.nav.clicks
  if (c >= 7) return 4
  if (c === 6) return 3
  if (c === 5) return 2
  if (c === 4) return 1
  return 0
})
const spanClass = (first: number, last: number) => {
  const u = usageIdx.value
  if (u < first) return 'future'
  if (u > last) return 'past'
  return 'active'
}

// Expression-slot width per stage (in ch). The slot stacks all stage-
// specific expression tokens at the same left edge so the active token's
// width sets the slot's width — and during transitions, both the
// outgoing and incoming expressions remain visible simultaneously at
// that shared left edge (the "overlap moment" for true → trueExp etc.).
// `true` is shared across stages 0 and 1; `if (` and `)` wrap it in
// flow at stage 0 and collapse at stage 1+. Slot holds the shared
// `true` plus the stage 2..4 expressions (each stacked at slot's left).
const slotW = computed(() => ['4ch', '4ch', '27ch', '14ch', '0ch'][usageIdx.value])

// Lambda-group's at-defa X offsets from the slot's flow position so its
// VISUAL x sits at col 8 (defA's column). At stage 1+ the slot is at
// col 3 (ifPre collapsed), so 5ch reaches col 8. Stage 0 uses the same
// 5ch even though the slot sits at col 7 then, because the group is
// invisible at stage 0 — using a different value would cause a visible
// horizontal slide on the 0→1 pop-in.
const atDefaX = computed(() => '5ch')

// Lambda-group is parked invisibly at defA for stages 0–1. At stage 1→2
// (click 4→5) it snaps visible instantly and travels to the slot.
const lambdaClass = computed(() => {
  const u = usageIdx.value
  if (u <= 1) return 'future at-defa'
  if (u <= 3) return 'active'
  return 'past'
})

// defA hides when the lambda-group is in the slot (usageIdx >= 2).
const defAHidden = computed(() => usageIdx.value >= 2)

// Track navigation direction so reverse playback can use the inverse-bezier
// easing (and mirror per-element delays) — a true time-reverse of forward.
const dir = ref<'fwd' | 'rev'>('fwd')
let lastClicks = $slidev.nav.clicks
watch(() => $slidev.nav.clicks, (n) => {
  dir.value = n >= lastClicks ? 'fwd' : 'rev'
  lastClicks = n
})
</script>

<template>
  <div class="deriv font-mono" :class="[`state-${derivState}`, `dir-${dir}`]">
    <pre class="frame"><!--
   --><span class="line l-if"><span class="id">if</span> = <span class="id">cond</span> -&gt;<span class="v outer"> <span class="id">then</span> -&gt; <span class="id">otherwise</span> -&gt;</span><span class="v condEnd"> <span class="id">cond</span></span></span><!--
   --><span class="line l-match-open">  <span class="kw">match</span> <span class="id">cond</span> <span class="punct">{</span></span><!--
   --><span class="line l-arm-true">    <span class="ctor">.true</span> =&gt; <span class="v copyA"><span class="id">then</span> -&gt; <span class="id">otherwise</span> -&gt; </span><span class="v bodyA"><span class="id">then</span></span><span class="v armTrue"><span class="id">true</span></span><span class="comma punct">,</span></span><!--
   --><span class="line l-arm-false">    <span class="ctor">.false</span> =&gt; <span class="v copyB"><span class="id">then</span> -&gt; <span class="id">otherwise</span> -&gt; </span><span class="v bodyB"><span class="id">otherwise</span></span><span class="v armFalse"><span class="id">false</span></span><span class="comma punct">,</span></span><!--
   --><span class="line l-match-close">  <span class="punct">}</span></span><!--
   --><span class="line l-blank"></span><!--
   --><span class="line l-def-true"><span class="id">true</span>  = <span class="v defA" :class="defAHidden ? 'u-hidden' : ''"><span class="id">then</span> -&gt; <span class="id">otherwise</span> -&gt; <span class="id">then</span></span></span><!--
   --><span class="line l-def-false"><span class="id">false</span> = <span class="v defB"><span class="id">then</span> -&gt; <span class="id">otherwise</span> -&gt; <span class="id">otherwise</span></span></span><!--
   --><span class="line l-blank2"></span><!--
   --><span class="line l-comment"><span class="cmt">// if (true) { 1 } else { 0 }</span></span><!--
   --><span class="line l-usage"><!--
      --><span class="uv" :class="spanClass(0, 4)" style="--uv-w:3ch">   </span><!--
      --><span class="uv" :class="spanClass(0, 0)" style="--uv-w:4ch"><span class="id">if</span> (</span><!--
      --><span class="slot" :style="{ '--slot-w': slotW }"><!--
         --><span class="uv sp" :class="spanClass(0, 1)" style="--uv-w:4ch"><span class="id">true</span></span><!--
         --><span class="uv sp lambda-group" :class="lambdaClass" :style="{ '--uv-w': '30ch', '--at-defa-x': atDefaX }"><!--
            --><span class="uv" :class="spanClass(2, 3)" style="--uv-w:1ch">(</span><!--
            --><span class="uv copy-body" :class="spanClass(1, 2)" style="--uv-w:8ch"><span class="id">then</span> -&gt; </span><!--
            --><span class="uv copy-body" :class="spanClass(1, 3)" style="--uv-w:13ch"><span class="id">otherwise</span> -&gt; </span><!--
            --><span class="uv copy-body" :class="spanClass(1, 2)" style="--uv-w:4ch"><span class="id">then</span></span><!--
            --><span class="uv" :class="spanClass(2, 2)" style="--uv-w:1ch">)</span><!--
         --></span><!--
      --></span><!--
      --><span class="uv" :class="spanClass(0, 0)" style="--uv-w:1ch">)</span><!--
      --><span class="uv" :class="spanClass(0, 2)" style="--uv-w:1ch"> </span><!--
      --><span class="uv" :class="spanClass(0, 2)" style="--uv-w:1ch">(</span><!--
      --><span class="uv" :class="spanClass(0, 2)" style="--uv-w:1ch"> </span><!--
      --><span class="uv" :class="spanClass(0, 4)" style="--uv-w:1ch"><span class="num">1</span></span><!--
      --><span class="uv" :class="spanClass(0, 3)" style="--uv-w:1ch"> </span><!--
      --><span class="uv" :class="spanClass(0, 3)" style="--uv-w:1ch">)</span><!--
      --><span class="uv" :class="spanClass(0, 3)" style="--uv-w:11ch">      ( <span class="num">0</span> )</span><!--
   --></span><!--
--></pre>
  </div>
</template>

<style scoped>
.deriv {
  color: #24292f;
  font-size: var(--slidev-code-font-size);
  line-height: var(--slidev-code-line-height);
  /* Forward easing and its diagonal inverse — swapping them flips the
   * animation into a true time-reverse of the forward playback.
   * --t-dur / --t-delay are declared here so NON-`.v` descendants
   * (e.g. `.comma`'s keyframe animation) can also reach them. */
  --ease:    cubic-bezier(0.4, 0, 0.2, 1);
  --t-dur:   850ms;
  --t-delay: 0ms;
}
.deriv.dir-rev { --ease: cubic-bezier(0.8, 0, 0.6, 1); }

.frame {
  margin: 0;
  background: #f6f8fa;
  padding: 0.75em 1em;
  border-radius: 6px;
  white-space: pre;
  /* Outer clip. Cross-line children can leave their own `.line` box and
   * travel anywhere inside the pre; the frame bounds keep them contained. */
  overflow: hidden;
}

.kw    { color: #cf222e; font-weight: 600; }
.ctor  { color: #116329; font-weight: 600; }
.id    { color: #24292f; }
.punct { color: #6e7781; }
.cmt   { color: #6e7781; font-style: italic; }
.num   { color: #0550ae; }

/* Usage-line tokens: each `.uv` is an inline-block that collapses via
 * max-width only — no transform — so the animation is strictly a
 * width+opacity interpolation. Persistent tokens x-shift via inline-flow
 * reflow as their siblings' widths change. */
.uv {
  display: inline-block;
  /* Per-token --uv-w (set inline) caps max-width at content width, so the
   * collapse/expand actually interpolates the visible width rather than
   * sitting at the cap for most of the transition. */
  max-width: var(--uv-w, 50ch);
  overflow: hidden;
  vertical-align: top;
  opacity: 1;
  transform: translate(0, 0);
  transition:
    max-width var(--t-dur) var(--ease),
    opacity   var(--t-dur) var(--ease),
    transform var(--t-dur) var(--ease);
}
.uv.past,
.uv.future { max-width: 0; opacity: 0; }

.lambda-group.at-defa {
  transform: translate(var(--at-defa-x, 5ch), -6em);
  transition:
    max-width 0ms,
    opacity   0ms,
    transform var(--t-dur) var(--ease);
}
/* While parked at defA the body is invisible, so snap transitions on
 * copy-body are a no-op — kept for safety in case direction reverses. */
.lambda-group.at-defa .copy-body { transition-duration: 0ms; }

/* When leaving defA (fwd, state-folded only): snap visible instantly,
 * animate only transform. :not(.past) ensures this 0ms override doesn't
 * bleed into the u=3→4 collapse (which should fade normally via .uv). */
.dir-fwd.state-folded .lambda-group:not(.at-defa):not(.past) {
  transition:
    max-width 0ms,
    opacity   0ms,
    transform var(--t-dur) var(--ease);
}

/* Reverse travel (state-folded only): stay visible while traveling back
 * to defA, snap invisible at the end. */
.dir-rev.state-folded .lambda-group.at-defa {
  transition:
    max-width 0ms         var(--ease) var(--t-dur),
    opacity   0ms         var(--ease) var(--t-dur),
    transform var(--t-dur) var(--ease);
}

/* defA hides when the lambda-group is in the slot. Class bound directly
 * on the element; transition overrides scoped to state-folded so the
 * derivation animation's own defA rules are untouched. */
.defA.u-hidden { max-width: 0; opacity: 0; }

.dir-fwd.state-folded .defA.u-hidden {
  transition: max-width 0ms, opacity 0ms, transform 0ms;
}
.dir-rev.state-folded .defA:not(.u-hidden) {
  transition:
    max-width 0ms var(--ease) var(--t-dur),
    opacity   0ms var(--ease) var(--t-dur),
    transform 0ms;
}

/* Expression slot: a fixed-left-anchor container that stacks the five
 * stage-specific expression tokens absolutely at its top-left corner.
 * Its width animates to match the active stage's expression — and
 * during a transition, both the outgoing and incoming tokens are
 * visible simultaneously at the shared left edge, giving the
 * "expand from the same anchor, overlapping" motion. */
.slot {
  display: inline-block;
  position: relative;
  width: var(--slot-w);
  height: 1.5em;
  /* overflow visible so lambda-group can translate above the slot (up to
   * the `true = ...` def line) during the copy animation. Each child
   * already has its own overflow:hidden for individual clipping. */
  overflow: visible;
  vertical-align: top;
  transition: width var(--t-dur) var(--ease);
}
.slot > .sp {
  position: absolute;
  top: 0;
  left: 0;
}

/* Each logical line is a block span. Hidden = height 0 + opacity 0;
 * the opacity pair lets collapsed-line static text fade out instead of
 * briefly overlapping neighbors (since overflow is `visible` so that a
 * line's children can translate across into another line's space). */
.line {
  display: block;
  height: 1.5em;
  overflow: visible;
  opacity: 1;
  transition:
    height  850ms var(--ease),
    opacity 850ms var(--ease);
}

/* Inline fragment that appears in some states only: width collapses,
 * opacity fades, and a per-element transform gives directional motion.
 * Timing is carried in CSS vars so per-element overrides (e.g. bodyA/B
 * running shorter) compose cleanly with per-transition overrides. */
.v {
  display: inline-block;
  max-width: 50ch;
  /* `visible` so content can render beyond a collapsed (max-width: 0) box
   * while sliding — hiding is driven by `opacity` in the per-state rules. */
  overflow: visible;
  vertical-align: top;
  opacity: 1;
  transform: translate(0, 0);
  --t-dur: 850ms;
  --t-delay: 0ms;
  transition:
    max-width var(--t-dur) var(--ease) var(--t-delay),
    opacity   var(--t-dur) var(--ease) var(--t-delay),
    transform var(--t-dur) var(--ease) var(--t-delay);
}

/* bodyA/B: 700ms duration in copy (so the body lands before copyA does);
 * reverse copy mirrors with a 150ms delay. In EXTRACT, bodyA/B must stay
 * grouped with copyA/B as "then -> otherwise -> then" glides together —
 * override to 850ms and drop the reverse delay. */
.bodyA, .bodyB { --t-dur: 700ms; }
.dir-rev .bodyA,
.dir-rev .bodyB { --t-delay: 150ms; }

.dir-fwd.state-extracted .bodyA,
.dir-fwd.state-extracted .bodyB,
.dir-rev.state-inlined   .bodyA,
.dir-rev.state-inlined   .bodyB {
  --t-dur: 850ms;
  --t-delay: 0ms;
}

/* ==================================================================
 * outer — base is "snap at end", which is what reverse copy wants
 * (outer stays invisible during the up-slide and only reappears once
 * copyA/B are out of its slot). Forward copy overrides to snap at
 * start so the original text is hidden immediately after copyA spawns. */
.outer {
  transition:
    max-width 0ms var(--ease) var(--t-dur),
    opacity   0ms var(--ease) var(--t-dur),
    transform 0ms;
}
.dir-fwd.state-inlined .outer {
  transition:
    max-width 0ms,
    opacity   0ms,
    transform 0ms;
}

/* ==================================================================
 * Copy (S0 ↔ S1): the "moves-as-is" mechanism — copyA/B swap
 * visibility at the transition boundary (no opacity fade, ever), while
 * `max-width` (which drives bodyA/B's column) and `transform` both
 * interpolate smoothly.
 *   Forward → opacity snap at START (copyA visible from t=0, already
 *              sliding down; outer also snapped out instantly).
 *   Reverse → opacity snap at END   (copyA stays visible through the
 *              up-slide, vanishes at the handoff). */
.dir-fwd.state-inlined .copyA,
.dir-fwd.state-inlined .copyB {
  transition:
    max-width var(--t-dur) var(--ease) var(--t-delay),
    opacity   0ms,
    transform var(--t-dur) var(--ease) var(--t-delay);
}
.dir-rev.state-original .copyA,
.dir-rev.state-original .copyB {
  transition:
    max-width var(--t-dur) var(--ease) var(--t-delay),
    opacity   0ms         var(--ease) var(--t-dur),
    transform var(--t-dur) var(--ease) var(--t-delay);
}

/* ==================================================================
 * Extract (S1 ↔ S2): copyA/B + bodyA/B slide visibly as a group
 * ("then -> otherwise -> then" → def body). For bodyA's "then" to be
 * distinct from copyA's first "then" (so it's seen moving rather than
 * hiding under copyA), the arm layout MUST stay at S1 throughout the
 * glide — bodyA sitting at col 34 shifting to col 29, while copyA at
 * col 13 shifts to col 8. So max-width snaps at the FAR side of each
 * direction (stays S1 during the glide, snaps to S2 at the handoff).
 *   Forward → max-width + opacity snap at END, transform smooth.
 *   Reverse → max-width + opacity snap at START, transform smooth. */
.dir-fwd.state-extracted .copyA,
.dir-fwd.state-extracted .copyB,
.dir-fwd.state-extracted .bodyA,
.dir-fwd.state-extracted .bodyB {
  transition:
    max-width 0ms         var(--ease) var(--t-dur),
    opacity   0ms         var(--ease) var(--t-dur),
    transform var(--t-dur) var(--ease) var(--t-delay);
}
.dir-rev.state-inlined .copyA,
.dir-rev.state-inlined .copyB,
.dir-rev.state-inlined .bodyA,
.dir-rev.state-inlined .bodyB {
  transition:
    max-width 0ms,
    opacity   0ms,
    transform var(--t-dur) var(--ease) var(--t-delay);
}

/* armTrue/armFalse hold their col-13 slot via a `translateX` that
 * cancels the S1 layout offset (copyA 21 + bodyA 4 = 25 chars to the
 * right, so S1 transform is translateX(-25ch); .false is -30ch because
 * the .false arm has `copyB 21 + bodyB 9` = 30 chars).
 * Both `transform` and `max-width` snap at the same boundary as the
 * group above (end on fwd, start on rev) so layout and transform shift
 * together — no drifting through intermediate columns.
 * Opacity fades during the SECOND half of forward (425–850ms) and the
 * FIRST half of reverse (0–425ms), so "true"/"false" appears/disappears
 * together with its comma (whose keyframe animation also does its
 * fade-in / fade-out in the matching half). */
.dir-fwd.state-extracted .armTrue,
.dir-fwd.state-extracted .armFalse {
  transition:
    max-width 0ms                        var(--ease) var(--t-dur),
    opacity   calc(var(--t-dur) / 2)     var(--ease) calc(var(--t-dur) / 2),
    transform 0ms                        var(--ease) var(--t-dur);
}
.dir-rev.state-inlined .armTrue,
.dir-rev.state-inlined .armFalse {
  transition:
    max-width 0ms,
    opacity   calc(var(--t-dur) / 2)     var(--ease) 0ms,
    transform 0ms;
}

/* defA/defB: def body snaps in/out at the handoff — invisible while
 * the arm group is still gliding down (so only "true  = " / "false = "
 * fades in with the line), then the body pops in at t=850 on forward
 * (or pops out at t=0 on reverse). Pure toggle, no animation. */
.dir-fwd.state-extracted .defA,
.dir-fwd.state-extracted .defB {
  transition:
    max-width 0ms var(--ease) var(--t-dur),
    opacity   0ms var(--ease) var(--t-dur);
}
.dir-rev.state-inlined .defA,
.dir-rev.state-inlined .defB {
  transition:
    max-width 0ms,
    opacity   0ms;
}

/* Comma: its inline-flow position shifts when sibling widths snap
 * (arm-true: col 38 → col 17 ; arm-false: col 44 → col 19). Rather
 * than smoothly animate that shift, fade OUT at the source column,
 * snap the visual position via a `translateX` during the invisible
 * midpoint, then fade IN at the destination column — symmetric on
 * reverse. The sibling layout-snap at the animation boundary matches
 * the transform reverting to 0 via normal style, so the visual stays
 * at the destination column across the handoff. */
.comma { display: inline-block; }
.l-arm-true  .comma { --comma-shift: -21ch; }
.l-arm-false .comma { --comma-shift: -25ch; }

.dir-fwd.state-extracted .comma { animation: comma-swap-fwd var(--t-dur) var(--ease); }
.dir-rev.state-inlined   .comma { animation: comma-swap-rev var(--t-dur) var(--ease); }

@keyframes comma-swap-fwd {
  0%   { opacity: 1; transform: translateX(0);                  }
  49%  { opacity: 0; transform: translateX(0);                  }
  50%  { opacity: 0; transform: translateX(var(--comma-shift)); }
  100% { opacity: 1; transform: translateX(var(--comma-shift)); }
}
@keyframes comma-swap-rev {
  0%   { opacity: 1; transform: translateX(var(--comma-shift)); }
  49%  { opacity: 0; transform: translateX(var(--comma-shift)); }
  50%  { opacity: 0; transform: translateX(0);                  }
  100% { opacity: 1; transform: translateX(0);                  }
}

/* ---- Per-fragment hidden rules ---------------------------------------- */
/* outer — visible in S0 only. Opacity required to hide content since
 * `.v` overflow is visible. */
.state-inlined   .outer,
.state-extracted .outer,
.state-folded    .outer { max-width: 0; opacity: 0; }

/* condEnd — visible in S3 only. Slides from down-left on appear. */
.state-original  .condEnd,
.state-inlined   .condEnd,
.state-extracted .condEnd {
  max-width: 0;
  opacity: 0;
  transform: translate(-5ch, 1.5em);
}

/* copyA — visible in S1. S0 hides it from above; opacity is snapped
 * (not animated) in the per-direction copy rules below. S2/S3 glide it
 * down into the matching `.true` def body column during extract. */
.state-original .copyA {
  max-width: 0;
  opacity: 0;
  transform: translate(0, -3em);
}
.state-extracted .copyA,
.state-folded    .copyA {
  max-width: 0;
  opacity: 0;
  transform: translate(-5ch, 6em);
}

/* copyB — analogous for `.false`; extra -1ch on the above-left vector
 * and -6ch left on the def glide match the extra char in ".false". */
.state-original .copyB {
  max-width: 0;
  opacity: 0;
  transform: translate(-1ch, -4.5em);
}
.state-extracted .copyB,
.state-folded    .copyB {
  max-width: 0;
  opacity: 0;
  transform: translate(-6ch, 6em);
}

/* bodyA/bodyB — visible in S0 and S1. Glide down with their copy-mate
 * into the def body column on extract, so "then -> otherwise -> then"
 * visibly travels from the match arm to the def line. */
.state-extracted .bodyA,
.state-folded    .bodyA {
  max-width: 0;
  opacity: 0;
  transform: translate(-5ch, 6em);
}
.state-extracted .bodyB,
.state-folded    .bodyB {
  max-width: 0;
  opacity: 0;
  transform: translate(-6ch, 6em);
}

/* armTrue/armFalse — visible in S2 only. Fade + collapse for others.
 * In S1, a `translateX` offset cancels the inline layout drift caused
 * by copyA/copyB + bodyA/bodyB sitting in front of them, pinning their
 * visual position to col 13/14 (just after "=>") while the arm group
 * glides down during extract. */
.state-original  .armTrue,
.state-original  .armFalse,
.state-inlined   .armTrue,
.state-inlined   .armFalse,
.state-folded    .armTrue,
.state-folded    .armFalse { max-width: 0; opacity: 0; }

.state-inlined .armTrue  { transform: translateX(-25ch); }
.state-inlined .armFalse { transform: translateX(-30ch); }

/* defA/defB — the "then -> otherwise -> then/otherwise" body of the
 * def lines (visible in S2 and S3). Hidden in S0/S1 so the def line
 * shows only "true  = " / "false = " while the arm group is still
 * gliding down; the body then snaps in at the handoff — same mechanism
 * as outer/copyA in S0↔S1 copy. */
.state-original .defA,
.state-original .defB,
.state-inlined  .defA,
.state-inlined  .defB { max-width: 0; opacity: 0; }

/* ---- Line collapses -------------------------------------------------- */
.state-original .l-blank,
.state-original .l-def-true,
.state-original .l-def-false { height: 0; opacity: 0; }

.state-inlined .l-blank,
.state-inlined .l-def-true,
.state-inlined .l-def-false { height: 0; opacity: 0; }

.state-folded .l-match-open,
.state-folded .l-arm-true,
.state-folded .l-arm-false,
.state-folded .l-match-close { height: 0; opacity: 0; }
</style>
