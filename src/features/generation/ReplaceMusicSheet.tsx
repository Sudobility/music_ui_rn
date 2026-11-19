/**
 * One sheet for all three Replace actions, parameterised by scope.
 *
 * Settings only. Submitting starts a background job and closes — there is no
 * candidate list and no accept step, because the result lands minutes later
 * when the person who asked for it is very likely elsewhere. That follows from
 * the job model rather than being a simplification of it.
 *
 * Absent on purpose: instrumentation, measure count, tempo, key and time
 * signature. All of those are fixed by the region being replaced, and a
 * disabled control that can never apply is worse than no control.
 *
 * The scopes differ in one way worth knowing: **Replace Notes is the region
 * deliberately not snapped to measures**. `prepareReplacement` handles that —
 * nothing here decides what a region is.
 *
 * **What will be overwritten is said first, as on the web.** Handed the
 * `region` (music_types' `replacementRegion`, the same value the web dialog
 * takes), the sheet opens on the web's summary line — how many notes, on which
 * track — and its warning when a non-contiguous selection is about to be
 * replaced as its bounding span, and Replace is live exactly when there is a
 * region. `canSubmit` is the older, blunter form of the same gate, kept for a
 * host that has not been moved over: it says nothing about what is replaced.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  FormModal,
  Input,
  Select,
  Switch,
  Text,
} from '@sudobility/components-rn';
import {
  GENERATE_SCORE_COMPLEXITY_OPTIONS,
  GENERATE_SCORE_MOOD_OPTIONS,
  NO_MARK,
  REPLACE_PRESET_KEYS,
  buildReplaceSubmission,
  complexityLabelKey,
  defaultReplaceSubmission,
  flatStyleOptions,
  labelledOptions,
  moodLabelKey,
  optionalFromPicker,
  optionalToPicker,
  replacePresetLabelKey,
  styleFamilyLabelKey,
  styleLabelKey,
} from '@sudobility/music_lib';
import type {
  GenerateScoreComplexity,
  ReplaceDraft,
} from '@sudobility/music_lib';
import type {
  ReplaceScope,
  ReplaceSubmission,
  ReplacementRegion,
} from '@sudobility/music_types';
import type { TFunction } from 'i18next';
import { hostKey } from '../../i18n/host-key';
import { useGenerationModel } from './useGenerationModel';
import type { GenerationModelPrefsStore } from './useGenerationModel';

export type { ReplaceSubmission } from '@sudobility/music_types';

export type ReplaceMusicSheetProps = {
  open: boolean;
  scope: ReplaceScope;
  /**
   * What will be overwritten — the web dialog's prop. `null` disables
   * submission; a region is summarised above the form. Omit it (rather than
   * passing `null`) only when gating on `canSubmit` instead.
   */
  region?: ReplacementRegion | null;
  /** Name of the track being replaced, for the summary line. */
  trackLabel?: string;
  /**
   * False when there is nothing to replace; disables submission. Superseded by
   * `region`, which carries the same answer and what it is an answer about;
   * ignored when `region` is given.
   *
   * @deprecated Pass `region`.
   */
  canSubmit?: boolean;
  onClose: () => void;
  onSubmit: (submission: ReplaceSubmission) => void;
  /**
   * The job is being started. Replace spins and the sheet stays up, every
   * way out refused, until the server has answered.
   */
  submitting?: boolean;
  /** The bars the region touches times its tracks: what the server bills. */
  estimatedCredits?: number;
  /**
   * The device-prefs store (the app's `devicePrefs`). With it the sheet offers
   * the web dialog's Model picker, seeded from and written back to the
   * `generationVariant` preference; without it there is no picker and the
   * request carries the default backend.
   */
  devicePrefs?: GenerationModelPrefsStore;
};

function ignore(): void {}

/**
 * What is about to be overwritten — the web dialog's `summarise`, word for
 * word: the counts pluralise through i18next rather than by appending an "s",
 * which only works in English.
 */
function summarise(
  region: ReplacementRegion,
  trackLabel: string | undefined,
  t: TFunction
): string {
  const tracks = region.range.trackIds.length;
  const where =
    trackLabel && tracks === 1
      ? t('replace.onTrack', { name: trackLabel })
      : t('replace.onTracks', { count: tracks });
  return t('replace.summary', { count: region.noteCount, where });
}

const TITLE_KEY: Record<ReplaceScope, string> = {
  notes: 'replace.notesTitle',
  measures: 'replace.measuresTitle',
  track: 'replace.trackTitle',
};

export function ReplaceMusicSheet({
  open,
  scope,
  region,
  trackLabel,
  canSubmit,
  onClose,
  onSubmit,
  submitting = false,
  estimatedCredits = 0,
  devicePrefs,
}: ReplaceMusicSheetProps) {
  const { t, i18n } = useTranslation();
  const model = useGenerationModel(devicePrefs);
  // The web's gate (`region !== null`) when the host hands the region over;
  // the older boolean otherwise.
  const replaceable =
    region !== undefined ? region !== null : canSubmit !== false;
  const instructionLabel = t(
    hostKey(i18n, 'replace.instruction', 'generate.prompt')
  );
  /*
    The form, and what it opens with, are music_lib's: the web's defaults —
    nothing preserved, `moderate` complexity, the default backend — so the same
    instruction over the same bars sends the same request from either device.
    This sheet used to open on "keep complexity" with boundary notes preserved,
    and offered half the preset list.
  */
  const [draft, setDraft] = useState<ReplaceDraft>(defaultReplaceSubmission);
  const patch = (next: Partial<ReplaceDraft>): void =>
    setDraft(current => ({ ...current, ...next }));
  const setConstraint = (
    key: keyof ReplaceDraft['constraints'],
    value: boolean
  ): void =>
    setDraft(current => ({
      ...current,
      constraints: { ...current.constraints, [key]: value },
    }));

  useEffect(() => {
    if (!open) return;
    // Reset per opening, and per scope: "simplify this passage" carried over
    // from a Replace Notes into a Replace Track is a different request than it
    // looks like. The backend is the remembered one, as on the web.
    setDraft({ ...defaultReplaceSubmission(), variant: model.selected });
    // `model.selected` is read at open, not tracked: choosing a model in the
    // open sheet writes the pref, and that must not reset the form under the
    // reader's hands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scope]);

  /*
    Null while the instruction is blank — which is also the rule for disabling
    Replace, so the button and the submission cannot disagree.
  */
  const submission = buildReplaceSubmission(draft);

  return (
    <FormModal
      visible={open}
      title={t(TITLE_KEY[scope])}
      onClose={submitting ? ignore : onClose}
      saving={submitting}
      size='large'
      closeAriaLabel={t('common.closeDialog')}
      actions={[
        {
          label: t('common.cancel'),
          onPress: onClose,
          variant: 'ghost',
          disabled: submitting,
        },
        {
          label: t('replace.action'),
          disabled: !replaceable || submission === null,
          loading: submitting,
          onPress: () => {
            if (replaceable && submission) onSubmit(submission);
          },
        },
      ]}
    >
      <>
        {region ? (
          <Text className='text-foreground pb-3 text-base'>
            {summarise(region, trackLabel, t)}
            {region.unselectedNoteCount > 0 ? (
              // Said up front rather than discovered afterwards: a
              // non-contiguous selection is replaced as its bounding span.
              <Text className='text-warning text-base'>
                {` ${t('replace.unselected', {
                  count: region.unselectedNoteCount,
                })}`}
              </Text>
            ) : null}
          </Text>
        ) : null}
        {estimatedCredits > 0 ? (
          <Text className='text-muted-foreground pb-3 text-sm'>
            {t('generate.estimate', { count: estimatedCredits })}
          </Text>
        ) : null}
        <Field label={instructionLabel}>
          <Input
            value={draft.instruction}
            onChangeText={instruction => patch({ instruction })}
            multiline
            numberOfLines={3}
            accessibilityLabel={instructionLabel}
          />
        </Field>

        {/*
          Choosing a preset fills the instruction with its text in the reader's
          language, which is then what the model is asked. Keys from music_lib,
          words from this app's locale — the same model New Project's briefs
          use. They were English literals, so a Chinese reader prompted in a
          language the rest of the form was not in.
        */}
        {/*
          The web's control, said the web's way: a button that reads "Presets"
          (`generate.presets`) and is named "Preset instructions" to assistive
          technology. It used to say "Preset instructions" twice — once as a
          field label and again as the control's own text.
        */}
        <View className='pb-3'>
          <Select
            value={NO_MARK}
            accessibilityLabel={t('replace.presetInstructions')}
            options={[
              { value: NO_MARK, label: t('generate.presets') },
              ...REPLACE_PRESET_KEYS.map(key => ({
                value: key,
                label: t(replacePresetLabelKey(key)),
              })),
            ]}
            onValueChange={value => {
              const key = REPLACE_PRESET_KEYS.find(k => k === value);
              if (key) patch({ instruction: t(replacePresetLabelKey(key)) });
            }}
          />
        </View>

        {/* Translated and sorted, with "none" pinned above — the raw values
            (`electroSwing`) were what this picker used to show. A native
            Select draws no headings, so each style names its family. */}
        <Field label={t('generateScore.style')}>
          <Select
            value={optionalToPicker(draft.style)}
            accessibilityLabel={t('generateScore.style')}
            options={flatStyleOptions(
              value => t(styleLabelKey(value)),
              family => t(styleFamilyLabelKey(family)),
              i18n.language,
              t('generateScore.noStyle')
            )}
            onValueChange={value => patch({ style: optionalFromPicker(value) })}
          />
        </Field>

        <Field label={t('generateScore.mood')}>
          <Select
            value={optionalToPicker(draft.mood)}
            accessibilityLabel={t('generateScore.mood')}
            options={labelledOptions(
              GENERATE_SCORE_MOOD_OPTIONS,
              value => t(moodLabelKey(value)),
              i18n.language,
              t('generateScore.noMood')
            )}
            onValueChange={value => patch({ mood: optionalFromPicker(value) })}
          />
        </Field>

        <Field label={t('generateScore.complexity')}>
          <Select
            value={draft.complexity}
            accessibilityLabel={t('generateScore.complexity')}
            options={GENERATE_SCORE_COMPLEXITY_OPTIONS.map(value => ({
              value,
              label: t(complexityLabelKey(value)),
            }))}
            onValueChange={value =>
              patch({ complexity: value as GenerateScoreComplexity })
            }
          />
        </Field>

        {model.choosable ? (
          <Field label={t('generateScore.model')}>
            <Select
              value={draft.variant}
              accessibilityLabel={t('generateScore.model')}
              options={model.providers.map(({ value, label }) => ({
                value,
                label,
              }))}
              onValueChange={variant => {
                patch({ variant });
                model.setSelected(variant);
              }}
            />
          </Field>
        ) : null}

        {/*
          All four start off, boundary notes included: each constraint removes
          a dimension the model was asked to work in, and a reader opting in is
          clearer than discovering one was on.
        */}
        <Toggle
          label={t('replace.preserveBoundary')}
          checked={draft.constraints.preserveBoundaryNotes}
          onChange={value => setConstraint('preserveBoundaryNotes', value)}
        />
        <Toggle
          label={t('replace.preserveHarmony')}
          checked={draft.constraints.preserveHarmony}
          onChange={value => setConstraint('preserveHarmony', value)}
        />
        <Toggle
          label={t('replace.preserveRhythm')}
          checked={draft.constraints.preserveRhythm}
          onChange={value => setConstraint('preserveRhythm', value)}
        />
        <Toggle
          label={t('replace.preserveMelody')}
          checked={draft.constraints.preserveMelody}
          onChange={value => setConstraint('preserveMelody', value)}
        />

        {!replaceable ? (
          <Text className='text-muted-foreground pt-2 text-sm'>
            {t('replace.nothingSelected')}
          </Text>
        ) : null}
      </>
    </FormModal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className='gap-1 pb-3'>
      <Text className='text-muted-foreground text-sm'>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <View className='flex-row items-center justify-between py-1'>
      <Text className='text-foreground flex-1 text-base'>{label}</Text>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        accessibilityLabel={label}
      />
    </View>
  );
}

/**
 * `@sudobility/music_ui`'s `ReplaceMusicDialog`: the same name over the same
 * sheet, with the web's gate — `region` is required, and `null` is what
 * disables Replace. (The web's `store` prop is where it reads the model
 * preference; here that is `devicePrefs`, the store the preference lives in.)
 */
export type ReplaceMusicDialogProps = Omit<
  ReplaceMusicSheetProps,
  'canSubmit' | 'region'
> & {
  /** What will be overwritten. `null` disables submission. */
  region: ReplacementRegion | null;
};

export function ReplaceMusicDialog(props: ReplaceMusicDialogProps) {
  return <ReplaceMusicSheet {...props} />;
}
