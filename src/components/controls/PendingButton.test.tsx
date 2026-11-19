/**
 * The web library's `PendingButton`, on the native button's own `loading`.
 */
import { jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import { PendingButton } from './PendingButton';

describe('PendingButton', () => {
  it('is an ordinary button when nothing is pending', () => {
    const onPress = jest.fn();
    const view = render(<PendingButton onPress={onPress}>Save</PendingButton>);
    const button = view.getByRole('button', { name: 'Save' });
    expect(button.props.accessibilityState?.busy).not.toBe(true);
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('says it is waiting, by name, and refuses a press while pending', () => {
    const onPress = jest.fn();
    const view = render(
      <PendingButton onPress={onPress} pending pendingLabel='Saving…'>
        Save
      </PendingButton>
    );
    const button = view.getByLabelText('Saving…');
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps an icon button its own name while pending', () => {
    const view = render(
      <PendingButton pending accessibilityLabel='Export' onPress={jest.fn()}>
        glyph
      </PendingButton>
    );
    expect(view.getByLabelText('Export')).toBeTruthy();
  });
});
