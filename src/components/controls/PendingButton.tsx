/**
 * A button that turns into a spinner while the work it started is running —
 * `@sudobility/music_ui`'s `PendingButton`, under the same name and props.
 *
 * The rule: a CTA that starts something the reader has to wait for shows that
 * it is waiting, on itself, and cannot be pressed a second time meanwhile.
 *
 * The web needs a component for this because its library `Button` has no
 * loading state of its own. The native one does (`loading`: a spinner in place
 * of the label, the press refused, `busy` reported), so this is that button
 * with the web's two prop names on it, for a call site written against either
 * library:
 *
 * - `pending` is `loading`;
 * - `pendingLabel` is what the button says while pending — "Saving…". The web
 *   draws those words beside its spinner; here the spinner stands alone, so
 *   they are the button's accessible name for the wait. Omit it for an icon
 *   button, whose name stays as it was.
 *
 * There is no `ButtonSpinner` (the web's bare ring for raw `<button>`s that
 * cannot be a `PendingButton`): a native control that needs one uses `Spinner`
 * or `IconButton`'s own `loading`.
 */
import { forwardRef } from 'react';
import type { ElementRef } from 'react';
import { Button } from '@sudobility/components-rn';
import type { ButtonProps } from '@sudobility/components-rn';

export type PendingButtonProps = ButtonProps & {
  /** True while the work this button started is running. */
  pending?: boolean;
  /** What the button is called while pending, e.g. "Saving…". Omit for an icon button. */
  pendingLabel?: string;
};

export const PendingButton = forwardRef<
  ElementRef<typeof Button>,
  PendingButtonProps
>(function PendingButton(
  {
    pending = false,
    pendingLabel,
    loading,
    accessibilityLabel,
    onPress,
    children,
    ...rest
  },
  ref
) {
  const label = pending && pendingLabel ? pendingLabel : accessibilityLabel;
  return (
    <Button
      ref={ref}
      {...rest}
      loading={pending || loading === true}
      {...(label === undefined ? {} : { accessibilityLabel: label })}
      // `loading` already refuses a press; this also refuses one dispatched in
      // the same frame as the first, before the re-render lands.
      onPress={event => {
        if (pending) return;
        onPress?.(event);
      }}
    >
      {children}
    </Button>
  );
});
