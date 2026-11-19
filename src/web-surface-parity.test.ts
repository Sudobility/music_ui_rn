/**
 * This library exports what `@sudobility/music_ui` exports, or says why not.
 *
 * The two are meant to be one library drawn twice: the same names, taking the
 * same props, so that a screen written against one reads the same against the
 * other. Nothing held them to it. They were lifted out of two apps separately,
 * and by the time anybody counted, the native barrel carried 27 of the web's
 * 176 names — the rest existed under other names (`ConfirmSheet`), in other
 * shapes (one `NotationIcon` for the web's forty-two glyph components), in the
 * apps rather than here, or not at all.
 *
 * So the web barrel is read from the sibling checkout and every name in it has
 * to be accounted for, in one of four ways:
 *
 * - **exported here**, under the same name — the default, and nothing to list;
 * - **web-only by nature** (`WEB_ONLY`): CSS class strings, DOM/Radix
 *   composition, the browser's own print and file input. Each with its reason,
 *   and the native piece that does the same job where there is one;
 * - **here under a different shape** (`DIFFERENT_SHAPE`): the feature is in
 *   this library, split or named otherwise, and a same-name export would be a
 *   lie about its props. Each names where it lives;
 * - **not here yet** (`NOT_YET`): a real gap — in a native app rather than this
 *   library, or missing from the native product. Each says which, so the list
 *   is the to-do list and cannot quietly grow.
 *
 * A name added to the web barrel fails this until somebody decides which of
 * those it is. A name in a list that this library has since started exporting
 * fails too, so the lists cannot go stale in the other direction.
 *
 * Cross-repo, and only in this direction. If the sibling is not checked out the
 * suite skips rather than fails — a CI job with one repo has broken nothing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const WEB_ROOT = join(__dirname, '../../music_ui/src');
const NATIVE_ROOT = __dirname;
const haveWeb = existsSync(join(WEB_ROOT, 'index.ts'));

/** A module specifier, resolved the way a bundler would for these two trees. */
function resolveModule(from: string, specifier: string): string | null {
  const base = normalize(join(dirname(from), specifier));
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    join(base, 'index.ts'),
    join(base, 'index.tsx'),
  ];
  return candidates.find(candidate => existsSync(candidate)) ?? null;
}

/**
 * Every name a barrel exports, followed through its `export *` chains.
 *
 * Source-scanned rather than read from the built `.d.ts`: the web's `dist` may
 * not be built, and this must run from a clean checkout of both.
 */
function exportedNames(entry: string): Set<string> {
  const seen = new Map<string, Set<string>>();
  const walk = (file: string): Set<string> => {
    const known = seen.get(file);
    if (known) return known;
    const names = new Set<string>();
    seen.set(file, names);
    const source = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const match of source.matchAll(/export\s+\*\s+from\s+'([^']+)'/g)) {
      const specifier = match[1]!;
      if (!specifier.startsWith('.')) continue;
      const target = resolveModule(file, specifier);
      if (target) for (const name of walk(target)) names.add(name);
    }
    for (const match of source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
      for (const part of match[1]!.split(',')) {
        const name = part
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)
          .pop();
        if (name) names.add(name);
      }
    }
    for (const match of source.matchAll(
      /^export\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|class|type|interface|enum)\s+([A-Za-z0-9_$]+)/gm
    ))
      names.add(match[1]!);
    return names;
  };
  return walk(entry);
}

/**
 * Web exports that are web-only by nature, each with its reason.
 *
 * "By nature" is narrow: the thing is made of the DOM, of CSS, or of a browser
 * API. A feature that merely has not been built natively goes in `NOT_YET`.
 */
const WEB_ONLY: Record<string, string> = {
  // CSS class strings for the web's own controls. NativeWind styles are
  // written at the call site here; a class constant tuned for a DOM `<input>`
  // or a Radix trigger means nothing to a native control.
  AS_TYPED_INPUT_CLASS: 'CSS: undoes the theme uppercasing the web <input>',
  CONTROL_HEIGHT_CLASS: 'CSS: action-bar control height; IconButton owns it',
  CONTROL_INK_CLASS: 'CSS: action-bar ink; glyphs take useNotationInk()',
  ICON_CONTROL_CLASS: 'CSS: icon-only control box; IconButton owns it',
  ICON_GLYPH_CLASS: 'CSS: glyph size; NotationIcon takes `size`',
  TEXT_CONTROL_CLASS: 'CSS: text control box; IconButton/ToolbarSelect own it',
  FIELD_HEIGHT_CLASS: 'CSS: inspector field height; FieldRow/FieldSlot own it',
  FIELD_LABEL_CLASS: 'CSS: inspector label; Field owns it',
  SELECT_CLASS: 'CSS: Radix select trigger',
  TEXT_INPUT_CLASS: 'CSS: inspector <input>',
  GROOVE_CLASS: 'CSS: painted slider groove; LevelSlider is native',
  THUMB_CLASS: 'CSS: ::-webkit-slider-thumb',
  TRACK_BASE_CLASS: 'CSS: painted slider track',
  TRACK_CLASS: 'CSS: painted slider track',
  SliderShell:
    'DOM <input type=range> under painted divs; LevelSlider/PositionSlider',
  SliderShellProps: 'see SliderShell',
  ButtonSpinner: 'bare ring for raw <button>s; Spinner / IconButton loading',
  // Radix `Select` takes its options as children; the native Select takes an
  // `options` array, built from the same shared lists.
  InstrumentSelectItems:
    'Radix Select children; generationInstrumentOptionsFlat()',
  StyleSelectItems: 'Radix Select children; flatStyleOptions()',
  // The browser's own machinery.
  prefersReducedMotion:
    'media query, read for DOM smooth-scroll; the native score never animates a scroll',
  FileImportModal:
    'hidden <input type=file>; native apps use the OS file picker',
  FileImportModalProps: 'see FileImportModal',
  PrintView:
    'a routed page over window.print(); PrintSheet + the app print service',
  PrintViewProps: 'see PrintView',
  PrintSystem:
    'DOM canvas per printed system; drawn per page by the app print service',
  PrintSystemProps: 'see PrintSystem',
  ScoreContextMenu:
    'menu positioned at pointer x/y; ScoreActionsSheet (same model and actions)',
  ScoreContextMenuProps: 'see ScoreContextMenu',
  EditorCanvasSurface: 'DOM canvas surface seam of ScoreEditorView',
  EditorCanvasSurfaceOptions: 'see EditorCanvasSurface',
  AutoscrollDelta: 'pointer-drag autoscroll seam of ScoreEditorView',
};

/** Web exports whose feature is in this library under another shape. */
const DIFFERENT_SHAPE: Record<string, string> = {
  // The web inspector exports its field components; here each tab is a
  // component and the fields are its rows, over `Field` / `DraftInput`.
  MIXED:
    'inspector: mixed is `null` from music_types commonValue / noteInspectorModel',
  MIXED_VALUE: 'inspector: Select placeholder carries "Mixed"',
  MixedOr: 'inspector: see MIXED',
  commonValue: 'inspector: music_types commonValue (T | null), not re-exported',
  ACCIDENTAL_PICKER:
    'inspector: music_types ACCIDENTAL_OPTIONS (words, by design)',
  MixedSelect: 'inspector: components-rn Select with a "Mixed" placeholder',
  MixedNumberField: 'inspector: NumberDraftInput',
  MixedCheckbox: 'inspector: Switch rows (TieToggle in NoteTab)',
  CommitSlider: 'inspector: VolumeSlider/PanSlider with onCommit',
  BarBeatField: 'inspector: NoteTab (bar/beat rows)',
  FingeringField: 'inspector: NoteTab',
  ChordSymbolField: 'inspector: NoteTab',
  PickupField: 'inspector: MeasureTab',
  BarlineField: 'inspector: MeasureTab',
  NavigationFields: 'inspector: MeasureTab',
  MeasureClefField: 'inspector: MeasureTab',
  RepeatFields: 'inspector: MeasureTab',
  MeasureTempoField: 'inspector: MeasureTab',
  PianoKeyboardView:
    'KeyboardPanel + PianoKeyboard (takes `document` and a measured `height`)',
  PianoKeyboardViewProps: 'see PianoKeyboardView',
  GenerateTrackDialog:
    'GenerateTrackSheet (builds the request itself from `score`; the web caller builds it)',
  GenerateTrackDialogProps: 'see GenerateTrackDialog',
  ScoreEditorView:
    'ScrollingScore + EditorToolbar here; the composing half is still in the apps',
  ScoreEditorViewProps: 'see ScoreEditorView',
};

/** Web exports with no counterpart in this library yet, and where the gap is. */
const NOT_YET: Record<string, string> = {
  // In the native apps, not lifted into this library.
  AppLayout:
    'app-side: music_app_rn AppLayout + EditorScreen (and the player copy)',
  AppLayoutProps: 'see AppLayout',
  Toasts: 'app-side: features/toasts/Toasts.tsx (one app-wide queue)',
  ToastsProps: 'see Toasts',
  MidiImportWizard:
    'app-side: features/documents/MidiImportSheet.tsx (no preview step)',
  MidiImportWizardProps: 'see MidiImportWizard',
  MidiImportApi: 'see MidiImportWizard',
  TrackerFitDialog:
    'app-side: inlined in ExportSheet; needs @sudobility/music_codecs as a peer here',
  TrackerFitDialogProps: 'see TrackerFitDialog',
  ShortcutHelpDialog:
    'app-side: features/shortcuts/ShortcutsSheet.tsx (grouped, no docs link)',
  ShortcutHelpDialogProps: 'see ShortcutHelpDialog',
  CreateSnapshotDialog: 'app-side: features/snapshots/SnapshotSheets.tsx',
  CreateSnapshotDialogProps: 'see CreateSnapshotDialog',
  OpenSnapshotDialog: 'app-side: features/snapshots/SnapshotSheets.tsx',
  OpenSnapshotDialogProps: 'see OpenSnapshotDialog',
  ManagePublishedDialog:
    'app-side: inlined in features/snapshots/SnapshotsPanel.tsx',
  ManagePublishedDialogProps: 'see ManagePublishedDialog',
  // Missing from the native product.
  MusicXmlImportDialog:
    'missing: native imports in one step, warnings shown afterwards',
  MusicXmlImportDialogProps: 'see MusicXmlImportDialog',
  useEditorShortcuts:
    'missing: no hardware-keyboard editing natively (menu key equivalents only)',
  PlaybackToggle: 'see useEditorShortcuts',
};

const ACCOUNTED = { ...WEB_ONLY, ...DIFFERENT_SHAPE, ...NOT_YET };

(haveWeb ? describe : describe.skip)('the web library’s public surface', () => {
  const web = () => exportedNames(join(WEB_ROOT, 'index.ts'));
  const native = () => exportedNames(join(NATIVE_ROOT, 'index.ts'));

  it('is exported here name for name, or accounted for', () => {
    const here = native();
    const unaccounted = [...web()]
      .filter(name => !here.has(name) && ACCOUNTED[name] === undefined)
      .sort();
    expect(unaccounted).toEqual([]);
  });

  it('has no entry for a name this library now exports', () => {
    const here = native();
    const settled = Object.keys(ACCOUNTED)
      .filter(name => here.has(name))
      .sort();
    expect(settled).toEqual([]);
  });

  it('has no entry for a name the web no longer exports', () => {
    const there = web();
    const stale = Object.keys(ACCOUNTED)
      .filter(name => !there.has(name))
      .sort();
    expect(stale).toEqual([]);
  });

  it('files each name under one heading only', () => {
    const lists = [WEB_ONLY, DIFFERENT_SHAPE, NOT_YET].map(Object.keys);
    const all = lists.flat();
    expect(all.length).toBe(new Set(all).size);
  });

  it('shares more than half of the web surface outright', () => {
    // 27 of 176 when this was written, before the names were mirrored. A floor
    // rather than an exact count, so adding a mirror never fails this.
    const here = native();
    const shared = [...web()].filter(name => here.has(name));
    expect(shared.length).toBeGreaterThanOrEqual(99);
  });
});
