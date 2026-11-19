/**
 * Text derived from the playhead, re-rendering only when the text changes.
 *
 * Reports arrive about thirty times a second and a readout shows far less: a
 * bar and beat changes a few times a second, a timecode ten. Each report is
 * formatted and compared with what is on screen, and only a difference renders
 * — the readouts used to hold the tick in state and re-render on every report,
 * which on a dense score was the transport bar re-rendering at the engine's
 * rate. `format` is read at render, so a new score or tempo map applies at once.
 *
 * It lived in `useTransport.ts` until that binder was replaced by
 * music_lib's `bindPlayer`; the smoothness rule is this app's, so it stayed.
 */
import { useEffect, useReducer, useRef } from 'react';
import { getMusicPlayerIfInitialized } from '@sudobility/music_player/core';

/**
 * Anything that reports the playhead: the player, its `PlaybackBus`, or a
 * test's fake.
 *
 * `positionTick` is where the playhead is *now*, for a subscriber that joins
 * between reports. A report only arrives when the playhead moves, so without
 * it a readout mounted while paused at bar 12 — a compact/wide switch remounts
 * all three — said bar 1 until something played. The web's hooks read the
 * bus's snapshot for the same reason ("so a subscriber joining mid-playback is
 * not blind"); a `PlaybackBus` is this shape as it stands. Optional, so a fake
 * that only reports still works and starts at 0.
 */
export type PositionSource = {
  onPosition: (fn: (scoreTick: number) => void) => () => void;
  readonly positionTick?: number;
};

/**
 * The registered player as a position source: its reports, and where it is
 * now. What a hook falls back to when it is handed no bus, as the web's
 * `liveBus()` is — resolved on each use, so a player registered after the first
 * render is still found.
 */
export const PLAYER_POSITION: PositionSource = {
  onPosition: fn => getMusicPlayerIfInitialized()?.onPosition(fn) ?? (() => {}),
  get positionTick() {
    // `bus?.`: a test's recording double may carry no bus.
    return getMusicPlayerIfInitialized()?.bus?.positionTick ?? 0;
  },
};

/**
 * The playhead, delivered once per animation frame rather than per report.
 *
 * A position report is not always the engine's timer. It is also the tail of
 * a **synchronous** chain from a store write: `setScore` (or an arrangement
 * drag, or the Unplugged mix switching) → `bindPlayer`'s subscriber →
 * `player.load` → the engine's `seek` → `onPositionTick` — none of it
 * yields, so the listener runs inside whatever called `setScore`. When that
 * caller was itself inside a React render, a listener that set state there
 * tripped React's render-phase guard: "Cannot update a component
 * (`PositionScrubber`) while rendering a different component (`App`)",
 * seen on iOS. The scrubber was the one to be named because it set state on
 * *every* report, even to the same value; the text readouts only re-render
 * on a change and so were quiet, but had the same exposure.
 *
 * So the listener records the latest tick and asks for a frame; the state
 * update happens in the frame callback, which is never React's render
 * phase, whoever wrote the store. Several reports in one frame collapse to
 * one update, which is also the most a screen can show. A frame of latency
 * on a visual that interpolates anyway is nothing.
 */
export function useOnPositionFrame(
  source: PositionSource,
  handler: (scoreTick: number) => void
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    let frame: number | null = null;
    let latest = 0;
    const off = source.onPosition(next => {
      latest = next;
      if (frame === null) {
        frame = requestAnimationFrame(() => {
          frame = null;
          handlerRef.current(latest);
        });
      }
    });
    return () => {
      off();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [source]);
}

export function usePositionReadout(
  source: PositionSource,
  format: (tick: number) => string
): string {
  const formatRef = useRef(format);
  formatRef.current = format;
  const tick = useRef(0);
  /*
    Seeded from the source's snapshot, once per source: on mount, and again
    when the bar is handed a different one (another document's binding). A
    source with no snapshot leaves the tick where it was.
  */
  const seeded = useRef<PositionSource | null>(null);
  if (seeded.current !== source) {
    seeded.current = source;
    if (source.positionTick !== undefined) tick.current = source.positionTick;
  }
  const shown = useRef<string | null>(null);
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useOnPositionFrame(source, next => {
    tick.current = next;
    if (formatRef.current(next) !== shown.current) rerender();
  });
  const text = format(tick.current);
  shown.current = text;
  return text;
}
