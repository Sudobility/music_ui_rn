# music_ui_rn (@sudobility/music_ui_rn)

> **Git policy — never auto-commit or auto-push.** Leave work in the working
> tree. Commit/push only when the user explicitly asks in that turn.

Shared functional UI for ScoreSmith's React Native apps (`music_app_rn`,
`music_player_app_rn`, the Windows branch). Extracted so the player stops
drifting behind the editor and the Windows fork stops git-merging every UI
change — consumers take a version bump instead. The web mirror is
`@sudobility/music_ui`, extracted from `music_app`.

## Boundaries

- **UI only, and navigation is not UI.** Everything that reasons about the
  *drawn score and its editing surface* lives here (toolbar, transport,
  inspector, score view, keyboard, spatial, print, generation, mixer/track
  sliders, icons, controls, the editor layout helpers). Everything about
  *moving between screens* — React Navigation itself, split-view/master-detail,
  tab bar, deep linking, projects window — stays in the app shells. Route params
  arrive as props; screen components never import React Navigation or call
  `useNavigation`.
- **Navigation CONTRACT is owned here; the navigator is not.**
  `src/navigation/navigator.ts` exports `NavigatorProvider` / `useNavigator`
  (built with `createNavigatorContext` from `@sudobility/routing/react`, typed
  over `music_lib`'s `MusicRoutes`). Shared components navigate by route name —
  `useNavigator().go('projects')` — without importing a navigation library. The
  **app** supplies the concrete `Navigator` (its React Navigation adapter) and
  mounts `NavigatorProvider` at its root. (There is NO injected per-action
  interface like `openCredits()`/`goToTab()`; that was the earlier design.)
- **No dependency on apps.** Where the UI needs app-provided native code it
  defines an interface and the app injects the implementation — e.g. the macOS
  playhead: `src/features/score/playhead.ts` defines `PlayheadViewProps` + a
  `usePlayheadView()` context; the app wires its own native playhead component
  in via `PlayheadViewProvider`. Off the Mac the context is empty and the shared
  `PlaybackCursor` draws the caret in JS.
- **No app context.** The per-document store (`createDocumentStore` from
  `music_lib`) is passed in as a prop; read it with `useStore(store, selector)`.
  No `DocumentsProvider`, `useServerContext` or app `AuthContext`.
- **No strings.** Locales stay in the host apps (a library holds no idea of
  English). Components call `useTranslation()` against the host's `i18next`; the
  package ships no `resources`.

## Theme

Parity with components-rn and the web comes from `@sudobility/design`'s
`swissTheme` + NativeWind preset (a peer). The extraction's one break: functional
UI used to read the app's `ThemeContext`; here that is a **library-owned
theme-mode context** (`src/theme/theme-mode.tsx`): `ThemeModeProvider` plus
`useThemeMode(): 'light' | 'dark'` (the host owns "follow system" and provides
the resolved value). The glyph-ink hook `useNotationInk` lives in `src/icons`
(`notation-ink.ts`). Never write a hex for a glyph — resolve through
`useNotationInk`.

## Consuming it

- **Packaging mirrors `components-rn`:** ships `src/` and `dist/`; the
  `react-native` field points at `src/index.ts` so Metro reads source, while
  `main`/`types` point at `dist`.
- **Tailwind content glob (silent-failure trap):** the app must add
  `./node_modules/@sudobility/music_ui_rn/{src,dist}/**/*.{js,jsx,ts,tsx}` to its
  `tailwind.config.js` `content`, or the library's `className` utilities are
  never generated and components render unstyled.
- **Composition root (app-side):** run `configureTheme(swissTheme,{native:true})`
  and the `cssInterop(Svg,…)` registration before any library component renders;
  own the generated `global.css` + `pre*` script.
- **Everything is a peer, nothing bundled.** Wide ranges
  (`react-native: >=0.72`) keep the door open for the Windows branch.

## Migration mechanics (keeping it green)

- **Library src uses RELATIVE imports, never `@/`.** `@/` means the *consumer's*
  src when the app reads this package's source, so `@/icons` resolves to the
  app's `src/icons` and breaks. Typecheck hides it (it reads `dist/.d.ts`).
  Rewrite any `from '@sudobility/music_ui_rn'` barrel self-import to a relative
  intra-library path.
- `src/nativewind-env.d.ts` (`/// <reference types="nativewind/types" />`) must
  exist or every `className` is a type error.
- **jest `transformIgnorePatterns`** mirrors music_app_rn's allow-list (names
  every ESM dep, handles bun's `.bun/` layout) or `music_types` etc. fail to
  parse.
- **Tests:** bare-`render`/platform-variant/pure-logic tests live here (jest);
  tests using the app's `renderWithApp` stay in the app. Source-scanning tests
  stay where their scanned files are, reading moved files from
  `node_modules/@sudobility/music_ui_rn/src/...`.

## Dev workflow (pre-publish)

Consume from the apps via an **rsync overlay**, not a bun `file:` symlink — a
symlink exposes this repo's `node_modules` and gives the consumer a second
`react-native` (TurboModule invariant crash). After `bun run build`:
`rm -rf <app>/node_modules/@sudobility/music_ui_rn && rsync -a --exclude
node_modules --exclude .git ./ <app>/node_modules/@sudobility/music_ui_rn/`.
Re-overlay after any `bun install` in the app.

## Commands

- `bun run build` — `tsc` (declarations) + `vite build` (esm/cjs) + fix-esm-imports
- `bun run verify` — format, typecheck, lint, jest, build (pre-push)
- `bun run test:unit` — jest (component rendering; RNTL)

## Structure

`src/icons` (NotationIcon, InstrumentIcon, BrandLogos, notation-ink) ·
`src/theme` (theme-mode context) · `src/components` (`controls`, `layout`) ·
`src/features` — `score` (ScoreView, ScrollingScore, PlaybackCursor + playhead
seam), `score-editor` (EditorToolbar + action sheets), `transport`, `inspector`,
`piano-keyboard`, `spatial`, `print`, `generation`, `tracks` (MixerSliders),
`layout` (compact-bars, inspector-default, useContainerSize helpers) ·
`src/navigation` (the `useNavigator` contract). Platform variants use RN
`.macos.tsx` / `.windows.tsx` suffixes. Deep native score-canvas story lives in
`music_drawing`'s and `music_synth_rn`'s CLAUDE.md, not here.

## Related

`music_types` · `music_editing` · `music_drawing` · `music_player` · `music_lib`
· `components-rn` · `music_ui` (web) · `music_app_rn` · `music_player_app_rn` ·
`music_app`
