import { defineShikiSetup } from '@slidev/types'
import { funnylambda } from './shiki-grammar.js'

export default defineShikiSetup(() => ({
  themes: {
    light: 'github-light-default',
    dark: 'github-light-default',
  },
  langs: ['typescript', 'javascript', 'rust', 'kotlin', 'haskell', 'bash', 'md', funnylambda as any],
}))
