/**
 * The issues list, held to the web's status-bar popover.
 *
 * Two things the web list does and this did not: a row goes to the place it
 * names, and Fix all is refused while the score cannot be edited.
 */
import { jest } from '@jest/globals';
import { act, fireEvent } from '@testing-library/react-native';
import type { ValidationIssue } from '@sudobility/music_types';
import { renderWithApp, testDocument } from '../../test/render';
import type { MusicDocument } from '../../types';
import { IssuesSheet } from './IssuesSheet';

function withIssues(
  make: (document: MusicDocument) => ValidationIssue[]
): MusicDocument {
  const document = testDocument({ measures: 4 });
  act(() => document.store.setState({ validationIssues: make(document) }));
  return document;
}

const issue = (patch: Partial<ValidationIssue>): ValidationIssue =>
  ({
    code: 'test',
    severity: 'warning',
    message: 'Bar 2 does not add up',
    ...patch,
  }) as ValidationIssue;

describe('IssuesSheet', () => {
  it('goes to the bar an issue names, and closes so it can be seen', () => {
    let measureId = '';
    const document = withIssues(doc => {
      measureId = doc.store.getState().score!.tracks[0]!.measures[1]!.id;
      return [issue({ measureId })];
    });
    const onClose = jest.fn();
    const view = renderWithApp(
      <IssuesSheet open document={document} onClose={onClose} />
    );
    fireEvent.press(view.getByLabelText('Bar 2 does not add up'));
    expect(document.store.getState().selection.measureIds).toEqual([measureId]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to the track when the issue names nothing finer', () => {
    let trackId = '';
    const document = withIssues(doc => {
      trackId = doc.store.getState().score!.tracks[0]!.id;
      return [issue({ trackId, message: 'Too many notes at once' })];
    });
    const view = renderWithApp(
      <IssuesSheet open document={document} onClose={jest.fn()} />
    );
    fireEvent.press(view.getByLabelText('Too many notes at once'));
    expect(document.store.getState().selection.trackIds).toEqual([trackId]);
  });

  it('leaves the selection alone for an issue whose bar is gone, and still closes', () => {
    const document = withIssues(() => [issue({ measureId: 'no-such-bar' })]);
    const before = document.store.getState().selection;
    const onClose = jest.fn();
    const view = renderWithApp(
      <IssuesSheet open document={document} onClose={onClose} />
    );
    fireEvent.press(view.getByLabelText('Bar 2 does not add up'));
    expect(document.store.getState().selection).toEqual(before);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('refuses Fix all while the score is locked, as the web does', () => {
    const document = withIssues(() => [issue({})]);
    const view = renderWithApp(
      <IssuesSheet open document={document} onClose={jest.fn()} />
    );
    const fix = () => view.getByRole('button', { name: 'editor.fixIssues' });
    expect(fix().props.accessibilityState?.disabled).not.toBe(true);
    // A job owns the score (the same lock playback takes).
    act(() => document.store.getState().setEditLocked(true));
    expect(fix().props.accessibilityState?.disabled).toBe(true);
  });
});
