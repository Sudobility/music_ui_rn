/**
 * Something derived from the notes sounding right now, kept as the same value
 * until what it shows changes.
 *
 * The one mechanism under `usePlayingPitches` and `useSoundingTrackIds`, which
 * differ only in what they keep (one track's pitches; every sounding track's
 * id). Sounding notes arrive on every note-on and note-off of every track, far
 * too often to route through zustand (see music_player's `bus.ts`), and most of
 * them change nothing a given view draws — so the answer is derived, compared
 * with the one already held, and only a real difference is a new identity and
 * therefore a render.
 *
 * `bus` is the web hooks' parameter: a host with a player of its own (a
 * published page) passes that player's bus. Left out, the *registered player*
 * is followed — subscribed through `player.onSounding` rather than through its
 * bus, so a test's recording double with no bus still drives the view; the bus
 * is consulted once, for what was sounding before this subscribed. That seed is
 * the part the hand-rolled subscriptions lacked: a view mounted, or pointed at
 * another track, between two reports showed the previous answer until the next
 * note boundary.
 */
import { useCallback, useRef, useSyncExternalStore } from 'react';
import { getMusicPlayerIfInitialized } from '@sudobility/music_player/core';
import type { PlaybackBus, SoundingNote } from '@sudobility/music_types';

const NO_NOTES: readonly SoundingNote[] = [];

export function useSounding<T>(
  bus: PlaybackBus | undefined,
  derive: (notes: readonly SoundingNote[]) => T,
  same: (a: T, b: T) => boolean,
  empty: T
): T {
  const kept = useRef<T>(empty);
  /*
    The latest notes, held here rather than read back off the bus on every
    snapshot: the subscription already delivers them, and a player without a
    bus then still works. Cleared on (re)subscribing, so a new source is read
    from its own snapshot rather than answered with the old one's last report.
  */
  const latest = useRef<readonly SoundingNote[] | null>(null);
  const subscribe = useCallback(
    (onChange: () => void) => {
      latest.current = null;
      const listen = (notes: readonly SoundingNote[]) => {
        latest.current = notes;
        onChange();
      };
      if (bus) return bus.onSounding(listen);
      const player = getMusicPlayerIfInitialized();
      if (!player) return () => {};
      return player.onSounding(listen);
    },
    [bus]
  );
  const get = (): T => {
    const notes =
      latest.current ??
      (bus ?? getMusicPlayerIfInitialized()?.bus)?.sounding ??
      NO_NOTES;
    const next = derive(notes);
    if (!same(next, kept.current)) kept.current = next;
    return kept.current;
  };
  return useSyncExternalStore(subscribe, get, get);
}
