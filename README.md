# Resources

A multi-deck Slidev host, vibe-coded. Each talk lives under `decks/<slug>.md` and
is served at `https://<user>.github.io/<repo>/<slug>/`; the site root is a list of
the talks. Deployed to GitHub Pages on every push to `main`.

Adding a talk = drop a markdown in `decks/` (its filename is the slug). The landing
card is generated from the deck's first-slide title (`#`) and subtitle (`##`), so
there's nothing else to edit. No workflow edits needed.

## Dev

Tooling pinned via [mise](https://mise.jdx.dev) (see [mise.toml](mise.toml)).

```sh
mise install          # one-time: installs pinned Node + pnpm
pnpm install
pnpm dev               # always prompts you to pick a deck
pnpm dev adt4fun       # …or run a deck by slug directly
```

Opens at http://localhost:3030.

## Build

```sh
pnpm build      # builds every decks/*.md into ./dist/<slug>/ + the talk-list root
pnpm export     # PDF export of decks/adt4fun.md (needs Playwright: pnpm dlx playwright install chromium)
```

`pnpm build` ([scripts/build-decks.mjs](scripts/build-decks.mjs)) builds each deck
separately with its own `--base`/`--out`, renders the landing from
[site/index.html](site/index.html) (filling its `<!--TALKS-->` marker with a card
per deck, title/subtitle pulled from each deck's first slide), and writes a root
`404.html` redirector (GitHub Pages serves one root 404 for all paths, so a
mid-deck reload bounces back to that deck's index).
`BASE_PREFIX` sets the hosting root (CI uses `/<repo>`; empty locally).

## Deploy

1. Push to a GitHub repo with `main` as default branch.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. First push to `main` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml).
4. Site lands at `https://<user>.github.io/<repo>/` (talk list); each deck at `…/<repo>/<slug>/`.

The workflow derives `BASE_PREFIX` from the repo name automatically, so renaming the repo or forking Just Works.
