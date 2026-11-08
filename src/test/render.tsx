/**
 * The scaffolding a library component test needs, in one place — the native
 * mirror of `music_app_rn`'s `@/test/render`, but holding no app composition.
 *
 * The library ships no strings, so i18n is initialised with empty resources
 * (every `t(key)` returns the key, which is what a library test asserts
 * against). A `MockMusicPlayer` is registered so anything reading playback does
 * not throw, and a document is built straight from `createDocumentStore`.
 */
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react-native';
import { PortalHost } from '@sudobility/components-rn';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { createEmptyScore } from '@sudobility/music_types';
import { createDocumentStore } from '@sudobility/music_lib';
import {
  initializeMusicPlayer,
  getMusicPlayerIfInitialized,
} from '@sudobility/music_player/core';
import { MockMusicPlayer } from '@sudobility/music_player/mocks';
import type { MusicDocument } from '../types';

let nextId = 0;

/** A document over an N-bar empty score. */
export function testDocument(
  options: { measures?: number; title?: string } = {}
): MusicDocument {
  const title = options.title ?? 'Test';
  nextId += 1;
  return {
    id: `test-${nextId}`,
    store: createDocumentStore({
      title,
      score: createEmptyScore({ title, measures: options.measures ?? 8 }),
    }),
  };
}

let started = false;

/** Renders with i18n started (keys-as-values) and a mock player registered. */
export function renderWithApp(ui: ReactElement) {
  if (!started) {
    void i18next.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      resources: { en: { translation: {} } },
      interpolation: { escapeValue: false },
    });
    started = true;
  }
  if (!getMusicPlayerIfInitialized())
    initializeMusicPlayer(new MockMusicPlayer());

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <PortalHost>{children}</PortalHost>
    </QueryClientProvider>
  );
  return render(ui, { wrapper });
}
