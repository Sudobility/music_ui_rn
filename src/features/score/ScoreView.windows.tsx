/**
 * Windows score surface: the base and the lit-notes overlay, each a
 * windows_canvas_rn picture replayed natively in one Direct2D pass.
 *
 * Transparent, as the Skia view is: the app's background shows through, so a
 * dark theme's light notation is not drawn on white.
 */
import { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { CanvasPicture } from '@sudobility/windows_canvas_rn';
import { useSignal } from './useScoreCanvas';
import type { ScoreFrame, Signal } from './useScoreCanvas.windows';

export type ScoreViewProps = {
  picture: Signal<ScoreFrame | null>;
  height: number;
};

export function ScoreView({ picture: pictureSignal, height }: ScoreViewProps) {
  const picture = useSignal(pictureSignal);
  // How long a frame takes to get here is part of how far ahead the player
  // publishes the lit notes; see `ScoreFrame.committed`.
  useLayoutEffect(() => {
    picture?.committed();
  }, [picture]);
  return (
    <View style={[styles.fill, { height }]}>
      {picture ? (
        <>
          {/* `CanvasPicture` is memoised on the picture object, and the base
              object is kept while only the lit notes change: the base view
              is not redrawn during playback. */}
          <CanvasPicture picture={picture.base} style={[styles.layer, { height }]} />
          <CanvasPicture
            picture={picture.overlay}
            style={[styles.layer, { height }]}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, width: '100%' },
  // Explicit height, not `absoluteFillObject`: on React Native Windows 0.85 a
  // top:0/bottom:0 pair no longer resolves to a height for a native view, so
  // the picture view got a 1264x0 frame and `PictureView::Draw` early-returned
  // (the score was blank while the explicitly-sized Spatial LineScene drew).
  // left:0/right:0 still gives the width.
  layer: { position: 'absolute', top: 0, left: 0, right: 0 },
});
