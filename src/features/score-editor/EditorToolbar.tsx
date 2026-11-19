/**
 * The editing bar, mirroring the web app's — control for control.
 *
 * Same controls in the same order, divided the same way — music_types'
 * `TOOLBAR_CONTROLS` order: tracks (with voice recording beside Add Track),
 * then note value with its dotted/triplet modifiers, then accidentals, then
 * articulation and ornament with the tie beside them, then the edit modes and
 * everything that writes or marks a note (insert note, slur, hairpins,
 * arpeggio, beams, fermata, note input, insert rest), then quantize, then
 * voice, then the rare actions behind a menu. Zoom, layout, track info, pitch
 * display and the inspector toggle follow, set apart because they change how
 * you look at the score rather than the score itself.
 *
 * That is the wide bar. A compact window keeps the note-entry essentials on the
 * bar and gathers the rest into a "more tools" sheet, a row per group — the
 * same controls (each is defined once below), arranged for a phone.
 *
 * Not here yet, and on the web bar: the line-drawing toggle (draw a melody
 * left to right), which needs a score gesture this library does not have.
 *
 * **Several choices are a picker, not a row of chips**, and that is the single
 * biggest difference from what this file used to be. Six note values, five
 * accidentals, five articulations, five ornaments and four quantize grids came
 * to twenty-five chips — a bar three screens wide, where the web's is one. Each
 * of those is a `ToolbarSelect` with one glyph on the trigger and the words in
 * the sheet, exactly as the web draws its `Select`s, and for the same reason:
 * five near-identical marks are unreadable as a row of 18px glyphs.
 *
 * **Every action is `music_editing`'s.** `chooseDuration`, `changeAccidental`,
 * `toggleTie` and the rest each enforce rules about a score — a hairpin needs
 * two notes, a fermata reads whether the whole selection already has one — and
 * those rules belong in the library, not in a toolbar. This file decides only
 * what is offered, in what order, and when it is available.
 *
 * **Availability is music_editing's `selectToolbarAvailability`**, the same
 * function the web bar reads, so the two cannot disagree about when a
 * glissando can be written. It used to be copied from the web by hand, thirty
 * `canEdit && …` expressions that agreed only because nobody had changed
 * either bar since — and the More menu had already parted: only its Glissando
 * entry knew about the transport, so Add Bar, Delete Bar and Enter Lyrics were
 * live mid-playback and did nothing. The same goes for the few controls that
 * are more than one call: Insert Note (`insertDefaultNoteAtCaret`), quantize
 * (`quantizeSelectionToGrid`), the More menu (`EDITOR_MORE_ACTIONS` /
 * `runMoreAction`), the add-track answers (`addTrackChoices` /
 * `runAddTrackChoice`) and the edit modes (`EDIT_MODE_OPTIONS`).
 */
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useStore } from 'zustand';
import { useTranslation } from 'react-i18next';
import { Text, useFormFactor } from '@sudobility/components-rn';
import { ControlsSheet } from '../../components/controls';
import type { ControlRow } from '../../components/controls';
import { useContainerSize } from '../layout';
import { barsCompact } from '../layout';
import {
  addTrackChoices,
  changeAccidental,
  changeArticulation,
  changeBeam,
  changeOrnament,
  chooseDuration,
  chooseEditMode,
  editModeHintKey,
  goToBarFromInput,
  insertBlankMeasuresAtCaret,
  insertDefaultNoteAtCaret,
  insertRestAtSelection,
  quantizeSelectionToGrid,
  runAddTrackChoice,
  runMoreAction,
  selectEffectiveEditMode,
  selectSelectedNotes,
  selectSelectedTrack,
  selectToolbarAvailability,
  toggleArpeggiate,
  toggleFermata,
  toggleHairpin,
  toggleSlur,
  toggleTie,
  voiceHintKey,
  zoomIn,
  zoomOut,
} from '@sudobility/music_editing';
import {
  ACCIDENTAL_ICON,
  ACCIDENTAL_OPTIONS,
  ARTICULATION_OPTIONS,
  BASE_DURATIONS,
  DURATION_ICON,
  NO_MARK,
  ORNAMENT_OPTIONS,
  barCount as scoreBarCount,
  durationDisplay,
  durationParts,
  isVocalInstrumentValue,
  withBase,
  withModifier,
} from '@sudobility/music_types';
import type {
  Accidental,
  Articulation,
  BaseDuration,
  NotationIconName,
  Ornament,
} from '@sudobility/music_types';
import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  PencilIcon,
  PlusIcon,
} from 'react-native-heroicons/solid';
import { NotationIcon } from '../../icons';
import { useNotationInk } from '../../icons';
import { IconButton } from '../../components/layout/IconButton';
import { ToolbarSelect } from '../../components/controls';
import type { ToolbarOption } from '../../components/controls';
import { ChoiceSheet } from './ChoiceSheet';
import { GoToBarSheet } from './GoToBarSheet';
import { InsertBarsSheet } from './InsertBarsSheet';
import type { InsertBarsSheetResult } from './InsertBarsSheet';
import type { ReactNode } from 'react';
import type { MusicDocument } from '../../types';
import type { DevicePrefsStore } from '@sudobility/music_lib';
import {
  EDIT_MODE_OPTIONS,
  EDITOR_MORE_ACTIONS,
  EDITOR_VOICE_COUNT,
  QUANTIZE_GRIDS,
  QUANTIZE_GRID_SHORT,
} from '@sudobility/music_types';
import type {
  AddTrackChoice,
  EditorMoreAction,
  QuantizeGrid,
} from '@sudobility/music_types';
import type { LayoutMode } from '@sudobility/music_types';
import { usePendingAction } from '../../components/controls';
import { hostKey } from '../../i18n/host-key';

const ICON_SIZE = 18;

/*
  Which glyph each note value, accidental and edit mode draws is music_types'
  (`DURATION_ICON`, `ACCIDENTAL_ICON`, `EDIT_MODE_OPTIONS`)
  — records keyed by the vocabulary, shared with the web bar. This file held
  three lists of its own that agreed with the web's only because nobody had
  redrawn one. `NOTATION_ICONS` holds the shapes, so a semiquaver here is the
  same drawing as a semiquaver there; Unicode was the shortcut, and it does not
  work — the multi-codepoint musical characters draw as `?`.
*/

/**
 * The quantize grids' names — the web bar's table, key for key. A `Record`, so
 * a fifth grid fails to compile here.
 */
const QUANTIZE_GRID_LABEL_KEY: Record<QuantizeGrid, string> = {
  quarter: 'importMidi.gridQuarter',
  eighth: 'importMidi.gridEighth',
  sixteenth: 'importMidi.gridSixteenth',
  thirtysecond: 'importMidi.gridThirtySecond',
};

export type EditorToolbarProps = {
  document: MusicDocument;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  /** Starts lyric entry on the active track. Omitted in isolation tests. */
  onEnterLyrics?: () => void;
  /**
   * Shows or hides the property sheet. Omitted when the bar is rendered
   * without a surrounding layout, in which case no toggle shows — the web
   * bar's rule.
   */
  onToggleInspector?: () => void;
  /** Whether the property sheet is showing — the web bar's prop. */
  inspectorOpen?: boolean;
  /**
   * The same thing under this library's earlier name. `inspectorOpen` wins
   * when both are given.
   *
   * @deprecated Pass `inspectorOpen`.
   */
  inspectorVisible?: boolean;
  /**
   * Asks the server for one more track.
   *
   * Beside Add Track rather than in the title bar: both add a part, and the
   * only difference is who writes the notes.
   */
  onGenerateTrack?: () => void;
  /**
   * Starts AI generation for the newly inserted bars. Answers once the job
   * has been posted; the insert sheet waits on it with its button spinning.
   */
  onGenerateInsertedBars?: () => void | Promise<void>;
  onVoiceTranscriptionJob?: (
    projectId: string,
    cancel: () => void,
    progress?: {
      stage: 'plan' | 'part' | 'section' | 'chunk';
      label: string;
      done: number;
      total: number;
    }
  ) => void;
  /** The device-prefs store (the app's `devicePrefs`), injected: track-info and pitch-display toggles read and write it. */
  devicePrefs: DevicePrefsStore;
  /** Renders the voice-record control (MediaRecorder + transcription stay app-side), injected by the host. */
  renderVoiceRecord?: (opts: {
    document: MusicDocument;
    onTranscriptionJob: EditorToolbarProps['onVoiceTranscriptionJob'];
  }) => ReactNode;
};

export function EditorToolbar({
  document,
  layoutMode,
  onLayoutModeChange,
  onEnterLyrics,
  onToggleInspector,
  inspectorOpen,
  inspectorVisible: inspectorVisibleLegacy,
  onGenerateTrack,
  onGenerateInsertedBars,
  onVoiceTranscriptionJob,
  devicePrefs,
  renderVoiceRecord,
}: EditorToolbarProps) {
  const { t, i18n } = useTranslation();
  const ink = useNotationInk();
  const store = document.store;
  const inspectorVisible = inspectorOpen ?? inspectorVisibleLegacy ?? false;
  const score = useStore(store, s => s.score);
  const snapGrid = useStore(store, s => s.snapGrid);
  const effectiveEditMode = useStore(store, selectEffectiveEditMode);
  const zoom = useStore(store, s => s.zoom);
  const noteInput = useStore(store, s => s.noteInput);
  const pitchDisplay = useStore(store, s => s.pitchDisplay);
  const trackInfo = useStore(devicePrefs, s => s.trackInfo);
  const activeVoiceIndex = useStore(store, s => s.activeVoiceIndex);
  const selectedNotes = useStore(store, selectSelectedNotes);
  const activeTrack = useStore(store, selectSelectedTrack);
  /*
    Which controls can be used right now. Reference-stable while no answer
    changes, so this re-renders on a transition only — not one of the
    high-frequency reads that must stay out of a component's top level.
  */
  const available = useStore(store, selectToolbarAvailability);
  const lyricsDisabled =
    !available.enterLyrics ||
    activeTrack === null ||
    !isVocalInstrumentValue(String(activeTrack.midiProgram));

  // The bar collapses to the note-entry essentials plus a "…" sheet in a
  // compact window — always on a phone, and on a tablet/desktop whose window is
  // narrow (an iPad split view, a small Mac window) — and shows every control
  // inline when there is room. Measured from the bar's own width, so it follows
  // a window resize rather than being decided by the device.
  const { size: barSize, onLayout: onBarLayout } = useContainerSize();
  const compact = barsCompact(useFormFactor(), barSize.width);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [quantizeGrid, setQuantizeGrid] = useState<QuantizeGrid>('sixteenth');
  const [goToBarOpen, setGoToBarOpen] = useState(false);
  const [addTrackOpen, setAddTrackOpen] = useState(false);
  const [insertBarsOpen, setInsertBarsOpen] = useState(false);
  // Insert-and-generate and Quantize both answer later than the press; each
  // spins on its own control and refuses a second press meanwhile.
  const inserting = usePendingAction();
  const quantizing = usePendingAction();

  /*
    The mode a write will actually use: stack on a part that cannot play a
    chord reads as replace (asked through the *track*, because a drum track's
    program is a kit — Brush sits at 40, the Violin address).

    Shown, never written back. The library's write paths (`insertNoteAtCaret`,
    `paste`) read the effective mode themselves, so the stored choice survives a
    visit to a part that cannot stack: Stack chosen on a piano is still Stack
    after selecting a flute and coming back. This bar used to overwrite the
    stored mode from an effect, which is what lost that choice.
  */

  /**
   * What the one duration control shows: the armed length with nothing
   * selected, the selection's own length when they agree, "…" when they do not.
   */
  const durationShown = useMemo(
    () => durationDisplay(selectedNotes, score?.ppq ?? 480, snapGrid),
    [selectedNotes, score?.ppq, snapGrid]
  );

  // music_types' count, so this and every other surface agree on which track's
  // grid is the score's.
  const barCount = scoreBarCount(score);

  const zoomLabel = `${Math.round(zoom * 100)}%`;

  const durationOptions: ToolbarOption[] = BASE_DURATIONS.map(value => ({
    value,
    label: t(`duration.${value}`),
    icon: DURATION_ICON[value],
  }));

  /*
    The values and their copy keys come from music_types, so a sixth accidental
    reaches this bar without anybody editing it; only the *glyph* is the app's,
    since a drawing is not something a vocabulary can carry.
  */
  const accidentalOptions: ToolbarOption[] = ACCIDENTAL_OPTIONS.map(option => ({
    value: String(option.value),
    label: t(option.labelKey),
    icon: ACCIDENTAL_ICON[option.value],
  }));

  const articulationOptions: ToolbarOption[] = ARTICULATION_OPTIONS.map(
    option => ({ value: option.value, label: t(option.labelKey) })
  );

  /*
    `ORNAMENT_CODE` in the renderer crosses `mordent`/`inverted-mordent` over,
    because VexFlow's two codes are the reverse of the words a musician uses.
    Nothing about that belongs here — this offers the words, and even the
    kebab-to-camel spelling of the key is the library's, so this bar and the
    property sheet cannot spell it differently.
  */
  const ornamentOptions: ToolbarOption[] = ORNAMENT_OPTIONS.map(option => ({
    value: option.value,
    label: t(option.labelKey),
  }));

  /*
    Each grid by the web menu's own words ("Sixteenth", the `importMidi.grid*`
    keys both apps carry), after the short form the trigger shows, so the row
    and the glyph it sets can be told to be the same thing. The words were
    `duration.*` ("16th") — a different key for the same entry.
  */
  const quantizeOptions: ToolbarOption[] = QUANTIZE_GRIDS.map(grid => ({
    value: grid,
    label: `${QUANTIZE_GRID_SHORT[grid]} — ${t(QUANTIZE_GRID_LABEL_KEY[grid])}`,
  }));

  /*
    The rare ones live behind a menu, exactly as the web bar's "More actions"
    does: each is a real action, but none is reached often enough to be worth
    permanent width. Which entries, in what order and when each is available
    are music_editing's (`EDITOR_MORE_ACTIONS`, each naming the toolbar control
    whose availability it takes) — so an entry is greyed here exactly when it
    is on the web, and `runMoreAction` re-checks as it runs, because a sheet
    can outlive the moment the transport started under it.
  */
  const moreOptions: ToolbarOption[] = EDITOR_MORE_ACTIONS.map(action => ({
    value: action.value,
    label: t(action.labelKey),
    ...(action.value === 'enter-lyrics'
      ? { disabled: lyricsDisabled }
      : available[action.control]
        ? {}
        : { disabled: true }),
  }));

  const handleMoreAction = (value: string): void => {
    runMoreAction(store, value as EditorMoreAction, {
      goToBar: () => setGoToBarOpen(true),
      ...(onEnterLyrics ? { enterLyrics: onEnterLyrics } : {}),
      addMeasure: () => setInsertBarsOpen(true),
    });
  };

  const insertBars = (result: InsertBarsSheetResult): void =>
    void inserting.run(async () => {
      try {
        const inserted = insertBlankMeasuresAtCaret(
          store,
          result.count,
          result.position
        );
        if (!inserted || !result.generate || !onGenerateInsertedBars) return;
        const nextScore = store.getState().score;
        const measureIds =
          nextScore?.tracks.flatMap(track =>
            track.measures
              .slice(inserted.startIndex, inserted.startIndex + inserted.count)
              .map(measure => measure.id)
          ) ?? [];
        store.getState().selectMeasures(measureIds);
        await onGenerateInsertedBars();
      } finally {
        setInsertBarsOpen(false);
      }
    });

  // Each control, defined once and placed either on the bar or in the "more
  // tools" sheet (a phone), so the two arrangements cannot drift.
  const addTrackControl = (
    <IconButton
      label={t('editor.addTrack')}
      disabled={!available.addTrack}
      onPress={() => setAddTrackOpen(true)}
    >
      <PlusIcon size={ICON_SIZE} color={ink.foreground} />
    </IconButton>
  );
  const noteDurationControl = (
    <ToolbarSelect
      label={t('editor.noteDuration')}
      // A selection of different lengths gets the web's own hint for it —
      // "pick one to make them all match" — where the host carries the string;
      // the "…" on the trigger said that something was mixed, not what to do.
      hint={t(
        durationShown.kind === 'mixed'
          ? hostKey(
              i18n,
              'editor.mixedDurationsHint',
              'editor.noteDurationHint'
            )
          : 'editor.noteDurationHint'
      )}
      options={durationOptions}
      {...(durationShown.kind === 'mixed' ? {} : { value: durationShown.base })}
      disabled={!available.noteDuration}
      onChange={value =>
        chooseDuration(store, withBase(snapGrid, value as BaseDuration))
      }
    >
      {durationShown.kind === 'mixed' ? (
        <Text className='text-foreground text-base'>…</Text>
      ) : (
        <NotationIcon
          name={DURATION_ICON[durationShown.base]}
          color={ink.foreground}
        />
      )}
    </ToolbarSelect>
  );
  const durationModifierControls = (
    <Group label={t('editor.durationModifier')}>
      <GlyphChip
        icon='DottedIcon'
        label={t('editor.dotted')}
        hint={t('editor.dottedHint')}
        disabled={!available.dotted}
        selected={durationParts(snapGrid).modifier === 'dotted'}
        onPress={() => chooseDuration(store, withModifier(snapGrid, 'dotted'))}
      />
      <GlyphChip
        icon='TripletIcon'
        label={t('editor.triplet')}
        hint={t('editor.tripletHint')}
        disabled={!available.triplet}
        selected={durationParts(snapGrid).modifier === 'triplet'}
        onPress={() => chooseDuration(store, withModifier(snapGrid, 'triplet'))}
      />
    </Group>
  );
  const accidentalControl = (
    <ToolbarSelect
      label={t('editor.accidental')}
      hint={t('editor.accidentalHint')}
      options={accidentalOptions}
      disabled={!available.accidental}
      onChange={value => changeAccidental(store, Number(value) as Accidental)}
    >
      <NotationIcon name='SharpIcon' color={ink.foreground} />
    </ToolbarSelect>
  );
  const articulationControl = (
    <ToolbarSelect
      label={t('editor.articulation')}
      hint={t('editor.articulationHint')}
      options={articulationOptions}
      disabled={!available.articulation}
      onChange={value =>
        changeArticulation(
          store,
          value === NO_MARK ? undefined : (value as Articulation)
        )
      }
    >
      <NotationIcon name='ArticulationIcon' color={ink.foreground} />
    </ToolbarSelect>
  );
  const ornamentControl = (
    <ToolbarSelect
      label={t('editor.ornament')}
      hint={t('editor.ornamentHint')}
      options={ornamentOptions}
      disabled={!available.ornament}
      onChange={value =>
        changeOrnament(
          store,
          value === NO_MARK ? undefined : (value as Ornament)
        )
      }
    >
      <NotationIcon name='OrnamentIcon' color={ink.foreground} />
    </ToolbarSelect>
  );
  /*
    The marks, one chip each, in music_types' `TOOLBAR_CONTROLS` order — which
    is the web bar's. Defined singly because the two arrangements place them
    differently: the wide bar sets them out in that one sequence, as the web
    does (they are peers there, under no group name of their own), and the
    compact sheet gathers them into rows.
  */
  const tieChip = (
    <GlyphChip
      icon='TieIcon'
      label={t('editor.toggleTie')}
      hint={t('editor.toggleTie')}
      disabled={!available.tie}
      onPress={() => toggleTie(store, 'tieStart')}
    />
  );
  const slurChip = (
    <GlyphChip
      icon='SlurIcon'
      label={t('editor.slur')}
      hint={t('editor.slurHint')}
      disabled={!available.slur}
      onPress={() => toggleSlur(store)}
    />
  );
  const crescendoChip = (
    <GlyphChip
      icon='CrescendoIcon'
      label={t('editor.crescendo')}
      hint={t('editor.crescendoHint')}
      disabled={!available.crescendo}
      onPress={() => toggleHairpin(store, 'crescendo')}
    />
  );
  const diminuendoChip = (
    <GlyphChip
      icon='DiminuendoIcon'
      label={t('editor.diminuendo')}
      hint={t('editor.diminuendoHint')}
      disabled={!available.diminuendo}
      onPress={() => toggleHairpin(store, 'diminuendo')}
    />
  );
  const arpeggiateChip = (
    <GlyphChip
      icon='ArpeggioIcon'
      label={t('editor.arpeggiate')}
      hint={t('editor.arpeggiateHint')}
      disabled={!available.arpeggiate}
      onPress={() => toggleArpeggiate(store)}
    />
  );
  const fermataChip = (
    <GlyphChip
      icon='FermataIcon'
      label={t('editor.fermata')}
      hint={t('editor.fermataHint')}
      disabled={!available.fermata}
      onPress={() => toggleFermata(store)}
    />
  );
  const beamBreakChip = (
    <GlyphChip
      icon='BeamBreakIcon'
      label={t('editor.beamBreak')}
      hint={t('editor.beamBreakHint')}
      disabled={!available.beamBreak}
      onPress={() => changeBeam(store, 'break')}
    />
  );
  const beamNoneChip = (
    <GlyphChip
      icon='BeamNoneIcon'
      label={t('editor.beamNone')}
      hint={t('editor.beamNoneHint')}
      disabled={!available.beamNone}
      onPress={() => changeBeam(store, 'none')}
    />
  );
  // The compact sheet's rows: the same chips, gathered.
  const markControls = (
    <Group label={t('editor.articulation')}>
      {tieChip}
      {slurChip}
      {crescendoChip}
      {diminuendoChip}
      {arpeggiateChip}
      {fermataChip}
    </Group>
  );
  const beamControls = (
    <Group label={t('editor.beamBreak')}>
      {beamBreakChip}
      {beamNoneChip}
    </Group>
  );
  const editModeControls = (
    <Group label={t('editor.editMode')}>
      {EDIT_MODE_OPTIONS.map(mode => (
        <GlyphChip
          key={mode.value}
          icon={mode.icon}
          label={t(mode.labelKey)}
          hint={t(editModeHintKey(mode.value, available.stackMode), {
            instrument:
              activeTrack?.instrumentName ?? t('editor.thisInstrument'),
          })}
          selected={effectiveEditMode === mode.value}
          disabled={!available[`${mode.value}Mode`]}
          onPress={() => chooseEditMode(store, mode.value)}
        />
      ))}
    </Group>
  );
  const insertNoteChip = (
    <GlyphChip
      icon='InsertNoteIcon'
      label={t('editor.insertNote')}
      hint={t('editor.insertNoteHint')}
      disabled={!available.insertNote}
      onPress={() => insertDefaultNoteAtCaret(store)}
    />
  );
  const insertRestChip = (
    <GlyphChip
      icon='InsertRestIcon'
      label={t('editor.insertRest')}
      hint={t('editor.insertRestHint')}
      disabled={!available.insertRest}
      onPress={() => insertRestAtSelection(store)}
    />
  );
  // The compact sheet's row for the two.
  const insertControls = (
    <Group label={t('editor.insertNote')}>
      {insertNoteChip}
      {insertRestChip}
    </Group>
  );
  const voiceRecordControl = renderVoiceRecord?.({
    document,
    onTranscriptionJob: onVoiceTranscriptionJob,
  });
  const noteInputControl = (
    <IconButton
      label={t('editor.noteInput')}
      hint={t('editor.noteInputHint')}
      selected={noteInput}
      disabled={!available.noteInput}
      onPress={() => store.getState().setNoteInput(!noteInput)}
    >
      <PencilIcon
        size={ICON_SIZE}
        color={noteInput ? ink.primary : ink.foreground}
      />
    </IconButton>
  );
  const quantizeControls = (
    <Group label={t('editor.quantizeGrid')}>
      <ToolbarSelect
        label={t('editor.quantizeGrid')}
        hint={t('editor.quantizeGridHint')}
        options={quantizeOptions}
        value={quantizeGrid}
        disabled={!available.quantizeGrid}
        onChange={value => setQuantizeGrid(value as QuantizeGrid)}
      >
        <Text className='text-foreground text-sm'>
          {QUANTIZE_GRID_SHORT[quantizeGrid]}
        </Text>
      </ToolbarSelect>
      <GlyphChip
        icon='QuantizeIcon'
        label={t('editor.quantize')}
        hint={t('editor.quantizeHint')}
        disabled={!available.quantize}
        loading={quantizing.pending}
        onPress={() =>
          void quantizing.run(() =>
            quantizeSelectionToGrid(store, quantizeGrid)
          )
        }
      />
    </Group>
  );
  const voiceControls = (
    <Group label={t('editor.voice')}>
      {Array.from({ length: EDITOR_VOICE_COUNT }, (_, index) => (
        <TextChip
          key={index}
          label={String(index + 1)}
          name={t('editor.voiceNumber', { number: index + 1 })}
          hint={t(voiceHintKey(index))}
          selected={activeVoiceIndex === index}
          disabled={!available.voice}
          onPress={() => store.getState().setActiveVoice(index)}
        />
      ))}
    </Group>
  );
  const moreControl = (
    <ToolbarSelect
      label={t('editor.moreActions')}
      options={moreOptions}
      disabled={!available.moreActions}
      onChange={handleMoreAction}
    >
      <EllipsisHorizontalIcon size={ICON_SIZE} color={ink.foreground} />
    </ToolbarSelect>
  );
  const zoomControls = (
    <View
      accessibilityLabel={t('editor.currentZoom')}
      className='flex-row items-center gap-0.5'
    >
      <IconButton
        label={t('editor.zoomOut')}
        onPress={() => store.getState().setZoom(zoomOut(zoom))}
      >
        <MagnifyingGlassMinusIcon size={ICON_SIZE} color={ink.foreground} />
      </IconButton>
      <View className='w-16'>
        <Text className='text-foreground text-center text-sm'>{zoomLabel}</Text>
      </View>
      <IconButton
        label={t('editor.zoomIn')}
        onPress={() => store.getState().setZoom(zoomIn(zoom))}
      >
        <MagnifyingGlassPlusIcon size={ICON_SIZE} color={ink.foreground} />
      </IconButton>
    </View>
  );
  const layoutControls = (
    <Group label={t('editor.layoutMode')}>
      <GlyphChip
        icon='PageLayoutIcon'
        label={t('editor.pageLayout')}
        hint={t('editor.pageHint')}
        selected={layoutMode === 'page'}
        onPress={() => onLayoutModeChange('page')}
      />
      <GlyphChip
        icon='ContinuousLayoutIcon'
        label={t('editor.continuousLayout')}
        hint={t('editor.continuousHint')}
        selected={layoutMode === 'continuous'}
        onPress={() => onLayoutModeChange('continuous')}
      />
    </Group>
  );
  const trackInfoControl = (
    <GlyphChip
      icon='TrackInfoIconIcon'
      label={
        trackInfo === 'icon'
          ? t('editor.trackInfoFull')
          : t('editor.trackInfoIcon')
      }
      hint={t('editor.trackInfoHint')}
      selected={trackInfo === 'icon'}
      onPress={() =>
        devicePrefs
          .getState()
          .setTrackInfo(trackInfo === 'icon' ? 'full' : 'icon')
      }
    />
  );
  const pitchControl = (
    <TextChip
      label={t(
        pitchDisplay === 'written'
          ? 'editor.pitchWrittenShort'
          : 'editor.pitchConcertShort'
      )}
      name={
        pitchDisplay === 'written'
          ? t('editor.showConcertPitch')
          : t('editor.showWrittenPitch')
      }
      hint={t('editor.pitchDisplayHint')}
      selected={pitchDisplay === 'written'}
      onPress={() =>
        devicePrefs
          .getState()
          .setPitchDisplay(pitchDisplay === 'written' ? 'concert' : 'written')
      }
    />
  );
  // No handler, no toggle: a bar rendered without a layout around it has no
  // property sheet to show or hide — the web bar's rule.
  const inspectorControl = onToggleInspector ? (
    <IconButton
      label={t('editor.toggleInspector')}
      hint={
        inspectorVisible ? t('editor.hideInspector') : t('editor.showInspector')
      }
      selected={inspectorVisible}
      onPress={onToggleInspector}
    >
      {inspectorVisible ? (
        <ChevronDoubleRightIcon size={ICON_SIZE} color={ink.primary} />
      ) : (
        <ChevronDoubleLeftIcon size={ICON_SIZE} color={ink.foreground} />
      )}
    </IconButton>
  ) : null;

  // The modals that the controls open — shared by both arrangements.
  const sheets = (
    <>
      <ChoiceSheet
        open={addTrackOpen}
        title={t('editor.addTrack')}
        message={t('editor.addTrackPrompt')}
        choices={addTrackChoices({
          canGenerate: onGenerateTrack !== undefined,
        }).map((choice, index) => ({
          value: choice.value,
          label: t(choice.labelKey),
          detail: t(choice.hintKey),
          ...(index === 0 ? { primary: true } : {}),
          ...(choice.disabled ? { disabled: true } : {}),
        }))}
        onChoose={(choice: AddTrackChoice) => {
          setAddTrackOpen(false);
          runAddTrackChoice(store, choice, {
            ...(onGenerateTrack ? { generateTrack: onGenerateTrack } : {}),
          });
        }}
        onCancel={() => setAddTrackOpen(false)}
      />
      <GoToBarSheet
        open={goToBarOpen}
        barCount={barCount}
        onClose={() => setGoToBarOpen(false)}
        onGo={text => goToBarFromInput(store, text)}
      />
      <InsertBarsSheet
        open={insertBarsOpen}
        onClose={() => setInsertBarsOpen(false)}
        onSubmit={insertBars}
        submitting={inserting.pending}
      />
    </>
  );

  if (compact) {
    /*
      A compact window keeps the note-entry essentials on the bar — add a track,
      the note value, note input and accidentals — plus the inspector toggle,
      and moves everything else into a "more tools" sheet so the full-size
      controls fit without three rows of wrapping.
    */
    const toolRows: ControlRow[] = [
      {
        key: 'duration-modifier',
        label: t('editor.durationModifier'),
        control: durationModifierControls,
      },
      {
        key: 'insert',
        label: t('editor.insertNote'),
        control: insertControls,
      },
      {
        key: 'articulation',
        label: t('editor.articulation'),
        control: articulationControl,
      },
      {
        key: 'ornament',
        label: t('editor.ornament'),
        control: ornamentControl,
      },
      { key: 'marks', label: t('editor.slur'), control: markControls },
      { key: 'beam', label: t('editor.beamBreak'), control: beamControls },
      {
        key: 'edit-mode',
        label: t('editor.editMode'),
        control: editModeControls,
      },
      // Only where the host offers recording: without `renderVoiceRecord`
      // this was a row named "Record voice" with nothing in it.
      ...(voiceRecordControl
        ? [
            {
              key: 'voice-record',
              label: t('editor.recordVoice'),
              control: voiceRecordControl,
            },
          ]
        : []),
      {
        key: 'quantize',
        label: t('editor.quantizeGrid'),
        control: quantizeControls,
      },
      { key: 'voice', label: t('editor.voice'), control: voiceControls },
      { key: 'more', label: t('editor.moreActions'), control: moreControl },
      { key: 'zoom', label: t('editor.currentZoom'), control: zoomControls },
      {
        key: 'layout',
        label: t('editor.layoutMode'),
        control: layoutControls,
      },
      {
        key: 'track-info',
        label: t('editor.trackInfoHint'),
        control: trackInfoControl,
      },
      {
        key: 'pitch',
        label: t('editor.pitchDisplayHint'),
        control: pitchControl,
      },
    ];
    return (
      <View
        accessibilityRole='toolbar'
        accessibilityLabel={t('editor.toolbar')}
        onLayout={onBarLayout}
        className='bg-card flex-row items-center gap-1 px-2 py-1'
      >
        {addTrackControl}
        {noteDurationControl}
        {noteInputControl}
        {accidentalControl}
        <IconButton
          label={t('editor.moreActions')}
          onPress={() => setMoreToolsOpen(true)}
        >
          <EllipsisHorizontalIcon size={ICON_SIZE} color={ink.foreground} />
        </IconButton>
        <View className='flex-1' />
        {inspectorControl}
        <ControlsSheet
          open={moreToolsOpen}
          title={t('editor.moreActions')}
          onClose={() => setMoreToolsOpen(false)}
          rows={toolRows}
        />
        {sheets}
      </View>
    );
  }

  return (
    <View
      accessibilityRole='toolbar'
      accessibilityLabel={t('editor.toolbar')}
      onLayout={onBarLayout}
      // A wide window has room for every control, so they all show inline (no
      // "more tools" sheet); it wraps to a second row only if the window is a
      // little narrow, and collapses to the compact arrangement once it crosses
      // the size-class threshold.
      className='bg-card flex-row flex-wrap items-center gap-1 px-2 py-1'
    >
      {/*
        The web bar's sequence, control for control — music_types'
        `TOOLBAR_CONTROLS` order, with the dividers where the web draws them:
        tracks ¦ note value ¦ accidental ¦ articulation, ornament, tie ¦ the
        edit modes and everything that writes or marks a note ¦ quantize ¦
        voices ¦ more. Voice recording sits with Add Track, as there: both add
        a part. (This bar had the edit modes after the marks, the fermata
        ahead of the beams and Insert Rest ahead of Note Input.)
      */}
      {addTrackControl}
      {voiceRecordControl}
      <Divider />
      {noteDurationControl}
      {durationModifierControls}
      <Divider />
      {accidentalControl}
      <Divider />
      {articulationControl}
      {ornamentControl}
      {tieChip}
      <Divider />
      {editModeControls}
      {insertNoteChip}
      {slurChip}
      {crescendoChip}
      {diminuendoChip}
      {arpeggiateChip}
      {beamBreakChip}
      {beamNoneChip}
      {fermataChip}
      {noteInputControl}
      {insertRestChip}
      <Divider />
      {quantizeControls}
      <Divider />
      {voiceControls}
      <Divider />
      {moreControl}
      {/* The view controls: these change how you look at the score, not the
          score itself. A left divider sets them apart from the tools. */}
      <View className='border-border flex-row items-center gap-0.5 border-l pl-1'>
        {zoomControls}
        {layoutControls}
        {trackInfoControl}
        {pitchControl}
      </View>
      {inspectorControl ? (
        <View className='flex-row shrink-0 items-center pr-1'>
          {inspectorControl}
        </View>
      ) : null}
      {sheets}
    </View>
  );
}

/**
 * Several controls that belong together, under one name.
 *
 * The web writes `role="group"`, which binds them for a screen reader without
 * claiming to be a control itself. React Native has no counterpart, so this is
 * a labelled view: the name is there for anything that walks the tree, and the
 * role is deliberately left off rather than borrowed from something this is
 * not. The toolbar role sits on the scroller, once, as the web puts it on the
 * bar rather than on each group.
 */
function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View accessibilityLabel={label} className='flex-row items-center gap-1'>
      {children}
    </View>
  );
}

function Divider() {
  return <View className='bg-border mx-1 h-6 w-px' />;
}

/** A toolbar control showing one notation glyph. */
function GlyphChip({
  icon,
  label,
  hint,
  selected = false,
  disabled = false,
  loading = false,
  onPress,
}: {
  icon: NotationIconName;
  label: string;
  hint?: string;
  selected?: boolean;
  disabled?: boolean;
  /** The chip's work is under way: it spins and refuses a second press. */
  loading?: boolean;
  onPress: () => void;
}) {
  const ink = useNotationInk();
  return (
    <IconButton
      label={label}
      {...(hint ? { hint } : {})}
      selected={selected}
      disabled={disabled}
      loading={loading}
      onPress={onPress}
    >
      <View className={selected ? 'bg-primary rounded p-0.5' : 'rounded p-0.5'}>
        {/*
          The colour is passed rather than inherited: `currentColor` is an SVG
          idea react-native-svg does not resolve, so a glyph that relied on it
          would draw black on a selected chip's dark background — and would stay
          black in dark mode, which is what `useNotationInk` fixes.
        */}
        <NotationIcon
          name={icon}
          color={selected ? ink.onPrimary : ink.foreground}
        />
      </View>
    </IconButton>
  );
}

/** A toolbar control showing a word — for the two the web also spells out. */
function TextChip({
  label,
  name,
  hint,
  selected = false,
  disabled = false,
  onPress,
}: {
  /** The word drawn on the chip. */
  label: string;
  /** Its accessible name, when the drawn word is not one (`Wrt`). */
  name?: string;
  hint?: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <IconButton
      label={name ?? label}
      {...(hint ? { hint } : {})}
      selected={selected}
      disabled={disabled}
      onPress={onPress}
    >
      {/*
        Two complete class strings rather than one with a hole in it: Tailwind
        extracts classes by scanning source text, so an interpolated variant
        never appears whole in the file and is silently never generated.
      */}
      <View className={selected ? 'bg-primary rounded px-1' : 'rounded px-1'}>
        <Text
          className={
            selected
              ? 'text-primary-foreground text-sm'
              : 'text-foreground text-sm'
          }
        >
          {label}
        </Text>
      </View>
    </IconButton>
  );
}
