# @sudobility/music_ui_rn

Shared functional UI for ScoreSmith / Moosiac's React Native apps
(`music_app_rn`, `music_player_app_rn`, and the Windows branch). It holds the
editor shell pieces, editing/transport bars, inspector, score view, piano
keyboard, spatial stage, print, generation, mixer (track sliders), notation
icons and the shared controls — the screens the apps mirror from the web app.

Cross-platform (iOS, iPad, Android, macOS, Windows). Visual parity with the web
app comes from the shared `@sudobility/design` Swiss theme; strings come from
the host app's i18next (the library ships no locales).

## What lives here vs. the app

The library owns everything that reasons about the **drawn score and its
editing surface**. The apps own everything about the **device and the screen
stack**:

- **Navigation contract lives here; the navigator lives in the app.**
  `src/navigation/navigator.ts` exports `NavigatorProvider` / `useNavigator`
  (from `@sudobility/routing`, typed over `music_lib`'s `MusicRoutes`), so shared
  components navigate by route name — `useNavigator().go('projects')` — without
  importing a navigation library. The **app** supplies the concrete `Navigator`
  (its React Navigation adapter) and mounts `NavigatorProvider` at its root.
  React Navigation itself, the split-view / master-detail containers, the tab
  bar and deep linking stay app-side.
- **No app context.** The per-document store (`createDocumentStore` from
  `music_lib`) is passed in as a prop, not read from an app provider.
- **No strings.** Components call `useTranslation()` against the host's
  i18next; the package ships no `resources`.

## Requirements

- Node >= 18, [Bun](https://bun.sh) (the repo is Bun-first; `bun.lock` is
  committed and scripts call `bun run`).
- A React Native toolchain only matters in the **consuming** apps — this package
  builds and tests as a plain TS library.

## Install (GitHub Packages)

The `@sudobility` scope is published to **GitHub Packages**, not the public npm
registry. `.npmrc` already points the scope at `https://npm.pkg.github.com`; to
install you need a GitHub token with `read:packages` exposed as
`GH_PACKAGES_READ_TOKEN` (or wire it into your user `~/.npmrc`), e.g.:

```
//npm.pkg.github.com/:_authToken=${GH_PACKAGES_READ_TOKEN}
```

Then, from this repo:

```sh
bun install
```

## Build / test / run

This is a library — there is no app to "run"; you build it and the consuming
apps load its source.

```sh
bun run build        # tsc (d.ts) + vite build (esm/cjs) + fix-esm-imports
bun run typecheck    # tsc --noEmit
bun run lint         # eslint (zero warnings allowed)
bun run test:unit    # jest (component render tests via RNTL)
bun run verify       # format:check + typecheck + lint + test + build (run before pushing)
bun run dev          # vite build --watch
```

## Consuming it

- **Consumed as source.** The `react-native` field points at `src/index.ts`, so
  Metro reads source while `main`/`types` point at `dist`. A consuming app must
  add
  `./node_modules/@sudobility/music_ui_rn/{src,dist}/**/*.{js,jsx,ts,tsx}` to its
  `tailwind.config.js` `content`, or the library's `className` utilities are
  never generated and components render **unstyled** (silent failure).
- **Everything is a peer, nothing is bundled.** Wide peer ranges
  (`react-native: >=0.72`) keep the door open for the Windows branch.

See `CLAUDE.md` for boundaries, the theme seam, the pre-publish rsync-overlay
dev workflow, and migration gotchas.
