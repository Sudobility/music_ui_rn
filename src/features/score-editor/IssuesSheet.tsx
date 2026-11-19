/**
 * What is wrong with the score, and what can be put right automatically.
 *
 * The issues themselves come from `validateScore`, which the store recomputes
 * on every change — a bar that does not add up, a note past the last barline, a
 * chord thicker than the instrument can play. Nothing here decides what an
 * issue is.
 *
 * **Fix all reports what actually left the list, not what was attempted.**
 * Several rules — how many notes sound at once, most obviously — have no repair
 * that is not a guess about the music, so "fixed everything" over a list that
 * still has entries in it is a lie the reader can see. `repairAllIssues`
 * answers with both numbers for exactly that reason, and does the whole sweep
 * as one undoable step.
 *
 * **What those numbers mean is music_editing's `repairIssuesOutcome`**, shared
 * with the web: which sentence the toast reads, and whether the list closes.
 * This sheet used to decide the second half itself and never said anything,
 * so a press that repaired nothing looked exactly like a press that did not
 * register. The toast goes through the document store's `pushToast`, which
 * reaches the app's one queue whichever tab raised it.
 *
 * **An issue is a place in the score, and pressing it goes there** — the web
 * list's `navigateToIssue`, on the same three ids in the same order: the note
 * the issue names if it is still there, else its bar, else its track; then the
 * list closes so the selection it just made is visible. The rows were plain
 * text here, so a reader was told bar 14 was wrong and left to find bar 14.
 *
 * **Fix all is refused while the score is locked** — playing, or owned by a
 * job — as the web's is: a repair is a content edit the store would decline, so
 * the button says so rather than ending in a "fixed nothing" toast.
 */
import { Pressable, View } from 'react-native';
import { useStore } from 'zustand';
import { useTranslation } from 'react-i18next';
import { FormModal, Text } from '@sudobility/components-rn';
import {
  repairAllIssues,
  repairIssuesOutcome,
  selectEditLocked,
} from '@sudobility/music_editing';
import { findEvent, findMeasure, findTrack } from '@sudobility/music_types';
import type { ValidationIssue } from '@sudobility/music_types';
import type { MusicDocument } from '../../types';

export function IssuesSheet({
  open,
  document,
  onClose,
}: {
  open: boolean;
  document: MusicDocument;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const issues = useStore(document.store, s => s.validationIssues);
  // Both locks: the transport playing, and a job owning the score — the web's
  // `playbackState === 'playing' || generating`, the latter being exactly when
  // its layout holds the store's edit lock.
  const locked = useStore(
    document.store,
    s => selectEditLocked(s) || s.editLocked
  );

  const navigateToIssue = (issue: ValidationIssue): void => {
    const state = document.store.getState();
    const score = state.score;
    if (!score) return;
    if (issue.objectId && findEvent(score, issue.objectId)) {
      state.setSelection({
        eventIds: [issue.objectId],
        measureIds: [],
        trackIds: [],
      });
    } else if (issue.measureId && findMeasure(score, issue.measureId)) {
      state.selectMeasures([issue.measureId]);
    } else if (issue.trackId && findTrack(score, issue.trackId)) {
      state.selectTrack(issue.trackId);
    }
    onClose();
  };

  return (
    <FormModal
      visible={open}
      title={t('editor.validationIssues')}
      onClose={onClose}
      closeAriaLabel={t('common.closeDialog')}
      actions={[
        { label: t('common.cancel'), onPress: onClose, variant: 'ghost' },
        {
          label: t('editor.fixIssues'),
          onPress: () => {
            const outcome = repairIssuesOutcome(
              repairAllIssues(document.store, t('editor.fixIssues'))
            );
            document.store.getState().pushToast({
              message: t(outcome.messageKey, outcome.params),
              severity: outcome.severity,
            });
            // Closed only when the list is actually empty: leaving it open over
            // what could not be repaired is what tells the reader there is
            // still something here that needs a decision.
            if (outcome.close) onClose();
          },
          disabled: issues.length === 0 || locked,
        },
      ]}
    >
      <View className='gap-2'>
        {issues.length === 0 ? (
          <Text className='text-muted-foreground text-base'>
            {t('editor.noIssues')}
          </Text>
        ) : (
          issues.map((issue, index) => {
            const go = () => navigateToIssue(issue);
            return (
              <Pressable
                key={`${issue.code}-${index}`}
                accessibilityRole='button'
                accessibilityLabel={issue.message}
                onPress={go}
                // macOS has no synthesized-touch fallback for an assistive
                // press: VoiceOver reaches a Pressable only through this.
                onAccessibilityTap={go}
              >
                <Text
                  className={
                    issue.severity === 'error'
                      ? 'text-destructive text-base'
                      : 'text-foreground text-base'
                  }
                >
                  {issue.message}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </FormModal>
  );
}
