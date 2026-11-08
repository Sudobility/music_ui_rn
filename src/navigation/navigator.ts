/**
 * The shared navigation contract, owned by the UI library.
 *
 * The `Navigator` context lives here (not in the app) so the shared UI can
 * navigate by route name — `useNavigator().go('projects')` — without importing
 * a navigation library. The app supplies the concrete `Navigator` (its
 * react-navigation adapter) and mounts `NavigatorProvider` at its root; every
 * component below, in this library or the app, reads it through `useNavigator`.
 * Typed over music_lib's shared `MusicRoutes`.
 */
import { createNavigatorContext } from '@sudobility/routing/react';
import type { MusicRoutes } from '@sudobility/music_lib';

const ctx = createNavigatorContext<MusicRoutes>();

export const NavigatorProvider = ctx.NavigatorProvider;
export const useNavigator = ctx.useNavigator;
