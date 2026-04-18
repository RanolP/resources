import { defineConfig } from 'unocss'

const freesentation = (weight: number, name: string) =>
  `@font-face{font-family:'Freesentation';font-weight:${weight};font-style:normal;font-display:swap;src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/2404@1.0/Freesentation-${weight / 100}${name}.woff2') format('woff2');}`

const jetbrainsMono = (weight: number) =>
  `@font-face{font-family:'JetBrains Mono';font-weight:${weight};font-style:normal;font-display:swap;src:url('https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@latest/files/jetbrains-mono-latin-${weight}-normal.woff2') format('woff2');}`

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
          jetbrainsMono(400),
          jetbrainsMono(700),
          `:root{--slidev-code-background:#f5f5f5;}`,
          `.slidev-layout{background:#fff;color:#111;}`,
          `.slidev-layout h1,.slidev-layout h2,.slidev-layout h3,.slidev-layout h4{color:#111;font-style:normal;font-weight:700;}`,
          `.slidev-layout h2{font-weight:500;}`,
          // Language badge, top-right corner of each code block.
          `.slidev-code-wrapper{position:relative;}`,
          `.slidev-code-wrapper::before{position:absolute;bottom:0;right:0;padding:0 0.8em;font-size:0.5em;line-height:1.6;font-weight:700;font-family:'Freesentation','Noto Sans KR',system-ui,sans-serif;color:#eceff4;background:#2e3440;border-bottom-right-radius:4px;border-top-left-radius:4px;pointer-events:none;z-index:1;letter-spacing:.06em;}`,
          `.slidev-code-wrapper:has(.language-rust)::before{content:'Rust';background:#D34516;}`,
          `.slidev-code-wrapper:has(.language-ts)::before,.slidev-code-wrapper:has(.language-typescript)::before{content:'TypeScript';background:#3178C6;}`,
          `.slidev-code-wrapper:has(.language-kotlin)::before{content:'Kotlin';background:#7F52FF;}`,
          `.slidev-code-wrapper:has(.language-js)::before,.slidev-code-wrapper:has(.language-javascript)::before{content:'JavaScript';background:#F7DF1E;color:#111;}`,
          `.slidev-code-wrapper:has(.language-haskell)::before{content:'Haskell';background:#5E5086;}`,
          `.slidev-code-wrapper:has(.language-c)::before{content:'C';background:#00599C;}`,
          `.slidev-code-wrapper:has(.language-funnylambda)::before,.slidev-code-wrapper:has(.language-fl)::before{content:'FunnyLambda';}`,
        ].join(''),
    },
  ],
})
