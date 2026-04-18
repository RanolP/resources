import { defineConfig } from 'unocss'

const freesentation = (weight: number, name: string) =>
  `@font-face{font-family:'Freesentation';font-weight:${weight};font-style:normal;font-display:swap;src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/2404@1.0/Freesentation-${weight / 100}${name}.woff2') format('woff2');}`

const iosevka = (weight: number, style: 'normal' | 'italic') =>
  `@font-face{font-family:'Iosevka Nerd Font';font-weight:${weight};font-style:${style};font-display:swap;src:url('https://cdn.jsdelivr.net/npm/@fontsource/iosevka@latest/files/iosevka-latin-${weight}-${style}.woff2') format('woff2');}`

export default defineConfig({
  preflights: [
    {
      getCSS: () =>
        [
          freesentation(100, 'Thin'),
          freesentation(200, 'ExtraLight'),
          freesentation(300, 'Light'),
          freesentation(400, 'Regular'),
          freesentation(500, 'Medium'),
          freesentation(600, 'SemiBold'),
          freesentation(700, 'Bold'),
          freesentation(800, 'ExtraBold'),
          freesentation(900, 'Black'),
          iosevka(400, 'normal'),
          iosevka(700, 'normal'),
          iosevka(400, 'italic'),
          `:root{--slidev-code-background:#eceff4;}`,
          `.slidev-layout{background:#fff;color:#111;}`,
          `.slidev-layout h1,.slidev-layout h2,.slidev-layout h3,.slidev-layout h4{color:#111;font-style:normal;font-weight:700;}`,
          `.slidev-layout h2{font-weight:500;}`,
          `.slidev-layout pre,.slidev-layout code{background-color:#eceff4!important;}`,
        ].join(''),
    },
  ],
})
