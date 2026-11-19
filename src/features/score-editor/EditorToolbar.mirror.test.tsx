/**
 * The editing bar, held to the web bar it mirrors.
 *
 * The enable rules and actions were already shared (`selectToolbarAvailability`
 * and music_editing's actions); what had drifted was the arrangement — the
 * order the controls are met in, where voice recording sits, and a row and a
 * toggle that were drawn with nothing behind them.
 */
import { jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createDevicePrefsStore } from '@sudobility/music_lib';
import { TOOLBAR_CONTROLS } from '@sudobility/music_types';
import { renderWithApp, testDocument } from '../../test/render';
import { accessibleNames, inOrder } from '../../test/labels';
import { ToolbarSelect } from '../../components/controls';
import { EditorToolbar } from './EditorToolbar';

// A wide window unless a test says otherwise: the bar measures itself, and a
// test renderer measures nothing.
let mockCompact = false;
jest.mock('../layout', () => ({
  useContainerSize: () => ({
    size: { width: 1400, height: 44 },
    onLayout: () => {},
    measured: true,
  }),
  barsCompact: () => mockCompact,
}));

function setup(props: Partial<Parameters<typeof EditorToolbar>[0]> = {}) {
  const document = testDocument({ measures: 4 });
  return renderWithApp(
    <EditorToolbar
      document={document}
      layoutMode='page'
      onLayoutModeChange={jest.fn()}
      devicePrefs={createDevicePrefsStore()}
      {...props}
    />
  );
}

/**
 * Each control's accessible name, by its music_types id. The *order* is not
 * written here: it is `TOOLBAR_CONTROLS`, music_types' statement of the bar's
 * sequence, which the web bar follows control for control.
 */
const NAME_OF: Partial<Record<(typeof TOOLBAR_CONTROLS)[number], string>> = {
  addTrack: 'editor.addTrack',
  noteDuration: 'editor.noteDuration',
  dotted: 'editor.dotted',
  triplet: 'editor.triplet',
  accidental: 'editor.accidental',
  articulation: 'editor.articulation',
  ornament: 'editor.ornament',
  tie: 'editor.toggleTie',
  insertMode: 'editor.insertMode',
  replaceMode: 'editor.replaceMode',
  stackMode: 'editor.stackMode',
  insertNote: 'editor.insertNote',
  slur: 'editor.slur',
  crescendo: 'editor.crescendo',
  diminuendo: 'editor.diminuendo',
  arpeggiate: 'editor.arpeggiate',
  beamBreak: 'editor.beamBreak',
  beamNone: 'editor.beamNone',
  fermata: 'editor.fermata',
  noteInput: 'editor.noteInput',
  insertRest: 'editor.insertRest',
  quantizeGrid: 'editor.quantizeGrid',
  quantize: 'editor.quantize',
  // `voice` is drawn as numbered chips, not under one name.
  moreActions: 'editor.moreActions',
};

/** The bar's controls up to the More menu, in the shared order. */
const WEB_SEQUENCE = TOOLBAR_CONTROLS.slice(
  0,
  TOOLBAR_CONTROLS.indexOf('moreActions') + 1
).flatMap(control => (NAME_OF[control] ? [NAME_OF[control]] : []));

describe('EditorToolbar', () => {
  beforeEach(() => {
    mockCompact = false;
  });

  it("sets the controls out in the web bar's order, which is TOOLBAR_CONTROLS'", () => {
    const view = setup();
    expect(WEB_SEQUENCE).toHaveLength(24);
    const drawn = inOrder(accessibleNames(view.toJSON()), WEB_SEQUENCE);
    // De-duplicated: a control and the group it sits in can share a name.
    expect([...new Set(drawn)]).toEqual(WEB_SEQUENCE);
  });

  it("names the quantize grids with the web menu's keys", () => {
    const view = setup();
    const picker = view
      .UNSAFE_getAllByType(ToolbarSelect)
      .find(select => select.props.label === 'editor.quantizeGrid')!;
    expect(
      (picker.props.options as { label: string }[]).map(option => option.label)
    ).toEqual([
      '1/4 — importMidi.gridQuarter',
      '1/8 — importMidi.gridEighth',
      '1/16 — importMidi.gridSixteenth',
      '1/32 — importMidi.gridThirtySecond',
    ]);
  });

  it('puts voice recording beside Add Track, as the web does', () => {
    const view = setup({
      renderVoiceRecord: () => <Text accessibilityLabel='record'>mic</Text>,
    });
    const names = inOrder(accessibleNames(view.toJSON()), [
      'editor.addTrack',
      'record',
      'editor.noteDuration',
    ]);
    expect(names).toEqual(['editor.addTrack', 'record', 'editor.noteDuration']);
  });

  it('offers no inspector toggle when there is no handler for one', () => {
    const without = setup();
    expect(without.queryByLabelText('editor.toggleInspector')).toBeNull();
    without.unmount();

    const onToggleInspector = jest.fn();
    const withToggle = setup({ onToggleInspector, inspectorOpen: true });
    const toggle = withToggle.getByLabelText('editor.toggleInspector');
    expect(toggle.props.accessibilityState).toMatchObject({ selected: true });
    fireEvent.press(toggle);
    expect(onToggleInspector).toHaveBeenCalledTimes(1);
  });

  it('still reads the earlier inspectorVisible name', () => {
    const view = setup({
      onToggleInspector: jest.fn(),
      inspectorVisible: true,
    });
    expect(
      view.getByLabelText('editor.toggleInspector').props.accessibilityState
    ).toMatchObject({ selected: true });
  });

  it('draws no "Record voice" row in the compact sheet without a recorder', () => {
    mockCompact = true;
    const view = setup();
    fireEvent.press(view.getByLabelText('editor.moreActions'));
    expect(view.queryByText('editor.recordVoice')).toBeNull();
    // The sheet itself is up: a row that is always there.
    expect(view.getByText('editor.durationModifier')).toBeTruthy();
  });

  it('draws the row when the host offers recording', () => {
    mockCompact = true;
    const view = setup({
      renderVoiceRecord: () => <Text accessibilityLabel='record'>mic</Text>,
    });
    fireEvent.press(view.getByLabelText('editor.moreActions'));
    expect(view.getByText('editor.recordVoice')).toBeTruthy();
  });
});
