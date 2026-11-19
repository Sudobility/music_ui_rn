/**
 * The title bar's document actions, held to the web header's.
 */
import { jest } from '@jest/globals';
import { act } from '@testing-library/react-native';
import {
  defaultInsertPitch,
  insertNoteAtCaret,
} from '@sudobility/music_editing';
import { renderWithApp, testDocument } from '../../test/render';
import { TitleBarDocumentActions } from './TitleBar';

function setup() {
  const document = testDocument();
  // Something to undo.
  act(() => {
    insertNoteAtCaret(document.store, defaultInsertPitch(document.store));
  });
  const view = renderWithApp(
    <TitleBarDocumentActions
      document={document}
      onSave={jest.fn()}
      onExport={jest.fn()}
    />
  );
  const disabled = (name: string) =>
    view.getByLabelText(name).props.accessibilityState?.disabled === true;
  return { document, view, disabled };
}

describe('TitleBarDocumentActions', () => {
  it('names Save as the web does, with "Save now" as its hint', () => {
    const { view } = setup();
    const save = view.getByLabelText('editor.save');
    expect(save.props.accessibilityHint).toBe('editor.saveNow');
  });

  it('offers undo once there is something to undo', () => {
    const { disabled } = setup();
    expect(disabled('editor.undo')).toBe(false);
    expect(disabled('editor.redo')).toBe(true);
  });

  it('refuses undo while a job owns the score, as the web header does', () => {
    // The store declines an undo under the edit lock; a button that looked
    // live through a whole generation did nothing when pressed.
    const { document, disabled } = setup();
    act(() => document.store.getState().setEditLocked(true));
    expect(disabled('editor.undo')).toBe(true);
    act(() => document.store.getState().setEditLocked(false));
    expect(disabled('editor.undo')).toBe(false);
  });
});
