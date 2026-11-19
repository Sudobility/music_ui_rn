/**
 * Asks whether an export should carry the hidden tracks —
 * `@sudobility/music_ui`'s `ExportScopeDialog`, prop for prop.
 *
 * Only shown when some are hidden. A file that quietly omits parts is hard to
 * notice until it matters, and silently exporting everything would equally
 * surprise somebody who hid tracks precisely to extract a subset — so the
 * question is asked exactly when the two answers differ, and never otherwise.
 * (That rule is music_editing's `exportScopeNeedsPrompt`; the host asks it.)
 *
 * Each native app carried a copy of this sheet of its own — one drawn by hand,
 * one on `ChoiceSheet` — and neither had the web's `busy`: the sheet closed and
 * the wait was shown elsewhere. It is here so there is one, with the web's
 * props, for both to use.
 */
import { View } from 'react-native';
import { FormModal, Text } from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import type { ExportScope } from '@sudobility/music_types';
import { hostHasKey } from '../../i18n/host-key';

// The same two answers music_types names; the web dialog exports the type too.
export type { ExportScope } from '@sudobility/music_types';

export type ExportScopeDialogProps = {
  open: boolean;
  /** How many tracks would be left out. Never 0 while `open` — see the module doc. */
  hiddenCount: number;
  onChoose: (scope: ExportScope) => void;
  onCancel: () => void;
  /**
   * The scope being exported, while the file is written: that button spins,
   * the other refuses a press, and the sheet stays up until it is done.
   */
  busy?: ExportScope | null;
};

function ignore(): void {}

export function ExportScopeDialog({
  open,
  hiddenCount,
  onChoose,
  onCancel,
  busy = null,
}: ExportScopeDialogProps) {
  const { t, i18n } = useTranslation();
  const working = busy !== null;
  const choose = (scope: ExportScope): void => {
    if (!working) onChoose(scope);
  };
  /*
    The web's button reads "Exporting…" beside its spinner. This one draws the
    spinner alone, so the words are its accessible name for the wait — where
    the host carries them.
  */
  const exporting = hostHasKey(i18n, 'common.exporting')
    ? { accessibilityLabel: t('common.exporting') }
    : {};
  return (
    <FormModal
      visible={open}
      title={t('exportScope.title')}
      // Android's Back reaches `onClose` whatever `saving` says.
      onClose={working ? ignore : onCancel}
      size='small'
      closeAriaLabel={t('common.closeDialog')}
      saving={working}
      actions={[
        {
          label: t('common.cancel'),
          onPress: onCancel,
          variant: 'ghost',
          disabled: working,
        },
        {
          label: t('exportScope.visibleOnly'),
          onPress: () => choose('visible'),
          variant: 'secondary',
          disabled: working && busy !== 'visible',
          loading: busy === 'visible',
          ...(busy === 'visible' ? exporting : {}),
        },
        {
          label: t('print.wholeScore'),
          onPress: () => choose('all'),
          variant: 'primary',
          disabled: working && busy !== 'all',
          loading: busy === 'all',
          ...(busy === 'all' ? exporting : {}),
        },
      ]}
    >
      <View className='p-1'>
        <Text className='text-foreground text-base'>
          {t('exportScope.hiddenCount', { count: hiddenCount })}
        </Text>
      </View>
    </FormModal>
  );
}

/** The name the native apps' own copies go by, for a drop-in replacement. */
export const ExportScopeSheet = ExportScopeDialog;
export type ExportScopeSheetProps = ExportScopeDialogProps;
