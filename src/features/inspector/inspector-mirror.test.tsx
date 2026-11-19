/**
 * The property sheet, held to the web inspector it mirrors.
 *
 * Tab order, default tab and every action were already shared. What had
 * drifted was smaller and easier to miss: the order of the fields inside a
 * tab, a state the web has and this did not (no score; a mixed tie), a heading,
 * and a picker that printed its own keys.
 */
import { jest } from '@jest/globals';
import { act } from '@testing-library/react-native';
import { Select } from '@sudobility/components-rn';
import {
  defaultInsertPitch,
  insertNoteAtCaret,
  toggleTie,
} from '@sudobility/music_editing';
import {
  DURATION_NAMES,
  durationLabel,
  isNoteEvent,
} from '@sudobility/music_types';
import { renderWithApp, testDocument } from '../../test/render';
import { accessibleNames, inOrder } from '../../test/labels';
import { withHostStrings } from '../../test/host-strings';
import type { MusicDocument } from '../../types';
import { MeasureTab } from './MeasureTab';
import { NoteTab } from './NoteTab';
import { ScoreTab } from './ScoreTab';
import { TrackTab } from './TrackTab';

/**
 * Every note on the first track, wherever it landed. Not "the first bar's":
 * the caret notes are inserted at is the app's one playhead, shared by every
 * document in the process, so a later test's notes start where an earlier
 * test's stopped.
 */
function firstTrackNotes(document: MusicDocument) {
  const score = document.store.getState().score!;
  return score.tracks[0]!.measures.flatMap(measure =>
    measure.voices.flatMap(voice => voice.events.filter(isNoteEvent))
  );
}

function withSelectedNotes(count: 1 | 2): MusicDocument {
  const document = testDocument();
  act(() => {
    for (let index = 0; index < count; index += 1)
      insertNoteAtCaret(document.store, defaultInsertPitch(document.store), {
        advanceCaret: true,
      });
    document.store.getState().setSelection({
      eventIds: firstTrackNotes(document).map(note => note.id),
      measureIds: [],
      trackIds: [],
    });
  });
  return document;
}

function withoutScore(): MusicDocument {
  const document = testDocument();
  act(() => document.store.setState({ score: null }));
  return document;
}

describe('the no-score state, on every tab that edits one', () => {
  it.each([
    ['Score', ScoreTab],
    ['Track', TrackTab],
    ['Bar', MeasureTab],
    ['Note', NoteTab],
  ] as const)('%s tab says there is no score', (_name, Tab) => {
    const view = renderWithApp(<Tab document={withoutScore()} />);
    expect(view.getByText('inspector.noScore')).toBeTruthy();
  });

  it('tells no score from nothing selected', () => {
    const view = renderWithApp(<MeasureTab document={testDocument()} />);
    expect(view.getByText('inspector.selectMeasure')).toBeTruthy();
    expect(view.queryByText('inspector.noScore')).toBeNull();
  });
});

describe('ScoreTab', () => {
  it("opens on the web tab's heading, and notes the title under both fields", () => {
    const view = renderWithApp(<ScoreTab document={testDocument()} />);
    expect(view.getByText('inspector.score')).toBeTruthy();
    const json = JSON.stringify(view.toJSON());
    // After Composer, where the web puts it — it was the Title field's hint.
    expect(json.indexOf('inspector.scoreTitleHint')).toBeGreaterThan(
      json.lastIndexOf('inspector.composer')
    );
  });
});

describe('TrackTab', () => {
  function setup() {
    const document = testDocument();
    act(() => {
      const track = document.store.getState().score!.tracks[0]!;
      document.store.getState().selectTrack(track.id);
    });
    return renderWithApp(
      <TrackTab document={document} onReplace={jest.fn()} />
    );
  }

  it("opens on the web tab's heading", () => {
    expect(setup().getByText('inspector.track')).toBeTruthy();
  });

  it('offers Replace Track above Delete, as the web does', () => {
    const names = inOrder(accessibleNames(setup().toJSON()), [
      'inspector.replaceTrack',
      'inspector.deleteTrack',
    ]);
    expect(names.slice(0, 2)).toEqual([
      'inspector.replaceTrack',
      'inspector.deleteTrack',
    ]);
  });

  it('labels the clef with the key both apps use, and names it apart from the Bar tab', () => {
    const view = setup();
    expect(view.getByText('importMidi.colClef')).toBeTruthy();
    // Until the host carries the web's "Track clef", the name it had.
    expect(view.getByLabelText('inspector.clef')).toBeTruthy();
    view.unmount();

    const restore = withHostStrings({ 'inspector.trackClef': 'Track clef' });
    try {
      expect(setup().getByLabelText('Track clef')).toBeTruthy();
    } finally {
      restore();
    }
  });
});

describe('MeasureTab', () => {
  it("adds the web's how-to line once the host has words for it", () => {
    const before = renderWithApp(<MeasureTab document={testDocument()} />);
    // Never printed as a key: absent until the host carries the string.
    expect(before.queryByText('inspector.selectMeasureHint')).toBeNull();
    before.unmount();

    const restore = withHostStrings({
      'inspector.selectMeasureHint': 'Tap a bar number to select it.',
    });
    try {
      const after = renderWithApp(<MeasureTab document={testDocument()} />);
      expect(after.getByText('Tap a bar number to select it.')).toBeTruthy();
    } finally {
      restore();
    }
  });
});

describe('NoteTab', () => {
  it("sets the fields out in the web tab's order", () => {
    const view = renderWithApp(
      <NoteTab document={withSelectedNotes(1)} onReplace={jest.fn()} />
    );
    const sequence = [
      'inspector.duration',
      'inspector.bar',
      'inspector.velocity',
      'inspector.articulation',
      'inspector.dynamic',
      'inspector.voice',
      'inspector.tieStart',
      'inspector.tieStop',
      'inspector.chordSymbol',
      'inspector.fingering',
      '8va',
      'inspector.glissando',
      'inspector.makeGraceNote',
      'inspector.replaceNotes',
    ];
    const drawn = inOrder(accessibleNames(view.toJSON()), sequence);
    expect([...new Set(drawn)]).toEqual(sequence);
  });

  it('names every note value, dotted and triplet included', () => {
    // The hosts' locales carry the six plain values; the other twelve printed
    // `duration.dotted-quarter`. Where the host has no word, the shared label
    // the web picker prints stands in.
    const restore = withHostStrings({ 'duration.quarter': 'Viertel' });
    try {
      const view = renderWithApp(<NoteTab document={withSelectedNotes(1)} />);
      const picker = view
        .UNSAFE_getAllByType(Select)
        .find(
          select => select.props.accessibilityLabel === 'inspector.duration'
        )!;
      const labels = Object.fromEntries(
        (picker.props.options as { value: string; label: string }[]).map(
          option => [option.value, option.label]
        )
      );
      expect(Object.keys(labels)).toEqual([...DURATION_NAMES]);
      expect(labels.quarter).toBe('Viertel');
      expect(labels['dotted-quarter']).toBe(durationLabel('dotted-quarter'));
      expect(
        Object.values(labels).filter(label => label.startsWith('duration.'))
      ).toEqual([]);
    } finally {
      restore();
    }
  });

  it('says Mixed when the selected notes disagree about a tie', () => {
    const document = withSelectedNotes(2);
    act(() => {
      const [first] = firstTrackNotes(document);
      const all = document.store.getState().selection;
      // Tie the first note only, then select both again.
      document.store.getState().setSelection({
        eventIds: [first!.id],
        measureIds: [],
        trackIds: [],
      });
      toggleTie(document.store, 'tieStart');
      document.store.getState().setSelection(all);
    });
    const [first, second] = firstTrackNotes(document);
    // Only meaningful if the two really do disagree.
    expect(first!.tieStart === true).not.toBe(second!.tieStart === true);

    const view = renderWithApp(<NoteTab document={document} />);
    expect(
      view.getByLabelText('inspector.tieStart, inspector.mixed')
    ).toBeTruthy();
    // The other end agrees (neither stops a tie… or both do): no "Mixed" there
    // unless the model says so.
    expect(view.queryAllByText('inspector.mixed').length).toBeGreaterThan(0);
  });

  it('says nothing about Mixed when the notes agree', () => {
    const view = renderWithApp(<NoteTab document={withSelectedNotes(2)} />);
    expect(view.getByLabelText('inspector.tieStart')).toBeTruthy();
    expect(view.getByLabelText('inspector.tieStop')).toBeTruthy();
  });
});
