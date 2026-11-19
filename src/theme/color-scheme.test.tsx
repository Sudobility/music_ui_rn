/**
 * The colour scheme, resolved the way the web library resolves it.
 *
 * The same three questions `music_app`'s `theme.test.ts` asks of the web's
 * `color-scheme.ts`, asked of `Appearance` instead of a media query: what the
 * OS says, what a preference resolves to, and whether a surface drawn from the
 * answer follows the OS when it flips.
 */
import { jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import type { ColorSchemeName } from 'react-native';
import {
  getSystemColorScheme,
  resolveColorScheme,
  useResolvedColorScheme,
} from './color-scheme';

/** What `Appearance.getColorScheme()` can answer: a scheme, or nothing yet. */
type SystemScheme = ColorSchemeName | null;

/** An OS colour scheme a test can flip, as the device would at sunset. */
function stubSystemScheme(initial: SystemScheme) {
  let scheme = initial;
  const listeners = new Set<() => void>();
  jest.spyOn(Appearance, 'getColorScheme').mockImplementation(() => scheme);
  jest.spyOn(Appearance, 'addChangeListener').mockImplementation(listener => {
    const notify = () => listener({ colorScheme: scheme ?? 'unspecified' });
    listeners.add(notify);
    return { remove: () => listeners.delete(notify) } as ReturnType<
      typeof Appearance.addChangeListener
    >;
  });
  return {
    flip(next: SystemScheme) {
      scheme = next;
      listeners.forEach(listener => listener());
    },
    listening: () => listeners.size,
  };
}

afterEach(() => jest.restoreAllMocks());

describe('getSystemColorScheme / resolveColorScheme', () => {
  it('reads light until the OS says dark', () => {
    stubSystemScheme(null);
    expect(getSystemColorScheme()).toBe('light');
    // "No preference", which newer React Native reports by name.
    stubSystemScheme('unspecified');
    expect(getSystemColorScheme()).toBe('light');
    stubSystemScheme('dark');
    expect(getSystemColorScheme()).toBe('dark');
  });

  it('passes light/dark through unchanged', () => {
    stubSystemScheme('dark');
    expect(resolveColorScheme('light')).toBe('light');
    stubSystemScheme('light');
    expect(resolveColorScheme('dark')).toBe('dark');
  });

  it('defers to the OS for system', () => {
    stubSystemScheme('dark');
    expect(resolveColorScheme('system')).toBe('dark');
    stubSystemScheme('light');
    expect(resolveColorScheme('system')).toBe('light');
  });
});

describe('useResolvedColorScheme', () => {
  it('follows the OS live in system mode', () => {
    const system = stubSystemScheme('light');
    const { result } = renderHook(() => useResolvedColorScheme('system'));
    expect(result.current).toBe('light');

    act(() => system.flip('dark'));

    expect(result.current).toBe('dark');
  });

  it('ignores the OS when the reader chose a scheme', () => {
    const system = stubSystemScheme('light');
    const { result } = renderHook(() => useResolvedColorScheme('dark'));
    expect(system.listening()).toBe(0);
    act(() => system.flip('light'));
    expect(result.current).toBe('dark');
  });

  it('stops listening when it unmounts', () => {
    const system = stubSystemScheme('light');
    const { unmount } = renderHook(() => useResolvedColorScheme('system'));
    expect(system.listening()).toBe(1);
    unmount();
    expect(system.listening()).toBe(0);
  });
});
