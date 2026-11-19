/**
 * Adding one generated track to the open score.
 *
 * A prompt and an instrument, and nothing else — everything a track has to
 * agree with is taken from the score by `buildGenerateTrackRequest`: its
 * length, time signature, key and tempo. Offering those as fields would let a
 * reader ask for a track that cannot line up with the music it is meant to
 * accompany, and the result would be unusable rather than merely different.
 *
 * The instrument list is the shared catalogue: all 128 GM programs by family,
 * with the eight drum kits ahead of them. A kit is chosen as a kit rather than
 * as a program, because on a percussion track `midiProgram` names a kit and the
 * two never agree — Brush is 40 and program 40 is Violin. The list itself is
 * music_types' `generationInstrumentOptionsFlat({ voices: false })` — "the
 * Generate Track list" in its own words — rather than one assembled here from
 * the kits and families, which was the same list only for as long as nobody
 * edited either.
 *
 * **The request names its backend, as the web's does.** The web dialog hands
 * the chosen model to its caller, which tags the request with
 * `withGenerationVariant`; this sheet builds the request itself, so it tags it
 * here. Untagged, a request goes to the server's default backend — a different
 * one from the `generationVariant` preference's default that New Project and
 * Replace already send — so "add a track" was written by a different model
 * than everything else in the same project. The picker is drawn when the host
 * injects the device-prefs store the choice is remembered in.
 */
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FormModal, Input, Select, Text } from '@sudobility/components-rn';
import {
  estimateGenerateTrackCredits,
  DEFAULT_INSTRUMENT_VALUE,
  buildGenerateTrackRequest,
  instrumentChoiceFor,
} from '@sudobility/music_lib';
import type { GenerateTrackRequest } from '@sudobility/music_lib';
import {
  generationInstrumentOptionsFlat,
  withGenerationVariant,
} from '@sudobility/music_types';
import type { Score } from '@sudobility/music_types';
import { useGenerationModel } from './useGenerationModel';
import type { GenerationModelPrefsStore } from './useGenerationModel';

export type GenerateTrackSheetProps = {
  open: boolean;
  score: Score;
  onClose: () => void;
  onSubmit: (request: GenerateTrackRequest) => void;
  /**
   * The job is being started (the pending edit written, the job posted).
   * Generate spins and the sheet stays up, every way out refused, until the
   * server has answered.
   */
  submitting?: boolean;
  /**
   * The device-prefs store (the app's `devicePrefs`). With it the sheet offers
   * the web dialog's Model picker, seeded from and written back to the
   * `generationVariant` preference; without it there is no picker and the
   * request carries the default backend.
   */
  devicePrefs?: GenerationModelPrefsStore;
};

function ignore(): void {}

export function GenerateTrackSheet({
  open,
  score,
  onClose,
  onSubmit,
  submitting = false,
  devicePrefs,
}: GenerateTrackSheetProps) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [value, setValue] = useState(DEFAULT_INSTRUMENT_VALUE);
  const model = useGenerationModel(devicePrefs);
  // Kits first: they are addressed differently and must not be mistaken for
  // programs. No voices — this adds an accompanying part, not a singer.
  const instrumentOptions = useMemo(
    () => generationInstrumentOptionsFlat({ voices: false }),
    []
  );

  useEffect(() => {
    if (open) setPrompt('');
  }, [open]);

  const trimmed = prompt.trim();

  return (
    <FormModal
      visible={open}
      title={t('generateTrack.title')}
      onClose={submitting ? ignore : onClose}
      saving={submitting}
      closeAriaLabel={t('common.closeDialog')}
      actions={[
        {
          label: t('common.cancel'),
          onPress: onClose,
          variant: 'ghost',
          disabled: submitting,
        },
        {
          label: t('generate.action'),
          disabled: trimmed === '',
          loading: submitting,
          onPress: () =>
            onSubmit(
              withGenerationVariant(
                buildGenerateTrackRequest(
                  score,
                  trimmed,
                  instrumentChoiceFor(value)
                ),
                model.selected
              )
            ),
        },
      ]}
    >
      <>
        <Text className='text-muted-foreground pb-3 text-base'>
          {t('generateTrack.intro')}
        </Text>

        <View className='gap-1 pb-3'>
          <Text className='text-muted-foreground text-sm'>
            {t('generateTrack.promptLabel')}
          </Text>
          <Input
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={3}
            placeholder={t('generateTrack.promptPlaceholder')}
            accessibilityLabel={t('generateTrack.promptLabel')}
          />
        </View>

        <View className='gap-1 pb-3'>
          <Text className='text-muted-foreground text-sm'>
            {t('generate.instrument')}
          </Text>
          <Select
            value={value}
            accessibilityLabel={t('generate.instrument')}
            options={instrumentOptions}
            onValueChange={setValue}
          />
        </View>

        {model.choosable ? (
          <View className='gap-1 pb-3'>
            <Text className='text-muted-foreground text-sm'>
              {t('generateScore.model')}
            </Text>
            <Select
              value={model.selected}
              accessibilityLabel={t('generateScore.model')}
              options={model.providers.map(({ value: variant, label }) => ({
                value: variant,
                label,
              }))}
              onValueChange={model.setSelected}
            />
          </View>
        ) : null}

        {/* Every bar of the score, once: what the server bills for a new part. */}
        <Text className='text-muted-foreground text-sm'>
          {t('generate.estimate', {
            count: estimateGenerateTrackCredits(score),
          })}
        </Text>
      </>
    </FormModal>
  );
}
