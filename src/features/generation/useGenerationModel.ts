/**
 * Which generation backend ("model") a request is sent to — the web dialogs'
 * `useGenerationProviders(store)`, over the native device-prefs store.
 *
 * On the web the preference (`generationVariant`) lives in the one editor
 * store, so a dialog hands that store to music_lib's `useGenerationProviders`.
 * Here editing stores are per document and device prefs have a store of their
 * own (`createDevicePrefsStore`), so the host injects that one; this adapts it
 * to the bound-hook shape the shared hook asks for, and the list of providers,
 * the selection and the write-back are music_lib's either way.
 *
 * With no prefs store injected there is nothing to remember a choice in, so no
 * picker is offered and `selected` is the default every other request already
 * carries (`DEFAULT_GENERATION_VARIANT`, which is also the pref's default) — a
 * host that has not wired the picker still sends what the web sends by default.
 */
import { useMemo } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import {
  DEFAULT_GENERATION_VARIANT,
  useGenerationProviders,
} from '@sudobility/music_lib';
import type {
  DevicePrefsStore,
  GenerationProviderPrefs,
} from '@sudobility/music_lib';

/** The part of the device-prefs store the picker reads and writes. */
export type GenerationModelPrefsStore = Pick<
  DevicePrefsStore,
  'getState' | 'subscribe' | 'getInitialState'
>;

/** Stands in when the host injects no prefs: the default, and nowhere to write. */
const DEFAULT_PREFS = createStore<GenerationProviderPrefs>(() => ({
  generationVariant: DEFAULT_GENERATION_VARIANT,
  setGenerationVariant: () => {},
}));

export function useGenerationModel(devicePrefs?: GenerationModelPrefsStore) {
  const usePrefs = useMemo(() => {
    const store: Pick<
      typeof DEFAULT_PREFS,
      'getState' | 'subscribe' | 'getInitialState'
    > = devicePrefs ?? DEFAULT_PREFS;
    const usePrefsHook = <Value>(
      selector: (state: GenerationProviderPrefs) => Value
    ): Value => useStore(store, selector);
    return Object.assign(usePrefsHook, { getState: store.getState });
  }, [devicePrefs]);
  const { providers, selected, setSelected } = useGenerationProviders(usePrefs);
  return {
    providers,
    selected,
    setSelected,
    /** Whether there is a preference to choose into — i.e. whether to draw the picker. */
    choosable: devicePrefs !== undefined,
  };
}
