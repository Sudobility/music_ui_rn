/**
 * The row that says a job owns this score — a generation, or the
 * transcription of a recording — while the notes it writes appear in the
 * score above.
 *
 * A generation is a job, not a request that resolves: `POST /jobs` returns as
 * soon as the row exists and the work happens afterwards — and the work is
 * streamed, part by part, into the score. So this is a strip rather than a
 * cover: the score is the point, and a reader who opened the project to watch
 * it must be able to see it. What must not happen underneath is an edit or a
 * play, and neither can — the store's edit lock refuses content commands, the
 * score's touch handlers are dropped, and the transport's Play is disabled.
 * The strip is what tells the reader why.
 *
 * Cancel is offered because it is cheap and honest: cancelling writes `ready`,
 * and the running job discards its result when it next looks — including
 * between chunks of a long one. The notes written so far stay.
 *
 * This is `@sudobility/music_ui`'s `GenerationStatusStrip`, and is exported
 * under that name too. `GenerationOverlay` and its `visible` prop are what is
 * left of the full-screen cover this once was; the web mounts the strip only
 * while a job runs, so `visible` defaults to true and a host may do the same.
 */
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Text } from '@sudobility/components-rn';
import { Spinner } from '../../components/controls';
import type {
  LiveGenerationProgress,
  ProjectStatus,
} from '@sudobility/music_types';
import type { LiveStatus } from '@sudobility/music_client';
import { hostKey } from '../../i18n/host-key';

/** The web strip's props, as the web names and types them. */
export type GenerationStatusStripProps = {
  /**
   * Which kind of job it is. The two lock the editor identically and stream
   * the same way; what differs is the sentence, since "generating" over a
   * recording somebody uploaded describes something that is not happening.
   */
  status?: ProjectStatus;
  onCancel: () => void;
  /** The stream's last progress note, when there is one. */
  progress?: LiveGenerationProgress | null;
  /** Where the live stream stands: only its troubles are worth a word. */
  live?: LiveStatus;
  /** Shown beside the heading when a job reported one. */
  error?: string | null;
};

export type GenerationOverlayProps = GenerationStatusStripProps & {
  /**
   * False renders nothing. Native-only, and optional: the web's strip has no
   * such prop because its host mounts it only while a job owns the project.
   */
  visible?: boolean;
};

export function GenerationOverlay({
  visible = true,
  status = 'generating',
  error,
  progress = null,
  live = 'off',
  onCancel,
}: GenerationOverlayProps) {
  const { t, i18n } = useTranslation();
  if (!visible) return null;
  const transcribing = status === 'transcribing';
  return (
    <View
      testID='generation-status-strip'
      accessibilityRole='summary'
      className='border-border bg-background flex-row flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2'
    >
      <Spinner />
      <Text className='text-foreground text-base'>
        {t(
          transcribing
            ? 'overlay.transcribingNotes'
            : // The web's heading, where the host carries it; the sibling
              // `overlay.transcribingNotes` beside it is already one key.
              hostKey(i18n, 'overlay.generatingNotes', 'generate.working')
        )}
      </Text>
      {progress ? (
        <Text className='text-muted-foreground text-sm'>
          {t('overlay.progress', {
            // A transcription's first stage splits the recording into
            // parts; "Planning" is what a generation does before it writes.
            stage:
              transcribing && progress.stage === 'plan'
                ? t('overlay.stage.separate')
                : t(`overlay.stage.${progress.stage}`),
            done: progress.done,
            total: progress.total,
            label: progress.label,
          })}
        </Text>
      ) : null}
      {live === 'reconnecting' ? (
        <Text className='text-muted-foreground text-sm'>
          {t('overlay.reconnecting')}
        </Text>
      ) : live === 'fallback' ? (
        <Text className='text-muted-foreground text-sm'>
          {t('overlay.polling')}
        </Text>
      ) : null}
      <Text className='text-muted-foreground text-sm'>
        {t('overlay.lockedWhileGenerating')}
      </Text>
      {error ? <Text className='text-destructive text-sm'>{error}</Text> : null}
      <View className='flex-1' />
      <Button variant='secondary' onPress={onCancel}>
        {t('common.cancel')}
      </Button>
    </View>
  );
}

/**
 * The same strip under the web library's name, with the web's props.
 *
 * A name of its own rather than a second implementation: one component, so the
 * two names cannot drift.
 */
export function GenerationStatusStrip(props: GenerationStatusStripProps) {
  return <GenerationOverlay {...props} />;
}
