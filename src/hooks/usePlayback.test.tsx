/**
 * The playback hooks, held to the web library's of the same names.
 *
 * They render when what they show changes, not when the engine reports; they
 * start from where the player already is; and the keys follow the reader to
 * another track at once. The test installs a `MockMusicPlayer` and publishes
 * into its real bus exactly as the engine would — `music_ui`'s own
 * `usePlayback.test.tsx` does the same.
 */
import { jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import {
  getMusicPlayerIfInitialized,
  initializeMusicPlayer,
  resetMusicPlayer,
} from '@sudobility/music_player/core';
import { MockMusicPlayer } from '@sudobility/music_player/mocks';
import type { SoundingNote } from '@sudobility/music_types';
import { useSoundingTrackIds } from '../features/spatial/useSoundingTrackIds';
import {
  usePlaybackPosition,
  usePlaybackReadout,
  usePlayingPitches,
} from './usePlayback';

beforeEach(() => {
  jest.useFakeTimers();
  initializeMusicPlayer(new MockMusicPlayer());
});
afterEach(() => {
  resetMusicPlayer();
  jest.useRealTimers();
});

/**
 * The registered player. Driven through `emit*`, which is the mock's engine:
 * it publishes into the bus *and* tells the player's own subscribers, as the
 * real player's one bus does for both.
 */
const player = (): MockMusicPlayer =>
  getMusicPlayerIfInitialized() as MockMusicPlayer;
/** Lets the frame the position hooks wait for go by. */
const frame = () => act(() => jest.advanceTimersByTime(50));
const note = (trackId: string, midi: number): SoundingNote => ({
  noteId: `${trackId}-${midi}`,
  trackId,
  midi,
});

describe('usePlaybackReadout', () => {
  it('renders once per change of text, however many reports arrive', () => {
    const beat = (tick: number) => String(Math.floor(tick / 480) + 1);
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return usePlaybackReadout(beat);
    });
    const settled = renders;

    // Thirty reports inside one beat, as the engine sends in a second.
    for (let tick = 0; tick < 480; tick += 16) {
      act(() => player().emitPosition(tick));
      frame();
    }
    expect(renders).toBe(settled);
    expect(result.current).toBe('1');

    act(() => player().emitPosition(480));
    frame();
    expect(renders).toBe(settled + 1);
    expect(result.current).toBe('2');
  });

  it('starts from where the playhead already is, not from zero', () => {
    // Paused at bar 3: no report will come to correct a readout that mounts
    // now, so it has to read the snapshot.
    act(() => player().emitPosition(960));
    const { result } = renderHook(() =>
      usePlaybackReadout(tick => String(tick))
    );
    expect(result.current).toBe('960');
  });

  it('takes a bus, as the web hook does, and reads the playhead through it', () => {
    // The position itself is the app's one playhead (music_types'
    // `getMusicPositionSource`), whichever bus it is read through — so there
    // is nothing to isolate here, only a parameter to honour.
    const own = new MockMusicPlayer().bus;
    act(() => own.publishPosition(240));
    const { result } = renderHook(() =>
      usePlaybackReadout(tick => String(tick), own)
    );
    expect(result.current).toBe('240');
    act(() => own.publishPosition(480));
    frame();
    expect(result.current).toBe('480');
  });
});

describe('usePlaybackPosition', () => {
  it('is the playhead, from the snapshot and then from each report', () => {
    act(() => player().emitPosition(120));
    const { result } = renderHook(() => usePlaybackPosition());
    expect(result.current).toBe(120);
    act(() => player().emitPosition(360));
    frame();
    expect(result.current).toBe(360);
  });

  it('rests at zero while no player is registered', () => {
    resetMusicPlayer();
    const { result } = renderHook(() => usePlaybackPosition());
    expect(result.current).toBe(0);
  });
});

describe('usePlayingPitches', () => {
  it('keeps one track, as one set, until one of its keys moves', () => {
    const { result } = renderHook(() => usePlayingPitches('a'));
    act(() => player().emitSounding([note('a', 60)]));
    const first = result.current;
    expect([...first]).toEqual([60]);
    // A note on another part changes nothing this keyboard draws.
    act(() => player().emitSounding([note('a', 60), note('b', 72)]));
    expect(result.current).toBe(first);
    act(() => player().emitSounding([note('a', 60), note('a', 64)]));
    expect([...result.current].sort()).toEqual([60, 64]);
  });

  it('answers for the new track at once when the active track changes', () => {
    // The hand-rolled subscription this replaced kept the old track's keys
    // lit, as the new track's, until that track's next note.
    act(() => player().emitSounding([note('a', 60), note('b', 72)]));
    const { result, rerender } = renderHook(
      ({ track }: { track: string }) => usePlayingPitches(track),
      { initialProps: { track: 'a' } }
    );
    // Seeded from what was already sounding when it mounted.
    expect([...result.current]).toEqual([60]);
    rerender({ track: 'b' });
    expect([...result.current]).toEqual([72]);
  });

  it('is empty with no active track', () => {
    act(() => player().emitSounding([note('a', 60)]));
    const { result } = renderHook(() => usePlayingPitches(null));
    expect(result.current.size).toBe(0);
  });
});

describe('useSoundingTrackIds', () => {
  it('names every sounding track, keeping its identity until the set changes', () => {
    const { result } = renderHook(() => useSoundingTrackIds());
    act(() => player().emitSounding([note('a', 60)]));
    const lit = result.current;
    expect([...lit]).toEqual(['a']);
    // A second note on a track already lit is not a change to the stage.
    act(() => player().emitSounding([note('a', 60), note('a', 67)]));
    expect(result.current).toBe(lit);
    act(() => player().emitSounding([note('a', 60), note('b', 67)]));
    expect([...result.current].sort()).toEqual(['a', 'b']);
  });

  it("follows the bus it is handed rather than the registered player's", () => {
    const own = new MockMusicPlayer().bus;
    const { result } = renderHook(() => useSoundingTrackIds(own));
    act(() => player().emitSounding([note('a', 60)]));
    expect(result.current.size).toBe(0);
    act(() => own.publishSounding([note('z', 60)]));
    expect([...result.current]).toEqual(['z']);
  });
});
