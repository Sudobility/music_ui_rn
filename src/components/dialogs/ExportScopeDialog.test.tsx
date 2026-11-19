/**
 * The hidden-tracks question, with the web dialog's props.
 */
import { jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import { renderWithApp } from '../../test/render';
import { withHostStrings } from '../../test/host-strings';
import { ExportScopeDialog } from './ExportScopeDialog';

function setup(props: Partial<Parameters<typeof ExportScopeDialog>[0]> = {}) {
  const onChoose = jest.fn();
  const onCancel = jest.fn();
  const view = renderWithApp(
    <ExportScopeDialog
      open
      hiddenCount={3}
      onChoose={onChoose}
      onCancel={onCancel}
      {...props}
    />
  );
  const button = (name: string) => view.getByRole('button', { name });
  return { view, onChoose, onCancel, button };
}

describe('ExportScopeDialog', () => {
  it('asks with the two answers and a way out', () => {
    const { view, onChoose, onCancel, button } = setup();
    expect(view.getByText('exportScope.hiddenCount')).toBeTruthy();
    fireEvent.press(button('exportScope.visibleOnly'));
    expect(onChoose).toHaveBeenLastCalledWith('visible');
    fireEvent.press(button('print.wholeScore'));
    expect(onChoose).toHaveBeenLastCalledWith('all');
    fireEvent.press(button('common.cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('holds every answer while the chosen one is being written', () => {
    const { onChoose, onCancel, button } = setup({ busy: 'all' });
    fireEvent.press(button('exportScope.visibleOnly'));
    fireEvent.press(button('print.wholeScore'));
    fireEvent.press(button('common.cancel'));
    expect(onChoose).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('names the working button "Exporting…" once the host has the words', () => {
    const restore = withHostStrings({ 'common.exporting': 'Exporting…' });
    try {
      const { view } = setup({ busy: 'visible' });
      expect(view.getByLabelText('Exporting…')).toBeTruthy();
    } finally {
      restore();
    }
  });
});
