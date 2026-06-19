import { defineComponent, h, ref, watch, onMounted } from 'vue'
import type { CompiledAnimation } from './types.js'

const EASING_FWD = 'cubic-bezier(0.4, 0, 0.2, 1)'
const EASING_REV = 'cubic-bezier(0.8, 0, 0.6, 1)'
const DURATION = 850
// Backdrop + stacking applied to a token only while it is sliding to a new position.
const MOVE_Z_INDEX = 10
const MOVE_BG = 'var(--scm-move-bg, #ffffff)'

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

      function cancelAnimations(el: HTMLElement) {
        el.getAnimations().forEach((a) => {
          try { (a as unknown as { commitStyles(): void }).commitStyles() } catch { /* not rendered */ }
          a.cancel()
        })
      }

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
          cancelAnimations(el)

          // A floated token that actually shifts this transition is "in flight": give it a
          // temporary backdrop + raised stacking so it reads cleanly over the tokens it
          // passes, then clear both once it settles (or the move is interrupted).
          const inFlight = token.float === true && fromState.transform !== toState.transform
          if (inFlight) {
            el.style.zIndex = String(MOVE_Z_INDEX)
            el.style.background = MOVE_BG
            el.style.borderRadius = '3px'
            el.style.boxShadow = `0 0 0 2px ${MOVE_BG}`
          }

          const anim = el.animate(
            [
              { maxWidth: fromState.maxWidth, opacity: fromState.opacity, transform: fromState.transform },
              { maxWidth: toState.maxWidth,   opacity: toState.opacity,   transform: toState.transform },
            ],
            { duration: DURATION, easing, fill: 'forwards' },
          )

          if (inFlight) {
            // Tag this element with the owning animation. cancelAnimations() on the next
            // navigation cancels the prior move, whose 'cancel' event fires asynchronously
            // — by then a newer move may own the element, so only clear if still ours.
            const owner = el as HTMLElement & { _scmMoveAnim?: Animation }
            owner._scmMoveAnim = anim
            const clearBackdrop = () => {
              if (owner._scmMoveAnim !== anim) return
              owner._scmMoveAnim = undefined
              el.style.zIndex = ''
              el.style.background = ''
              el.style.borderRadius = ''
              el.style.boxShadow = ''
            }
            anim.addEventListener('finish', clearBackdrop)
            anim.addEventListener('cancel', clearBackdrop)
          }
        }

        for (const line of compiled.lines) {
          const fromState = line.steps[clampedFrom]
          const toState   = line.steps[clampedTo]
          if (!fromState || !toState) continue
          const el = root.value.querySelector<HTMLElement>(`[data-line-id="${CSS.escape(line.id)}"]`)
          if (!el) continue
          cancelAnimations(el)
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
