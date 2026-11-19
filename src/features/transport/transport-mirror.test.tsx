/**
 * The transport bar, held to the web bar it mirrors.
 */
import { jest } from '@jest/globals';
import { act, fireEvent, renderHook } from '@testing-library/react-native';
import { LevelSlider } from '@sudobility/components-rn';
import { MockMusicPlayer } from '@sudobility/music_player/mocks';
import { renderWithApp, testDocument } from '../../test/render';
import { TransportBar } from './TransportBar';
import type { TransportController } from './TransportBar';
import { usePositionReadout } from './usePositionReadout';
import type { PositionSource } from './usePositionReadout';

let mockCompact = false;
jest.mock('../layout', () => ({
  useContainerSize: () => ({
    size: { width: 1400, height: 44 },
    onLayout: () => {},
    measured: true,
  }),
  barsCompact: () => mockCompact,
}));

/** A source that reports when told to, with or without a snapshot. */
function source(snapshot?: number) {
  const listeners = new Set<(tick: number) => void>();
  const value: PositionSource = {
    onPosition: fn => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    ...(snapshot === undefined ? {} : { positionTick: snapshot }),
  };
  return { value, report: (tick: number) => listeners.forEach(fn => fn(tick)) };
}

describe('usePositionReadout', () => {
  it('starts from where the playhead already is', () => {
    // Paused at tick 960, a readout that mounts now gets no report to correct
    // it — it read "bar 1" until something played.
    const { result } = renderHook(() =>
      usePositionReadout(source(960).value, tick => String(tick))
    );
    expect(result.current).toBe('960');
  });

  it('starts at zero for a source that cannot say', () => {
    const { result } = renderHook(() =>
      usePositionReadout(source().value, tick => String(tick))
    );
    expect(result.current).toBe('0');
  });
});

function controllerOver(player: MockMusicPlayer): TransportController {
  return {
    togglePlay: jest.fn<() => void>(),
    pause: jest.fn<() => void>(),
    goToStart: jest.fn<() => void>(),
    toggleLoop: jest.fn<() => void>(),
    setMetronome: jest.fn<(enabled: boolean) => void>(),
    seek: jest.fn<(tick: number) => void>(),
    setTempoMultiplier: jest.fn<(multiplier: number) => void>(),
    setMasterVolume: jest.fn<(volume: number) => void>(),
    bus: player.bus,
  };
}

describe('TransportBar', () => {
  beforeEach(() => {
    mockCompact = false;
  });

  function setup() {
    const document = testDocument({ measures: 4 });
    const controller = controllerOver(new MockMusicPlayer());
    const view = renderWithApp(
      <TransportBar
        score={document.store.getState().score!}
        store={document.store}
        controller={controller}
      />
    );
    return { view, controller, document };
  }

  it("is driven by the web bar's controller: its operations and its bus", () => {
    const { view, controller } = setup();
    fireEvent.press(view.getByLabelText('transport.play'));
    expect(controller.togglePlay).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByLabelText('transport.toggleLoop'));
    expect(controller.toggleLoop).toHaveBeenCalledTimes(1);
    fireEvent.press(view.getByLabelText('transport.goToStart'));
    expect(controller.pause).toHaveBeenCalledTimes(1);
    expect(controller.goToStart).toHaveBeenCalledTimes(1);
  });

  it('reads the playhead it mounts on from the bus, not from zero', () => {
    const document = testDocument({ measures: 4 });
    const player = new MockMusicPlayer();
    const ppq = document.store.getState().score!.ppq;
    // Bar 2, beat 1 of a 4/4 score.
    act(() => player.bus.publishPosition(ppq * 4));
    const view = renderWithApp(
      <TransportBar
        score={document.store.getState().score!}
        store={document.store}
        controller={controllerOver(player)}
      />
    );
    expect(view.getByText(/^2\./)).toBeTruthy();
  });

  it('steps the master volume by a percent, as the web fader does', () => {
    const { view } = setup();
    const fader = view
      .UNSAFE_getAllByType(LevelSlider)
      .find(slider => slider.props.label === 'transport.masterVolume')!;
    expect(fader.props.step).toBe(0.01);
  });

  it('gives a phone no "Audio output" row with nothing in it', () => {
    // Routing to a chosen output exists on macOS and Windows only; the test
    // platform is a phone's.
    mockCompact = true;
    const { view } = setup();
    fireEvent.press(view.getByLabelText('editor.moreActions'));
    expect(view.getByText('transport.speed')).toBeTruthy();
    expect(view.queryByText('transport.audioOutput')).toBeNull();
  });
});
