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

## Mirror of `@sudobility/music_ui`

This library is meant to be the web library drawn again: the same exported
names taking the same props, the same parts in the same order, the same i18n
keys, the same calls into the music libs with the same arguments. RN idioms are
not divergences (sheets for dialogs, `Alert`, Skia for DOM, safe areas, a "more"
sheet on a compact bar); anything else that differs is a bug or is written down.

- **`src/web-surface-parity.test.ts` holds the public surface to the web's.** It
  reads `../music_ui/src` (skips if the sibling is absent) and requires every
  web export to be exported here under the same name or filed, with a reason,
  under `WEB_ONLY` (CSS/DOM/browser by nature), `DIFFERENT_SHAPE` (in this
  library, split or named otherwise) or `NOT_YET` (still in an app, or missing
  natively — the to-do list). A new web export fails it until classified.
- **Web names over native components.** Where the native component is the same
  thing under another name it is exported under both: `ConfirmDialog`
  (`ConfirmSheet` with the web's defaults — destructive unless told, always a
  confirm), `ChoiceDialog`/`DialogChoice`, `GoToBarDialog`, `InsertBarsDialog`,
  `ReplaceMusicDialog` (`region` required), `GenerationStatusStrip`
  (`GenerationOverlay` less `visible`), `ExportScopeDialog`, `PendingButton`,
  the forty-two named glyphs (`SharpIcon`, … — `icons/notation-icons.tsx`, held
  to music_types' `NOTATION_ICON_NAMES`), `usePendingKeys`, the `usePlayback*`
  hooks, `TransportController`, and `theme/color-scheme`. Prefer the web name in
  new code; the native names stay because the apps use them.
- **Props added for parity keep the old ones as deprecated aliases** —
  `ProjectOriginPanel` `hookContext` (was `context`), `EditorToolbar`
  `inspectorOpen` (was `inspectorVisible`), `ReplaceMusicSheet` `region` +
  `trackLabel` (was `canSubmit`), `TransportBar` `controller` (beside
  `transport`). `usePendingAction()` returns the web's `[pending, run]` tuple
  that also carries `pending` / `pendingKey` / `run` by name.
- **Wording: ask for the web's key, through `src/i18n/host-key.ts`.** A key the
  host's locale lacks renders as the key, so a native-only key cannot simply be
  swapped for the web's. `hostKey(i18n, webKey, nativeKey)` asks for the web key
  once the host carries it and the native one until then; `hostHasKey` gates a
  line the web shows and native never had. Adding the string to the app's
  locales is the whole migration. Do not add new native-only keys for a label
  the web already has a key for.
- **Generation requests name their backend.** `GenerateTrackSheet` tags its
  request with `withGenerationVariant` (as the web caller does) and both it and
  `ReplaceMusicSheet` take `devicePrefs` to offer the web's Model picker
  (`features/generation/useGenerationModel.ts`); without it they send
  `DEFAULT_GENERATION_VARIANT`.
- **Library tests assert by key and run against an empty bundle**;
  `src/test/host-strings.ts` (`withHostStrings`) gives the host a string for a
  test of the other branch, and `src/test/labels.ts` reads accessible names in
  drawn order for "same controls, same order" tests.

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

`src/icons` (NotationIcon + the named glyphs, InstrumentIcon, BrandLogos,
notation-ink) · `src/theme` (theme-mode context; `color-scheme`, the web's
resolver over `Appearance`) · `src/components` (`controls`, `dialogs`, `layout`)
· `src/hooks` (`usePlaybackPosition` / `usePlaybackReadout` /
`usePlayingPitches`; `useSounding` underneath them and `useSoundingTrackIds`) ·
`src/i18n` (`host-key`) · `src/features` — `score` (ScoreView, ScrollingScore,
PlaybackCursor + playhead seam), `score-editor` (EditorToolbar + action sheets),
`transport`, `inspector`, `piano-keyboard`, `spatial`, `print`, `generation`,
`tracks` (MixerSliders), `layout` (compact-bars, inspector-default,
useContainerSize helpers) · `src/navigation` (the `useNavigator` contract) ·
`src/test` (render, host-strings, labels). Platform variants use RN `.macos.tsx`
/ `.windows.tsx` suffixes. Deep native score-canvas story lives in
`music_drawing`'s and `music_synth_rn`'s CLAUDE.md, not here.

## Related

`music_types` · `music_editing` · `music_drawing` · `music_player` · `music_lib`
· `components-rn` · `music_ui` (web) · `music_app_rn` · `music_player_app_rn` ·
`music_app`
