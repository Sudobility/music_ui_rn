/**
 * A yes/no question about something that cannot be undone by looking away.
 *
 * The web app's `ConfirmDialog`, which uses `actions` rather than `FormModal`'s
 * `onSave` shorthand for one reason: the shorthand renders a single full-width
 * CTA and **cannot be destructive**, and the whole point of this component is
 * that its confirm button is usually the dangerous one.
 *
 * `closeAriaLabel` is not optional here. The top-bar × is named "Cancel" by
 * default, this footer already has a Cancel, and two controls with one
 * accessible name are ambiguous read aloud and a strict-mode failure in tests.
 */
import { View } from 'react-native';
import { FormModal, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';

export type ConfirmSheetProps = {
  open: boolean;
  title: string;
  message: string;
  /**
   * A quieter line under the message — a rate, a caveat, the fine print. Drawn
   * muted and smaller, so it reads as a footnote to the question rather than a
   * second question.
   */
  secondaryMessage?: string;
  /**
   * The confirm button's label. Optional, together with `onConfirm`: a sheet
   * that only states something and offers a way out — a refusal with no action
   * to take — passes neither, and then Cancel is the only button. (A sheet with
   * a confirm is the usual case; this is the degenerate one.)
   */
  confirmLabel?: string;
  /** Paints the confirm button as the dangerous answer. */
  destructive?: boolean;
  /**
   * The confirmed work is under way. The confirm button spins, and nothing on
   * the sheet — confirm, Cancel or the × — answers until it is done: the sheet
   * stays up so the reader sees the wait on the control they pressed.
   */
  busy?: boolean;
  onConfirm?: () => void;
  onCancel: () => void;
};

function ignore(): void {}

export function ConfirmSheet({
  open,
  title,
  message,
  secondaryMessage,
  confirmLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const { t } = useTranslation();
  // The confirm button exists only when there is something to confirm; without
  // it the sheet is Cancel alone, a stated fact with a way out.
  const confirmAction =
    confirmLabel && onConfirm
      ? [
          {
            label: confirmLabel,
            onPress: onConfirm,
            variant: destructive
              ? ('destructive' as const)
              : ('primary' as const),
            loading: busy,
          },
        ]
      : [];
  return (
    <FormModal
      visible={open}
      title={title}
      // Android's Back reaches `onClose` whatever `saving` says.
      onClose={busy ? ignore : onCancel}
      saving={busy}
      actions={[
        {
          label: t('common.cancel'),
          onPress: onCancel,
          variant: 'ghost' as const,
          disabled: busy,
        },
        ...confirmAction,
      ]}
      closeAriaLabel={t('common.closeDialog')}
    >
      <View className='gap-2 p-1'>
        <Text className='text-foreground text-base'>{message}</Text>
        {secondaryMessage ? (
          <Text className='text-muted-foreground text-sm'>
            {secondaryMessage}
          </Text>
        ) : null}
      </View>
    </FormModal>
  );
}
