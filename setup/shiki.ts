import { defineShikiSetup } from '@slidev/types'
import nordLight from '../themes/nord-light.json'

export default defineShikiSetup(() => ({
  themes: {
    light: nordLight as any,
    dark: nordLight as any,
  },
  langs: ['ocaml', 'haskell', 'typescript', 'javascript', 'bash', 'md'],
}))
