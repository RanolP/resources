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

      function cancelAnimations(el: HTMLElement) {
        try {
          ;(el as HTMLElement & { commitStyles(): void }).commitStyles()
        } catch {
          // commitStyles throws if the element is not rendered — safe to ignore
        }
        el.getAnimations().forEach((a) => a.cancel())
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
