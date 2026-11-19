/**
 * The generation sheets, held to the web dialogs they mirror.
 *
 * Each case here is a place the two had drifted: a request the web tags with
 * its backend and this sent bare, a summary the web opens on and this never
 * showed, a prop the web names one thing and this another. Labels are asserted
 * by key — the library holds no strings.
 */
import { jest } from '@jest/globals';
import { act, fireEvent } from '@testing-library/react-native';
import { Select } from '@sudobility/components-rn';
import {
  DEFAULT_GENERATION_VARIANT,
  createDevicePrefsStore,
} from '@sudobility/music_lib';
import {
  createEmptyScore,
  generationInstrumentOptionsFlat,
  replacementRegion,
} from '@sudobility/music_types';
import type { ReplacementRegion } from '@sudobility/music_types';
import { renderWithApp, testDocument } from '../../test/render';
import { withHostStrings } from '../../test/host-strings';
import { GenerateTrackSheet } from './GenerateTrackSheet';
import { GenerationOverlay, GenerationStatusStrip } from './GenerationOverlay';
import { ProjectOriginPanel } from './ProjectOriginPanel';
import { ReplaceMusicDialog, ReplaceMusicSheet } from './ReplaceMusicSheet';

describe('GenerateTrackSheet', () => {
  function setup(
    props: Partial<Parameters<typeof GenerateTrackSheet>[0]> = {}
  ) {
    const score = createEmptyScore({ title: 'Waltz', measures: 12 });
    const onSubmit = jest.fn();
    const view = renderWithApp(
      <GenerateTrackSheet
        open
        score={score}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        {...props}
      />
    );
    const submit = () => {
      fireEvent.changeText(
        view.getByLabelText('generateTrack.promptLabel'),
        'a bass line'
      );
      fireEvent.press(view.getByRole('button', { name: 'generate.action' }));
      return onSubmit.mock.calls[0]![0] as { variant?: string };
    };
    return { view, submit };
  }

  it('names the backend the request goes to, as the web request does', () => {
    // Untagged, a request went to the server's default backend — not the one
    // New Project and Replace send, nor the web's.
    const { view, submit } = setup();
    expect(submit().variant).toBe(DEFAULT_GENERATION_VARIANT);
    // No prefs store to remember a choice in, so no picker to make one with.
    expect(view.queryByLabelText('generateScore.model')).toBeNull();
  });

  it('offers the Model picker over the device prefs, and sends the choice', () => {
    const devicePrefs = createDevicePrefsStore();
    const { view, submit } = setup({ devicePrefs });
    expect(view.getByLabelText('generateScore.model')).toBeTruthy();
    act(() => devicePrefs.getState().setGenerationVariant('claude'));
    expect(submit().variant).toBe('claude');
  });

  it('sends the server default as no field at all, as the web does', () => {
    const devicePrefs = createDevicePrefsStore();
    act(() => devicePrefs.getState().setGenerationVariant('default'));
    const { submit } = setup({ devicePrefs });
    expect('variant' in submit()).toBe(false);
  });

  it('offers the shared Generate Track list: kits, then every program, no singers', () => {
    const { view } = setup();
    // The control is the design system's; what it is handed is what is pinned.
    const picker = view
      .UNSAFE_getAllByType(Select)
      .find(
        select => select.props.accessibilityLabel === 'generate.instrument'
      )!;
    const shared = generationInstrumentOptionsFlat({ voices: false });
    expect(picker.props.options).toEqual(shared);
    expect(shared[0]!.value).toBe('kit:0');
    expect(shared.some(option => option.label === 'Voice Oohs')).toBe(false);
  });
});

describe('ReplaceMusicSheet', () => {
  function region(): ReplacementRegion {
    const document = testDocument({ measures: 4 });
    const score = document.store.getState().score!;
    const track = score.tracks[0]!;
    const found = replacementRegion(
      score,
      { eventIds: [], measureIds: [], trackIds: [track.id] },
      track.id,
      'track'
    );
    if (!found) throw new Error('a track is always a region');
    return found;
  }

  function setup(props: Partial<Parameters<typeof ReplaceMusicSheet>[0]> = {}) {
    const onSubmit = jest.fn();
    const view = renderWithApp(
      <ReplaceMusicSheet
        open
        scope='track'
        onClose={jest.fn()}
        onSubmit={onSubmit}
        {...props}
      />
    );
    return { view, onSubmit };
  }

  it('says what will be overwritten when handed the region, as the web opens', () => {
    const { view } = setup({ region: region(), trackLabel: 'Violin' });
    expect(view.getByText(/replace\.summary/)).toBeTruthy();
  });

  it('gates Replace on the region: null refuses, a region allows', () => {
    const refused = setup({ region: null });
    fireEvent.changeText(
      refused.view.getByLabelText('generate.prompt'),
      'simplify'
    );
    fireEvent.press(
      refused.view.getByRole('button', { name: 'replace.action' })
    );
    expect(refused.onSubmit).not.toHaveBeenCalled();
    refused.view.unmount();

    const allowed = setup({ region: region() });
    fireEvent.changeText(
      allowed.view.getByLabelText('generate.prompt'),
      'simplify'
    );
    fireEvent.press(
      allowed.view.getByRole('button', { name: 'replace.action' })
    );
    expect(allowed.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('still honours the older canSubmit gate when no region is given', () => {
    const { view, onSubmit } = setup({ canSubmit: false });
    fireEvent.changeText(view.getByLabelText('generate.prompt'), 'simplify');
    fireEvent.press(view.getByRole('button', { name: 'replace.action' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(view.getByText('replace.nothingSelected')).toBeTruthy();
  });

  it("labels the instruction with the web's key once the host carries it", () => {
    const restore = withHostStrings({ 'replace.instruction': 'Instruction' });
    try {
      const { view } = setup({ region: region() });
      expect(view.getByLabelText('Instruction')).toBeTruthy();
      expect(view.queryByLabelText('generate.prompt')).toBeNull();
    } finally {
      restore();
    }
  });

  it('reads "Presets" on the control and names it "Preset instructions"', () => {
    const { view } = setup({ region: region() });
    expect(view.getByLabelText('replace.presetInstructions')).toBeTruthy();
    // Once, as the control's own text — not also as a field label above it.
    expect(view.queryAllByText('replace.presetInstructions')).toHaveLength(0);
    expect(view.getByText('generate.presets')).toBeTruthy();
  });

  it('sends the remembered backend, and offers the picker over device prefs', () => {
    const devicePrefs = createDevicePrefsStore();
    act(() => devicePrefs.getState().setGenerationVariant('claude'));
    const { view, onSubmit } = setup({ region: region(), devicePrefs });
    expect(view.getByLabelText('generateScore.model')).toBeTruthy();
    fireEvent.changeText(view.getByLabelText('generate.prompt'), 'simplify');
    fireEvent.press(view.getByRole('button', { name: 'replace.action' }));
    expect((onSubmit.mock.calls[0]![0] as { variant: string }).variant).toBe(
      'claude'
    );
  });

  it("is the web's ReplaceMusicDialog under that name", () => {
    const onSubmit = jest.fn();
    const view = renderWithApp(
      <ReplaceMusicDialog
        open
        scope='track'
        region={null}
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );
    fireEvent.changeText(view.getByLabelText('generate.prompt'), 'simplify');
    fireEvent.press(view.getByRole('button', { name: 'replace.action' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('GenerationStatusStrip', () => {
  it('is the overlay under the web name, with error and visible optional', () => {
    const view = renderWithApp(<GenerationStatusStrip onCancel={jest.fn()} />);
    expect(view.getByTestId('generation-status-strip')).toBeTruthy();
  });

  it('still hides when the native host says it is not visible', () => {
    const view = renderWithApp(
      <GenerationOverlay visible={false} error={null} onCancel={jest.fn()} />
    );
    expect(view.queryByTestId('generation-status-strip')).toBeNull();
  });

  it("heads the strip with the web's key once the host carries it", () => {
    const before = renderWithApp(
      <GenerationStatusStrip onCancel={jest.fn()} />
    );
    expect(before.getByText('generate.working')).toBeTruthy();
    before.unmount();

    const restore = withHostStrings({
      'overlay.generatingNotes': 'Generating notes…',
    });
    try {
      const after = renderWithApp(
        <GenerationStatusStrip onCancel={jest.fn()} />
      );
      expect(after.getByText('Generating notes…')).toBeTruthy();
      expect(after.queryByText('generate.working')).toBeNull();
    } finally {
      restore();
    }
  });
});

describe('ProjectOriginPanel', () => {
  it("takes the web's hookContext, and renders without one", () => {
    const view = renderWithApp(
      <ProjectOriginPanel
        origin={{ kind: 'imported', format: 'midi', fileName: 'waltz.mid' }}
        projectId='p1'
        hookContext={null}
      />
    );
    expect(view.getByText('waltz.mid')).toBeTruthy();
  });
});
