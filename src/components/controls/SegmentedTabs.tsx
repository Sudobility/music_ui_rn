/**
 * The inspector's one-of-N tab picker.
 *
 * The control itself — a real `UISegmentedControl` on iOS, a drawn
 * `NSSegmentedControl`-style strip on macOS, a tab row elsewhere — now lives in
 * `@sudobility/components-rn` as `SegmentedControl` (one design-system primitive
 * with a web twin, so both apps draw the same thing). This is the music wrapper:
 * it fixes the inspector's tight four-tab tuning (`px-2` on the Android tab-row
 * trigger; the native variants default to `px-1`), and keeps the `SegmentedTabs`
 * name and props the inspector already uses.
 */
import { SegmentedControl } from '@sudobility/components-rn';

export type SegmentedOption = {
  value: string;
  label: string;
};

export type SegmentedTabsProps = {
  /** The accessible name of the group — what these sections belong to. */
  label: string;
  options: readonly SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  /** Names the control for a test (the variants render different things). */
  testID?: string;
};

export function SegmentedTabs(props: SegmentedTabsProps) {
  return <SegmentedControl {...props} triggerClassName="px-2" />;
}
