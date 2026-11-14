/**
 * A row in a list that is pressed to choose it — a project, a template, a
 * format to import — and says so under the pointer.
 *
 * These rows were plain `Pressable`s with one background, which is right on
 * a phone: a finger covers what it touches, and the press is felt. On a
 * desktop the pointer hovers before it clicks, and a row that does not
 * change under it reads as a label rather than a control — and a click that
 * changes nothing on the way down reads as a click that missed, which is
 * what it looked like while a project took a moment to open.
 *
 * Hover and press are held as state rather than read from `Pressable`'s
 * style callback, so the classes stay NativeWind's and follow the theme.
 * `onHoverIn`/`onHoverOut` are never called where there is no pointer, so a
 * phone sees the pressed state alone.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import { MIN_TOUCH_TARGET, cn } from '@sudobility/components-rn';
import { useNotationInk } from '../../icons';

export type PressableCardProps = {
  /** The row's accessible name: what is being chosen. */
  label: string;
  onPress: () => void;
  children: ReactNode;
  /**
   * What can be done *to* the thing, under what choosing it does: a project's
   * Duplicate and Delete. Inside the card's frame and outside its pressable
   * part — a button inside a button is one a screen reader cannot reach, and
   * a press on Delete must not also open the project.
   */
  footer?: ReactNode;
  /**
   * What choosing the card started is under way: a spinner is drawn at the
   * card's trailing edge and the card refuses a second press (the assistive
   * activation with it) until it is done.
   */
  loading?: boolean;
  /** The card is drawn but refuses: another card's work is under way. */
  disabled?: boolean;
  /**
   * What the card is, to a screen reader. A card that opens something *in* the
   * app is a `'button'` (the default); one whose every press *leaves* the app —
   * an outbound link — is a `'link'`, so it is announced as a link and offers
   * the link gesture set. See the Resources screen's outbound tiles.
   */
  role?: 'button' | 'link';
  /** Spoken after the label: where choosing it leads. */
  accessibilityHint?: string;
  /**
   * Stretch to the height the card is given rather than to its content, so a
   * tile sharing a row with a taller one matches it instead of drawing short.
   * Honoured only without a `footer` — a footered card frames its own height —
   * and off by default, since a card in a vertical list wants its content's
   * height, not its container's.
   */
  fill?: boolean;
};

export function PressableCard({
  label,
  onPress,
  children,
  footer,
  loading = false,
  disabled = false,
  role = 'button',
  accessibilityHint,
  fill = false,
}: PressableCardProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const ink = useNotationInk();
  const inert = disabled || loading;
  const surface = (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy: loading }}
      onPress={onPress}
      disabled={inert}
      // macOS has no synthesized-touch fallback for an assistive press, so a
      // VoiceOver activation reaches a Pressable only through
      // `onAccessibilityTap` — `onPress` is a touch/mouse responder. Withheld
      // while inert, since `disabled` stops only the press pair.
      {...(inert ? {} : { onAccessibilityTap: onPress })}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => {
        setHovered(false);
        // A press dragged off the row never gets its `onPressOut` on every
        // platform, and a row left looking held down is worse than one that
        // let go a moment early.
        setPressed(false);
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={cn(
        footer ? 'p-3' : 'rounded-lg border p-3',
        fill && !footer && 'flex-1',
        pressed
          ? 'border-primary bg-primary/20'
          : hovered
            ? 'border-primary bg-primary/10'
            : footer
              ? 'bg-card'
              : 'border-border bg-card'
      )}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        opacity: disabled && !loading ? 0.5 : 1,
      }}
    >
      {loading ? (
        <View className='flex-row items-center gap-3'>
          <View className='flex-1'>{children}</View>
          <ActivityIndicator size='small' color={ink.foreground} />
        </View>
      ) : (
        children
      )}
    </Pressable>
  );
  if (!footer) return surface;
  return (
    // The frame is the card's, so the part that opens and the actions under
    // it read as one thing; the hover tint stays on the part that is pressed.
    // As tall as what it holds, and no `flex-1`: in a grid's row, whose
    // height comes from its tiles, that is a height of nothing, and every
    // row but the last drew as a line.
    <View
      className={cn(
        'bg-card overflow-hidden rounded-lg border',
        pressed || hovered ? 'border-primary' : 'border-border'
      )}
    >
      {surface}
      <View className='border-border flex-row items-center justify-end gap-1 border-t px-1'>
        {footer}
      </View>
    </View>
  );
}
