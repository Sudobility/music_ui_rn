/**
 * React bindings for playback position and sounding notes — the native twins of
 * `@sudobility/music_ui`'s `hooks/usePlayback.ts`, name for name and signature
 * for signature.
 *
 * Position and sounding notes are not in the store (see music_player's
 * `shared/bus.ts`), so this is how a component reads them. Each hook follows
 * one channel, which is the point: a readout that wants the playhead must not
 * re-render when a note starts, and the piano keyboard must not re-render
 * thirty times a second.
 *
 * **Still isolate these.** `usePlaybackPosition()` at a large component's top
 * level costs that whole subtree a render per frame while playing.
 *
 * `bus` defaults to the registered player's — or is passed explicitly by a host
 * with its own player and binding (a published page). Before any player is
 * registered every hook here rests at its empty value rather than throwing.
 *
 * **Where the mechanism differs from the web's, and why.** The web's position
 * hooks subscribe with `useSyncExternalStore` and update inside the engine's
 * report. Here a position report can be the tail of a *synchronous* chain from
 * a store write made during a render (`setScore` → `bindPlayer` → `load` →
 * `seek` → report), and a state update there is React's "cannot update a
 * component while rendering a different component". So the two position hooks
 * sit on `useOnPositionFrame` (`features/transport/usePositionReadout.ts`),
 * which delivers once per animation frame — the same values, a frame later at
 * most. `usePositionReadout(source, format)` is the older native spelling of
 * `usePlaybackReadout` and stays for the transport bar's own readouts.
 */
import { useState } from 'react';
import {
  playingPitchesForTrack,
  samePitchSet,
} from '@sudobility/music_drawing';
import type { PlaybackBus } from '@sudobility/music_types';
import {
  PLAYER_POSITION,
  useOnPositionFrame,
  usePositionReadout,
} from '../features/transport/usePositionReadout';
import type { PositionSource } from '../features/transport/usePositionReadout';
import { useSounding } from './useSounding';

/** A `PlaybackBus` is a position source as it stands; none means the player's. */
function positionSource(bus: PlaybackBus | undefined): PositionSource {
  return bus ?? PLAYER_POSITION;
}

/**
 * The playhead, as the engine last reported it. Once per frame while playing,
 * silent otherwise. `0` while no player is registered.
 */
export function usePlaybackPosition(bus?: PlaybackBus): number {
  const source = positionSource(bus);
  const [tick, setTick] = useState(() => source.positionTick ?? 0);
  /*
    A different bus is a different playhead: start from where that one is. Set
    during render, which is React's own pattern for state derived from a prop
    changing — an effect would paint the old bus's tick once first.
  */
  const [seenSource, setSeenSource] = useState(source);
  if (seenSource !== source) {
    setSeenSource(source);
    setTick(source.positionTick ?? 0);
  }
  useOnPositionFrame(source, setTick);
  return tick;
}

/**
 * Text derived from the playhead, re-rendering only when the text changes.
 *
 * Position reports arrive thirty times a second, and a readout shows far less
 * than that: a bar and beat changes a few times a second and a timecode ten.
 * `format` is read at render, so a new score or tempo applies at once.
 */
export function usePlaybackReadout(
  format: (tick: number) => string,
  bus?: PlaybackBus
): string {
  return usePositionReadout(positionSource(bus), format);
}

const NO_PITCHES: ReadonlySet<number> = new Set();

/**
 * The keys the active track is sounding, kept as the same set until one of
 * them changes.
 *
 * The player reports on every note of every track, and a keyboard shows one:
 * read as the raw sounding notes, the whole row of keys re-rendered for notes
 * it does not show — on a dense multi-track score, most of them. `samePitchSet`
 * decides whether anything this keyboard draws moved.
 *
 * The notes arrive with their track and pitch already resolved by the
 * scheduler, so this is a filter rather than a search of the score — and it is
 * re-run against what is sounding *now* when `activeTrackId` changes, so the
 * keys follow the reader to another part at once rather than at its next note.
 */
export function usePlayingPitches(
  activeTrackId: string | null,
  bus?: PlaybackBus
): ReadonlySet<number> {
  return useSounding(
    bus,
    notes => playingPitchesForTrack(notes, activeTrackId),
    samePitchSet,
    NO_PITCHES
  );
}
