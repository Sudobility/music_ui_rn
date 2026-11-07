# @sudobility/music_ui_rn

Shared functional UI for ScoreSmith / Moosiac's React Native apps
(`music_app_rn`, `music_player_app_rn`, and the Windows branch). It holds the
editor shell, editing/transport bars, inspector, score view, piano keyboard,
spatial stage, print, generation, snapshots, mixer, notation icons and the
shared controls — the screens the apps mirror from the web app.

**Navigation stays in the app shells.** React Navigation, the split-view /
master-detail containers, the tab bar and deep linking are app concerns; the
library's screen-level components take an injected navigation interface and
route params as props. Likewise the per-document store is passed in — the
library imports no app context.

Cross-platform (iOS, iPad, Android, macOS, Windows). Visual parity with the web
app comes from the shared `@sudobility/design` Swiss theme; strings come from
the host app's i18next (the library ships no locales).

Consumed as source: the `react-native` field points at `src/`, so a consuming
app must list `./node_modules/@sudobility/music_ui_rn/{src,dist}/**/*.{js,jsx,ts,tsx}`
in its Tailwind `content`, or the utility classes won't be generated.

See `CLAUDE.md` for the extraction plan and status.
