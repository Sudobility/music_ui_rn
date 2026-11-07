# music_ui_rn (@sudobility/music_ui_rn)

Shared functional UI for ScoreSmith's React Native apps. It exists because
`music_app_rn` and `music_player_app_rn` were ~76% byte-identical and the player
was drifting behind the editor, while a Windows feature branch forked the whole
app and had to git-merge every UI change. Lifting the functional screens here
turns that into a version bump, and keeps the native (RN) and web UIs in parity
through the shared `@sudobility/design` theme — the web mirror is
`@sudobility/music_ui`, extracted from `music_app`.

## The rule that shapes everything

**This package is UI only, and navigation is not UI.** Everything that reasons
about the *drawn score and its editing surface* lives here (toolbar, transport,
inspector, score view, keyboard, spatial, print, generation, snapshots, mixer,
icons, controls, the editor `AppLayout`). Everything that reasons about *moving
between screens* stays in the app shells: React Navigation, the
split-view/master-detail container, the tab bar, deep linking, the projects
window. Screen-level components here take an injected navigation interface
(callbacks like `openCredits()`, `openProject(id)`, `goToTab(tab)`, `goBack()`)
and route params as props; they never import React Navigation or call
`useNavigation`.

Two more boundaries:

- **No app context.** The per-document store (`createDocumentStore` from
  `music_lib`) is passed in as a prop; components read it with
  `useStore(store, selector)`. The library does not import `DocumentsProvider`,
  `useServerContext`, or an app `AuthContext`.
- **No strings.** Locales stay in the host apps (the family rule: a library must
  not hold its own idea of English). Components call `useTranslation()` against
  the host's `i18next`; the package ships no `resources`.

## Theme

Visual parity with components-rn and the web comes from `@sudobility/design`'s
`swissTheme` + NativeWind preset. The one coupling the extraction had to break:
functional UI used to read the app's `ThemeContext` via `useTheme()`/
`useNotationInk()`. Here that becomes a **library-owned theme-mode context**
exposing `resolved: 'light' | 'dark'`; the host provides the value (it still
owns "follow system"). `useNotationInk` and `ThemeVarsProvider` live here and
read the library context. `swissTheme` arrives via the `@sudobility/design`
peer. Never write a hex for a glyph — resolve it through `useNotationInk`.

## Consuming it

- **Packaging mirrors `@sudobility/components-rn`:** ships `src/` and `dist/`;
  the `react-native` field points at `src/index.ts` so Metro reads source, while
  `main`/`types` point at `dist`. Cross-repo dev syncs `src/` via the family's
  rsync overlay.
- **Tailwind content glob (silent-failure trap):** a consuming app must add
  `./node_modules/@sudobility/music_ui_rn/{src,dist}/**/*.{js,jsx,ts,tsx}` to its
  `tailwind.config.js` `content`, exactly as `components-rn` is listed, or the
  library's `className` utilities are never generated and components render
  unstyled.
- **Composition root:** the app must run `configureTheme(swissTheme,{native:true})`
  and the `cssInterop(Svg,…)` registration before any library component renders,
  and own the generated `global.css` + `pre*` script. These stay app-side.
- **Everything is a peer, nothing bundled** — see `package.json`. Wide ranges
  (`react-native: >=0.72`) keep the door open for the Windows branch's RN
  version.

## Commands

- `bun run build` — `tsc` (declarations) + `vite build` (esm/cjs) + fix-esm-imports
- `bun run verify` — format, typecheck, lint, jest, build (pre-push)
- `bun run test:unit` — jest (component rendering; RNTL)

## Extraction status

Populated incrementally per the plan (`~/.claude/plans/glimmering-imagining-pizza.md`).
Done, each verified green (app typecheck + vitest + full jest):
1. **icons + notation-ink + theme-mode context** (`src/icons/*`, `src/theme/*`).
2. **controls + IconButton** (`src/components/controls/*`, `src/components/layout/IconButton.tsx`).

Next, in order: the rest of `components/layout` presentational pieces →
the **document/services/context seam** (the architectural linchpin: the library
should own `MusicDocument`/`DocumentServices` types + the `DocumentsProvider`
hooks; the app provides implementations) → feature components → `AppLayout` +
screen bodies (with injected navigation).

## Migration mechanics (the rules that keep it green)

- **Library src uses RELATIVE imports, never `@/`.** The `@/` alias means the
  *consumer's* src when the app reads this package's source (via the
  `react-native` field), so `@/icons` inside the library resolves to the app's
  `src/icons` under the app's Metro/jest and breaks. Typecheck hides it (it reads
  `dist/.d.ts`, which has resolved paths). components-rn follows the same rule.
- **Barrel self-imports:** when a file moves in, rewrite any
  `from '@sudobility/music_ui_rn'` (a leftover from an earlier app-side repoint)
  to the relative intra-library path.
- **NativeWind types:** `src/nativewind-env.d.ts` (`/// <reference types="nativewind/types" />`)
  must exist or every `className` is a type error.
- **jest `transformIgnorePatterns`** mirrors music_app_rn's allow-list (names
  every ESM dep, handles bun's `.bun/` layout) or `@sudobility/music_types` etc.
  fail to parse.
- **Tests:** bare-`render`/platform-variant/pure-logic tests move here (jest).
  Tests using the app's `renderWithApp` (real i18n + a document) stay in the app,
  repointed to the barrel. Source-scanning tests (read a component's file text)
  stay where their other scanned files are, reading the moved file from
  `node_modules/@sudobility/music_ui_rn/src/...` (valid via overlay and the
  published package, which ships `src/`).
- **App guardrails** (`__architecture.test.ts`, `design-system.test.ts`) list
  moved files in allow-lists; remove each stale entry as its file leaves (those
  rules belong to the library's own future guardrail).

## Dev workflow (pre-publish)

Consume from the apps via an **rsync overlay**, not a bun `file:` symlink — a
symlink exposes this repo's own `node_modules` and gives the consumer a second
`react-native` (TurboModule invariant crash). After `bun run build` here:
`rm -rf <app>/node_modules/@sudobility/music_ui_rn && rsync -a --exclude
node_modules --exclude .git --exclude .github ./ <app>/node_modules/@sudobility/music_ui_rn/`.
Re-overlay after any `bun install` in the app. Once published, the apps use a
`^0.0.x` registry dep and the overlay sits on top.

## Related projects

`music_types` · `music_editing` · `music_drawing` · `music_player` · `music_lib`
· `components-rn` (`mail_box_components_rn`) · `music_ui` (web) · `music_app_rn` ·
`music_player_app_rn` · `music_app`
