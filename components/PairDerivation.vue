<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $slidev } = useSlideContext()

// S0: fst(pair(1)(2))                         — initial
// S1: map 줄 등장, usage 유지                  — map line folds in
// S2: fst 후위 이동 → map(pair(1)(2))(fst)     — fst parking release
// S3: map∘pair 줄 등장, usage 유지             — compose line folds in
// S4: ( → ∘ 교체, ) 제거 → map∘pair(1)(2)(fst) — usage token swap
// S5: fst/snd 람다화, map→map′                 — pattern rewrite
// S6: pair 줄 제거, .pair 하강                 — pair line folds out
// S7: data 줄 제거, .pair 소거 → f(a)(b)       — church encoding complete
const stateIdx = computed(() => Math.min($slidev.nav.clicks, 7))

const dir = ref<'fwd' | 'rev'>('fwd')
let lastClicks = $slidev.nav.clicks
watch(() => $slidev.nav.clicks, (n) => {
  dir.value = n >= lastClicks ? 'fwd' : 'rev'
  lastClicks = n
})
</script>

<template>
  <div class="deriv font-mono" :class="[`state-s${stateIdx}`, `dir-${dir}`]">
    <pre class="frame"><!--
   --><span class="line l-data"><span class="kw">data</span> <span class="id">Pair</span>[<span class="id">A</span>, <span class="id">B</span>] = <span class="ctor">.pair</span>(<span class="id">A</span>, <span class="id">B</span>)</span><!--
   --><span class="line l-pair"><span class="id">pair</span> = <span class="id">a</span> -&gt; <span class="id">b</span> -&gt; <span class="ctor">.pair</span>(<span class="id">a</span>, <span class="id">b</span>)</span><!--
   --><span class="line l-blank1"></span><!--
   --><span class="line l-fst"><!--
      --><span class="id">fst</span> = <!--
      --><span class="v fst-pair-pre"><span class="ctor">.pair</span>(</span><!--
      --><span class="id">a</span><!--
      --><span class="v fst-sep-comma">, </span><!--
      --><span class="v fst-sep-arrow"> -&gt; </span><!--
      --><span class="id">b</span><!--
      --><span class="v fst-pat-close">)</span><!--
      --> -&gt; <span class="id">a</span><!--
   --></span><!--
   --><span class="line l-snd"><!--
      --><span class="id">snd</span> = <!--
      --><span class="v snd-pair-pre"><span class="ctor">.pair</span>(</span><!--
      --><span class="id">a</span><!--
      --><span class="v snd-sep-comma">, </span><!--
      --><span class="v snd-sep-arrow"> -&gt; </span><!--
      --><span class="id">b</span><!--
      --><span class="v snd-pat-close">)</span><!--
      --> -&gt; <span class="id">b</span><!--
   --></span><!--
   --><span class="line l-blank2"></span><!--
   --><span class="line l-map"><!--
      --><span class="id">map</span><!--
      --><span class="v prime-map">′</span><!--
      --> = <!--
      --><span class="v map-param-p"><span class="id">p</span></span><!--
      --><span class="v map-param-pat"><span class="ctor">.pair</span>(<span class="id">a</span>, <span class="id">b</span>)</span><!--
      --> -&gt; <span class="id">f</span> -&gt; <span class="id">f</span>(<!--
      --><span class="v map-body-p"><span class="id">p</span></span><!--
      --><span class="v map-body-a"><span class="id">a</span></span><!--
      -->)<span class="v map-body-suffix">(<span class="id">b</span>)</span><!--
   --></span><!--
   --><span class="line l-compose"><!--
      --><span class="id">map</span><!--
      --><span class="v prime-compose">′</span><!--
      -->∘<span class="id">pair</span> = <span class="id">a</span> -&gt; <span class="id">b</span> -&gt; <span class="id">f</span> -&gt; <span class="id">map</span>(<!--
      --><span class="v cp-dot">.</span><!--
      --><span class="v cp-pair-body"><span class="id">pair</span>(</span><!--
      --><span class="id">a</span><!--
      --><span class="v cp-sep-A">)(</span><!--
      --><span class="v cp-sep-B">, </span><!--
      --><span class="id">b</span>)<!--
      --><span class="v cp-outer-close">)</span>(<span class="id">f</span>)<!--
   --></span><!--
   --><span class="line l-blank3"></span><!--
   --><span class="line l-usage"><!--
      --><span class="uv fst-src" style="--uv-w:3ch"><span class="id">fst</span></span><!--
      --><span class="uv map-tok" style="--uv-w:3ch"><span class="id">map</span></span><!--
      --><span class="uv tok-prime-u" style="--uv-w:1ch">′</span><!--
      --><span class="uv tok-open-paren" style="--uv-w:1ch">(</span><!--
      --><span class="uv tok-compose-u" style="--uv-w:1ch">∘</span><!--
      --><span class="uv pair-tok" style="--uv-w:4ch"><span class="id">pair</span></span><!--
      --><span class="uv" style="--uv-w:3ch">(<span class="num">1</span>)</span><!--
      --><span class="uv" style="--uv-w:3ch">(<span class="num">2</span>)</span><!--
      --><span class="uv close-paren" style="--uv-w:1ch">)</span><!--
      --><span class="uv fst-dst" style="--uv-w:5ch"><!--
         --><span class="uv fst-dst-open" style="--uv-w:1ch">(</span><!--
         --><span class="id">fst</span><!--
         --><span class="uv fst-dst-close" style="--uv-w:1ch">)</span><!--
      --></span><!--
   --></span><!--
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
  --t-delay: 0ms;
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

.kw    { color: #cf222e; font-weight: 600; }
.ctor  { color: #116329; font-weight: 600; }
.id    { color: #24292f; }
.num   { color: #0550ae; }

/* ---- Line ---- */
.line {
  display: block;
  height: 1.5em;
  overflow: visible;
  opacity: 1;
  transition:
    height  var(--t-dur) var(--ease),
    opacity var(--t-dur) var(--ease);
}

/* ---- Def-line animated fragment ---- */
.v {
  display: inline-block;
  max-width: 50ch;
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

/* fst-dst slides over other tokens — frame background keeps it readable */
.fst-dst { background: #f6f8fa; }

/* ---- Usage-line token ---- */
.uv {
  display: inline-block;
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

/* ================================================================
 * Line visibility per state
 * ================================================================ */

/* l-map: hidden S0 only */
.state-s0 .l-map { height: 0; opacity: 0; }

/* l-compose: hidden S0-S2 */
.state-s0 .l-compose, .state-s1 .l-compose,
.state-s2 .l-compose { height: 0; opacity: 0; }

/* l-blank3: hidden S0 only */
.state-s0 .l-blank3 { height: 0; opacity: 0; }

/* l-pair: hidden S6, S7 */
.state-s6 .l-pair,
.state-s7 .l-pair { height: 0; opacity: 0; }

/* l-data: hidden S7 */
.state-s7 .l-data { height: 0; opacity: 0; }

/* l-blank1: hidden S7 */
.state-s7 .l-blank1 { height: 0; opacity: 0; }

/* ================================================================
 * fst/snd pattern tokens
 * S0-S4: .pair(a, b) pattern; S5+: lambda style
 * ================================================================ */

/* .pair( prefix: hidden S5+ */
.state-s5 .fst-pair-pre, .state-s6 .fst-pair-pre, .state-s7 .fst-pair-pre,
.state-s5 .snd-pair-pre, .state-s6 .snd-pair-pre, .state-s7 .snd-pair-pre { max-width: 0; opacity: 0; }

/* , separator: hidden S5+ */
.state-s5 .fst-sep-comma, .state-s6 .fst-sep-comma, .state-s7 .fst-sep-comma,
.state-s5 .snd-sep-comma, .state-s6 .snd-sep-comma, .state-s7 .snd-sep-comma { max-width: 0; opacity: 0; }

/* ) close: hidden S5+ */
.state-s5 .fst-pat-close, .state-s6 .fst-pat-close, .state-s7 .fst-pat-close,
.state-s5 .snd-pat-close, .state-s6 .snd-pat-close, .state-s7 .snd-pat-close { max-width: 0; opacity: 0; }

/* -> arrow: hidden S0-S4, visible S5+ */
.state-s0 .fst-sep-arrow, .state-s1 .fst-sep-arrow, .state-s2 .fst-sep-arrow,
.state-s3 .fst-sep-arrow, .state-s4 .fst-sep-arrow,
.state-s0 .snd-sep-arrow, .state-s1 .snd-sep-arrow, .state-s2 .snd-sep-arrow,
.state-s3 .snd-sep-arrow, .state-s4 .snd-sep-arrow { max-width: 0; opacity: 0; }

/* ================================================================
 * map line body tokens
 * S1-S4: map = p -> f -> f(p)
 * S5+:   map′ = .pair(a, b) -> f -> f(a)(b)
 * ================================================================ */

/* prime: hidden S0-S4 */
.state-s0 .prime-map,    .state-s1 .prime-map,    .state-s2 .prime-map,
.state-s3 .prime-map,    .state-s4 .prime-map,
.state-s0 .prime-compose, .state-s1 .prime-compose, .state-s2 .prime-compose,
.state-s3 .prime-compose, .state-s4 .prime-compose { max-width: 0; opacity: 0; }

/* param-p: visible S1-S4, hidden S5+ (S0 omitted — l-map folded) */
.state-s5 .map-param-p, .state-s6 .map-param-p, .state-s7 .map-param-p { max-width: 0; opacity: 0; }

/* param-pat: hidden S0-S4 (S0 = pre-fold match), visible S5+ */
.state-s0 .map-param-pat,
.state-s1 .map-param-pat, .state-s2 .map-param-pat,
.state-s3 .map-param-pat, .state-s4 .map-param-pat { max-width: 0; opacity: 0; }

/* body-p: visible S1-S4, hidden S5+ (S0 omitted — l-map folded) */
.state-s5 .map-body-p, .state-s6 .map-body-p, .state-s7 .map-body-p { max-width: 0; opacity: 0; }

/* body-a: hidden S0-S4, visible S5+ */
.state-s0 .map-body-a, .state-s1 .map-body-a, .state-s2 .map-body-a,
.state-s3 .map-body-a, .state-s4 .map-body-a { max-width: 0; opacity: 0; }

/* body-suffix: hidden S0-S4, visible S5+ */
.state-s0 .map-body-suffix, .state-s1 .map-body-suffix, .state-s2 .map-body-suffix,
.state-s3 .map-body-suffix, .state-s4 .map-body-suffix { max-width: 0; opacity: 0; }

/* ================================================================
 * compose line body tokens
 * S4-S5: f(pair(a)(b))  cp-dot hidden, cp-sep-A visible, cp-sep-B hidden
 * S6:    f(.pair(a, b)) cp-dot visible, cp-sep-B visible, cp-sep-A hidden
 * S7:    f(a)(b)        cp-pair-body/dot hidden, cp-sep-A visible, cp-outer-close hidden
 * ================================================================ */

/* cp-dot: hidden S0-S4 (pre-fold S0-S2 + S3/S4), visible S6, hidden S7 */
.state-s0 .cp-dot, .state-s1 .cp-dot, .state-s2 .cp-dot,
.state-s3 .cp-dot, .state-s4 .cp-dot, .state-s5 .cp-dot,
.state-s7 .cp-dot { max-width: 0; opacity: 0; }

/* cp-pair-body: hidden S7 */
.state-s7 .cp-pair-body { max-width: 0; opacity: 0; }

/* cp-sep-A: visible S4-S5 and S7, hidden S6 */
.state-s6 .cp-sep-A { max-width: 0; opacity: 0; }

/* cp-sep-B: hidden S0-S4 (pre-fold S0-S2 + S3/S4) and S7, visible S6 */
.state-s0 .cp-sep-B, .state-s1 .cp-sep-B, .state-s2 .cp-sep-B,
.state-s3 .cp-sep-B, .state-s4 .cp-sep-B, .state-s5 .cp-sep-B,
.state-s7 .cp-sep-B { max-width: 0; opacity: 0; }

/* cp-outer-close: visible S4-S6, hidden S7 */
.state-s7 .cp-outer-close { max-width: 0; opacity: 0; }

/* ================================================================
 * Usage line tokens
 * S0-S1: fst(pair(1)(2))           fst-src visible, map-tok/fst-dst parked
 * S2:    map(pair(1)(2))(fst)      fst parking release
 * S3:    map(pair(1)(2))(fst)      usage unchanged (compose line appears)
 * S4:    map∘pair(1)(2)(fst)       ( → ∘ swap, ) removed
 * S5:    map′∘pair(1)(2)(fst)      ′ appears
 * S6-S7: same usage
 * ================================================================ */

/* fst-src: visible S0-S1, hidden S2+ */
.state-s2 .fst-src, .state-s3 .fst-src, .state-s4 .fst-src,
.state-s5 .fst-src, .state-s6 .fst-src, .state-s7 .fst-src { max-width: 0; opacity: 0; }

/* map-tok: hidden S0-S1, visible S2+ */
.state-s0 .map-tok, .state-s1 .map-tok { max-width: 0; opacity: 0; }

/* tok-prime-u: hidden S0-S4, visible S5+ */
.state-s0 .tok-prime-u, .state-s1 .tok-prime-u, .state-s2 .tok-prime-u,
.state-s3 .tok-prime-u, .state-s4 .tok-prime-u { max-width: 0; opacity: 0; }

/* tok-open-paren: visible S0-S3, hidden S4+ (replaced by ∘ at S4) */
.state-s4 .tok-open-paren, .state-s5 .tok-open-paren,
.state-s6 .tok-open-paren, .state-s7 .tok-open-paren { max-width: 0; opacity: 0; }

/* tok-compose-u (∘): hidden S0-S3, visible S4+ */
.state-s0 .tok-compose-u, .state-s1 .tok-compose-u,
.state-s2 .tok-compose-u, .state-s3 .tok-compose-u { max-width: 0; opacity: 0; }

/* close-paren: visible S0-S3, hidden S4+ */
.state-s4 .close-paren, .state-s5 .close-paren,
.state-s6 .close-paren, .state-s7 .close-paren { max-width: 0; opacity: 0; }

/* fst-dst: parked at col 0 in S0-S1 — hidden until snap at S1→S2 */
.state-s0 .fst-dst,
.state-s1 .fst-dst { opacity: 0; transform: translate(-15ch, 0); }
.state-s0 .fst-dst-open, .state-s0 .fst-dst-close,
.state-s1 .fst-dst-open, .state-s1 .fst-dst-close { max-width: 0; }

/* S1→S2 fwd: fst-dst opacity snaps to 1 at start, transform slides */
.dir-fwd.state-s2 .fst-dst {
  transition: opacity 0ms, transform var(--t-dur) var(--ease);
}
/* S2→S1 rev: fst-dst opacity snaps to 0 at end */
.dir-rev.state-s1 .fst-dst {
  transition: opacity 0ms var(--ease) var(--t-dur), transform var(--t-dur) var(--ease);
}

/* S1→S2 fwd: fst-src opacity snaps to 0 at start, width collapses */
.dir-fwd.state-s2 .fst-src {
  transition: max-width var(--t-dur) var(--ease), opacity 0ms;
}
/* S2→S1 rev: fst-src opacity snaps to 1 at end */
.dir-rev.state-s1 .fst-src {
  transition: max-width var(--t-dur) var(--ease), opacity 0ms var(--ease) var(--t-dur);
}
.state-s0 .fst-dst-open, .state-s0 .fst-dst-close,
.state-s1 .fst-dst-open, .state-s1 .fst-dst-close { max-width: 0; }
</style>
