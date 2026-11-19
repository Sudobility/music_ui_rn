/**
 * The confirm sheet, and the web library's `ConfirmDialog` over it.
 *
 * One sheet, two contracts. `ConfirmSheet` is the native one the apps call:
 * non-destructive unless told, and a confirm button only when there is
 * something to confirm. `ConfirmDialog` is the web's, under the web's name:
 * always a confirm, destructive unless told otherwise, `common.confirm` when
 * unlabelled.
 */
import { jest } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import { Button } from '@sudobility/components-rn';
import { renderWithApp } from '../../test/render';
import { ConfirmDialog, ConfirmSheet } from './ConfirmSheet';

/** The variant the design-system button behind a footer action was given. */
function variantOf(
  view: ReturnType<typeof renderWithApp>,
  label: string
): unknown {
  return view
    .UNSAFE_getAllByType(Button)
    .find(button => button.props.children === label)?.props.variant;
}

describe('ConfirmSheet', () => {
  it('is Cancel alone when there is nothing to confirm', () => {
    const view = renderWithApp(
      <ConfirmSheet
        open
        title='Out of credits'
        message='…'
        onCancel={jest.fn()}
      />
    );
    expect(view.getByRole('button', { name: 'common.cancel' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'common.confirm' })).toBeNull();
  });

  it('is not destructive unless told, which callers rely on', () => {
    const view = renderWithApp(
      <ConfirmSheet
        open
        title='Credits'
        message='…'
        confirmLabel='View credits'
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(variantOf(view, 'View credits')).toBe('primary');
  });

  it("takes the web dialog's cancelLabel", () => {
    const view = renderWithApp(
      <ConfirmSheet
        open
        title='Quit'
        message='…'
        cancelLabel='Keep editing'
        onCancel={jest.fn()}
      />
    );
    expect(view.getByRole('button', { name: 'Keep editing' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'common.cancel' })).toBeNull();
  });

  it('names the confirm button with busyLabel while the work runs', () => {
    const props = {
      open: true,
      title: 'Delete',
      message: '…',
      confirmLabel: 'Delete',
      busyLabel: 'Deleting…',
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    };
    const idle = renderWithApp(<ConfirmSheet {...props} />);
    expect(idle.queryByLabelText('Deleting…')).toBeNull();
    idle.unmount();
    const busy = renderWithApp(<ConfirmSheet {...props} busy />);
    expect(busy.getByLabelText('Deleting…')).toBeTruthy();
  });
});

describe('ConfirmDialog', () => {
  it('is destructive by default, as the web dialog is', () => {
    const view = renderWithApp(
      <ConfirmDialog
        open
        title='Delete track'
        message='…'
        confirmLabel='Delete'
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(variantOf(view, 'Delete')).toBe('destructive');
  });

  it('can be told it is not', () => {
    const view = renderWithApp(
      <ConfirmDialog
        open
        title='Generate again'
        message='…'
        confirmLabel='Generate'
        destructive={false}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(variantOf(view, 'Generate')).toBe('primary');
  });

  it('always has a confirm, labelled common.confirm when the caller gives none', () => {
    const onConfirm = jest.fn();
    const view = renderWithApp(
      <ConfirmDialog
        open
        title='Sure?'
        message='…'
        onConfirm={onConfirm}
        onCancel={jest.fn()}
      />
    );
    fireEvent.press(view.getByRole('button', { name: 'common.confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
