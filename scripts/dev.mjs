#!/usr/bin/env node
// Pick a deck to run with `slidev … --open`.
//
//   pnpm dev            → list decks/*.md and prompt for one
//   pnpm dev <slug>     → run that deck directly
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { basename } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const DECKS_DIR = 'decks'
const slugs = readdirSync(DECKS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => basename(f, '.md'))
  .sort()

if (slugs.length === 0) {
  console.error(`No decks found in ${DECKS_DIR}/`)
  process.exit(1)
}

function run(slug) {
  const r = spawnSync('slidev', [`${DECKS_DIR}/${slug}.md`, '--open'], { stdio: 'inherit' })
  process.exit(r.status ?? 0)
}

const requested = process.argv[2]
if (requested) {
  if (!slugs.includes(requested)) {
    console.error(`Unknown deck "${requested}". Available: ${slugs.join(', ')}`)
    process.exit(1)
  }
  run(requested)
} else {
  const rl = createInterface({ input: stdin, output: stdout })
  console.log('Pick a deck:')
  slugs.forEach((s, i) => console.log(`  ${i + 1}. ${s}`))
  const answer = (await rl.question(`> [1-${slugs.length}] `)).trim()
  rl.close()
  const idx = Number(answer) - 1
  const slug = slugs[idx] ?? slugs.find((s) => s === answer)
  if (!slug) {
    console.error(`Invalid choice: ${answer}`)
    process.exit(1)
  }
  run(slug)
}
