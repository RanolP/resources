# Resources

Slidev deck, vibe-coded. Deployed to GitHub Pages on every push to `main`.

## Dev

Tooling pinned via [mise](https://mise.jdx.dev) (see [mise.toml](mise.toml)).

```sh
mise install          # one-time: installs pinned Node + pnpm
pnpm install
pnpm dev
```

Opens at http://localhost:3030.

## Build

```sh
pnpm build      # static SPA in ./dist
pnpm export     # PDF export (needs Playwright: pnpm dlx playwright install chromium)
```

## Deploy

1. Push to a GitHub repo with `main` as default branch.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. First push to `main` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml).
4. Site lands at `https://<user>.github.io/<repo>/`.

The workflow derives `--base` from the repo name automatically, so renaming the repo or forking Just Works.
