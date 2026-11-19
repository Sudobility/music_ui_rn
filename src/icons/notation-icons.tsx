/**
 * The notation glyphs under the names the web library exports them by.
 *
 * `@sudobility/music_ui` exports one component per glyph (`SharpIcon`,
 * `QuarterNoteIcon`, …) and `NOTATION_ICON_NAMES` in `@sudobility/music_types`
 * is that list of export names — the shared art is keyed by them. Here the one
 * `NotationIcon` draws any of them by `name`, which is what the toolbars use;
 * these are that component with the name filled in, so code written against
 * the web's surface reads the same on native.
 *
 * The one difference is the web/native icon asymmetry stated in both
 * libraries: a web glyph inherits `currentColor` and is sized by a class, while
 * `react-native-svg` resolves neither, so a native glyph is handed `color`
 * (from `useNotationInk`) and an optional `size`.
 *
 * Every name is written out rather than generated from the list, because an
 * export has to be static to be imported by name. `notation-icons.test.tsx`
 * holds this file to `NOTATION_ICON_NAMES`, both ways.
 */
import { memo } from 'react';
import type { NotationIconName } from '@sudobility/music_types';
import { NotationIcon } from './NotationIcon';
import type { NotationIconProps } from './NotationIcon';

/** A named glyph's props: `NotationIcon`'s, without the name it already is. */
export type NotationGlyphProps = Omit<NotationIconProps, 'name'>;

function glyph(name: NotationIconName) {
  const Glyph = memo(function Glyph(props: NotationGlyphProps) {
    return <NotationIcon name={name} {...props} />;
  });
  Glyph.displayName = name;
  return Glyph;
}

// --- durations ------------------------------------------------------------
export const WholeNoteIcon = glyph('WholeNoteIcon');
export const HalfNoteIcon = glyph('HalfNoteIcon');
export const QuarterNoteIcon = glyph('QuarterNoteIcon');
export const EighthNoteIcon = glyph('EighthNoteIcon');
export const SixteenthNoteIcon = glyph('SixteenthNoteIcon');
export const ThirtySecondNoteIcon = glyph('ThirtySecondNoteIcon');

// --- accidentals ----------------------------------------------------------
export const FlatIcon = glyph('FlatIcon');
export const DoubleFlatIcon = glyph('DoubleFlatIcon');
export const NaturalIcon = glyph('NaturalIcon');
export const SharpIcon = glyph('SharpIcon');
export const DoubleSharpIcon = glyph('DoubleSharpIcon');

// --- note modifiers and entry ---------------------------------------------
export const TieIcon = glyph('TieIcon');
export const ArticulationIcon = glyph('ArticulationIcon');
export const InsertNoteIcon = glyph('InsertNoteIcon');
export const AddMeasureIcon = glyph('AddMeasureIcon');
export const DeleteMeasureIcon = glyph('DeleteMeasureIcon');
export const DottedIcon = glyph('DottedIcon');
export const TripletIcon = glyph('TripletIcon');
export const InsertModeIcon = glyph('InsertModeIcon');
export const ReplaceModeIcon = glyph('ReplaceModeIcon');
export const ChordIcon = glyph('ChordIcon');
export const InsertRestIcon = glyph('InsertRestIcon');
export const SelectAllIcon = glyph('SelectAllIcon');
export const QuantizeIcon = glyph('QuantizeIcon');

// --- layout, app and transport --------------------------------------------
export const PageLayoutIcon = glyph('PageLayoutIcon');
export const TrackInfoIconIcon = glyph('TrackInfoIconIcon');
export const ContinuousLayoutIcon = glyph('ContinuousLayoutIcon');
export const MetronomeIcon = glyph('MetronomeIcon');
export const SunMoonIcon = glyph('SunMoonIcon');
export const PianoKeysIcon = glyph('PianoKeysIcon');
export const GoToStartIcon = glyph('GoToStartIcon');
export const PreviousMeasureIcon = glyph('PreviousMeasureIcon');
export const NextMeasureIcon = glyph('NextMeasureIcon');
export const SoloIcon = glyph('SoloIcon');

// --- phrasing and expression ----------------------------------------------
export const SlurIcon = glyph('SlurIcon');
export const FermataIcon = glyph('FermataIcon');
export const OrnamentIcon = glyph('OrnamentIcon');
export const CrescendoIcon = glyph('CrescendoIcon');
export const DiminuendoIcon = glyph('DiminuendoIcon');
export const ArpeggioIcon = glyph('ArpeggioIcon');
export const BeamBreakIcon = glyph('BeamBreakIcon');
export const BeamNoneIcon = glyph('BeamNoneIcon');
