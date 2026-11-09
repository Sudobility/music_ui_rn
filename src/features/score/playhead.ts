/**
 * The macOS playhead view's **interface**, and the seam the app fills.
 *
 * The red playback caret on the Mac is drawn by a native `NSView` that replays
 * the cursor path with the display link. Native code lives in the *app*, never
 * in a UI library, so this module does not import it. Instead it declares the
 * contract — `PlayheadViewProps`, the props the native view must accept — and
 * takes the concrete component from a context the app provides.
 * `PlaybackCursor.macos.tsx` reads it through `usePlayheadView()`; off the Mac
 * the context is empty and the shared `PlaybackCursor` draws the caret in JS.
 *
 * The app wires its own `native/playhead` component in with
 * `PlayheadViewProvider` (see each app's editor composition). This is the same
 * "library defines the interface, the app owns the implementation" seam the
 * rest of the family uses for app-only pieces.
 */
import { createContext, useContext } from 'react';
import type { ComponentType } from 'react';
import type { ViewProps } from 'react-native';

export type PlayheadViewProps = ViewProps & {
  /** Ticks of the knots, ascending. */
  knotTicks: readonly number[];
  /** The x (in this view's coordinates) of each knot: the centre of the line. */
  knotXs: readonly number[];
  /** Top of the line and its height, in this view's coordinates. */
  lineTop: number;
  lineHeight: number;
  lineWidth: number;
  lineColor: string;
  /** The gutter's right edge in view px; the line hides left of it. */
  clipLeft: number;
  /** Content px scrolled horizontally, for the clip. */
  scrollLeft: number;
  /** Where the playhead was at `anchorTime`. */
  anchorTick: number;
  /** `performance.now()` when `anchorTick` was true, in milliseconds. */
  anchorTime: number;
  /** `performance.now()` when these props were rendered, to measure any clock offset. */
  sentAt: number;
  /** Ticks per second the line advances at; 0 holds it still. */
  rate: number;
  /** Bumped by every plan, so the same anchor twice is still a new plan. */
  planId: number;
};

/**
 * The native playhead component the app supplies, or `null` where there is no
 * native playhead (anywhere but the Mac, and in tests).
 */
export type PlayheadComponent = ComponentType<PlayheadViewProps> | null;

const PlayheadViewContext = createContext<PlayheadComponent>(null);

/**
 * The app wraps its editor with this, supplying the component from its own
 * `native/playhead` module. Absent → the shared JS cursor is used.
 */
export const PlayheadViewProvider = PlayheadViewContext.Provider;

/** The macOS cursor reads the app-provided native view here. */
export function usePlayheadView(): PlayheadComponent {
  return useContext(PlayheadViewContext);
}
