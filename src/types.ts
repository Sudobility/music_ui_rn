import type { DocumentStore } from '@sudobility/music_lib';

/**
 * A document tab: its id and the store it drives. The native app's own
 * `MusicDocument` (`@/documents/document`) is structurally identical, so a
 * host value is assignable here; the library needs only this shape.
 */
export type MusicDocument = {
  readonly id: string;
  readonly store: DocumentStore;
};
