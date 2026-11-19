/**
 * The colour scheme the UI is drawn in, and how the device is asked for it —
 * the native twin of `@sudobility/music_ui`'s `theme/color-scheme.ts`.
 *
 * The *rule* — `system` follows the device, `light`/`dark` override it — is
 * music_lib's `resolveThemeMode`, shared with the web. What lives here is the
 * part only the platform can answer: on the web a `prefers-color-scheme` media
 * query, here React Native's `Appearance`. Same names and signatures on both
 * sides, so a caller resolves a `themeMode` the same way in either app.
 *
 * This does not replace `theme-mode.tsx`. The host still owns the preference
 * (a device pref) and still provides the resolved value to the library through
 * `ThemeModeProvider`; `useResolvedColorScheme(mode)` is simply how a host
 * computes that value without restating the rule.
 *
 * There is no `prefersReducedMotion` here. The web reads it for one thing —
 * whether the DOM score surface scrolls `smooth` or `auto` — and the native
 * score never animates a scroll (`scrollTo({ animated: false })`), so there is
 * nothing for it to decide; React Native also only answers that question
 * asynchronously (`AccessibilityInfo.isReduceMotionEnabled`).
 */
import { useCallback, useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { resolveThemeMode } from '@sudobility/music_lib';
import type { ThemeMode } from '@sudobility/music_types';

/** User-facing colour scheme preference: the device pref's `themeMode`. */
export type ColorSchemeMode = ThemeMode;

/** A concrete (non-`system`) colour scheme. The same two values as `ResolvedTheme`. */
export type ResolvedColorScheme = Exclude<ThemeMode, 'system'>;

/**
 * Reads the OS colour-scheme preference. An unknown scheme (`null` before the
 * OS has reported, or where there is no such setting) reads as light: guessing
 * dark would flash the wrong theme on every cold start.
 */
export function getSystemColorScheme(): ResolvedColorScheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

/**
 * Resolves a user preference (which may defer to the system) into a concrete
 * `light`/`dark` scheme, **once**. Anything rendered from the answer should use
 * `useResolvedColorScheme` instead, or it will not follow the OS.
 */
export function resolveColorScheme(mode: ColorSchemeMode): ResolvedColorScheme {
  return resolveThemeMode(mode, getSystemColorScheme() === 'dark');
}

/**
 * The scheme to draw in, re-rendering when the OS flips while in `system` mode.
 *
 * `useSyncExternalStore` because `Appearance` *is* an external store, and
 * subscribing through it cannot tear between two readers mid-render.
 */
export function useResolvedColorScheme(
  mode: ColorSchemeMode
): ResolvedColorScheme {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (mode !== 'system') return () => undefined;
      const subscription = Appearance.addChangeListener(onChange);
      return () => subscription.remove();
    },
    [mode]
  );
  const get = (): ResolvedColorScheme => resolveColorScheme(mode);
  return useSyncExternalStore(subscribe, get, get);
}
