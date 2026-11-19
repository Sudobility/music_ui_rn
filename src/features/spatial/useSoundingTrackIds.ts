/**
 * Which tracks have a note sounding right now, as a set that keeps its
 * identity until the answer changes — `@sudobility/music_ui`'s
 * `useSoundingTrackIds`, with its optional `bus`.
 *
 * What the Spatial 3D view lights up: every track with an active note, rather
 * than the active track's pitches the way the piano keyboard reads them — the
 * stage is meant to be looked at with everything visible. The identity guard is
 * what keeps the view from re-rendering on a note that changed nothing it draws
 * — a second note starting on a track already lit.
 *
 * `bus` is passed by a host whose stage follows a player of its own (a
 * published page's); left out, the registered player is followed. See
 * `hooks/useSounding.ts` for how the notes are read.
 */
import type { PlaybackBus, SoundingNote } from '@sudobility/music_types';
import { useSounding } from '../../hooks/useSounding';

const NO_TRACK_IDS: ReadonlySet<string> = new Set();

function sameIdSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

function trackIdsOf(notes: readonly SoundingNote[]): ReadonlySet<string> {
  if (notes.length === 0) return NO_TRACK_IDS;
  return new Set(notes.map(note => note.trackId));
}

export function useSoundingTrackIds(bus?: PlaybackBus): ReadonlySet<string> {
  return useSounding(bus, trackIdsOf, sameIdSet, NO_TRACK_IDS);
}
