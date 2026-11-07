/**
 * The resolved light/dark mode, as a library-owned context.
 *
 * Functional UI (notably `useNotationInk` and `ThemeVarsProvider`) needs to know
 * whether the app is in light or dark mode so it can resolve `@sudobility/design`
 * tokens to the literal colours `react-native-svg` requires. In the apps this
 * came from their own `ThemeContext` (`useTheme().resolved`); the library cannot
 * import an app context, so it owns this minimal one instead. The host provides
 * the value — it still owns *how* the mode is decided ("follow system", the
 * device pref) — by bridging its own theme state into `ThemeModeProvider`.
 */
import { createContext, useContext, type ReactNode } from 'react';

export type ResolvedTheme = 'light' | 'dark';

const ThemeModeContext = createContext<ResolvedTheme>('light');

export function ThemeModeProvider({
  resolved,
  children,
}: {
  resolved: ResolvedTheme;
  children: ReactNode;
}) {
  return (
    <ThemeModeContext.Provider value={resolved}>
      {children}
    </ThemeModeContext.Provider>
  );
}

/** The resolved mode. Defaults to `'light'` when no provider is mounted. */
export function useThemeMode(): ResolvedTheme {
  return useContext(ThemeModeContext);
}
