#!/usr/bin/env node
// Build every deck under decks/*.md into dist/<slug>/, then assemble the site root.
//
// Each deck is built SEPARATELY so it gets its own --base/--out: Slidev's built-in
// multi-entry build passes one shared --base to all decks, which can't produce
// per-subpath hosting. BASE_PREFIX is the hosting root (CI sets "/<repo>"; empty locally).
import { execFileSync } from 'node:child_process'
import { readdirSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join, basename, resolve } from 'node:path'

const BASE_PREFIX = (process.env.BASE_PREFIX ?? '').replace(/\/$/, '')
const DECKS_DIR = 'decks'
// Absolute: Slidev sets its project root to dirname(entry) (= decks/) and resolves
// a relative --out against THAT, so a bare "dist" would land in decks/dist.
const DIST_DIR = resolve('dist')

const slugs = readdirSync(DECKS_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => basename(f, '.md'))

if (slugs.length === 0) {
  console.error(`No decks found in ${DECKS_DIR}/`)
  process.exit(1)
}

for (const slug of slugs) {
  const entry = join(DECKS_DIR, `${slug}.md`)
  const base = `${BASE_PREFIX}/${slug}/`
  const out = join(DIST_DIR, slug)
  console.log(`\n→ building ${entry}  (base=${base}, out=${out})`)
  execFileSync('slidev', ['build', entry, '--base', base, '--out', out], {
    stdio: 'inherit',
  })
}

// Landing page at the site root: the talk list.
mkdirSync(DIST_DIR, { recursive: true })
copyFileSync(join('site', 'index.html'), join(DIST_DIR, 'index.html'))

// Root 404 redirector. GitHub Pages serves a single root 404.html for every
// not-found path, so per-deck 404s are ignored. This reads the first path
// segment after BASE_PREFIX; if it names a known deck, it bounces to that
// deck's index (returns to slide 1 — acceptable for a talk), else the landing.
const knownSlugs = JSON.stringify(slugs)
const html404 = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Redirecting…</title>
<script>
  (function () {
    var base = ${JSON.stringify(BASE_PREFIX)};
    var path = location.pathname;
    if (base && path.indexOf(base) === 0) path = path.slice(base.length);
    var slug = path.replace(/^\\/+/, '').split('/')[0];
    var known = ${knownSlugs};
    var target = known.indexOf(slug) !== -1 ? base + '/' + slug + '/' : base + '/';
    location.replace(target.replace(/\\/{2,}/g, '/'));
  })();
</script>
</head>
<body></body>
</html>
`
writeFileSync(join(DIST_DIR, '404.html'), html404)

console.log(`\n✓ built ${slugs.length} deck(s): ${slugs.join(', ')}`)
console.log(`  site root + 404 redirector assembled in ${DIST_DIR}/`)
