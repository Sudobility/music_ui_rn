/**
 * The web library's key for a label, where the host app carries it.
 *
 * This library and `@sudobility/music_ui` hold no strings — both ask the host
 * for a key — so the two say the same thing only where they ask for the same
 * key. In a handful of places the native components grew a key of their own for
 * a label the web already had one for (`generate.working` beside
 * `overlay.generatingNotes`), and the two apps' words drifted apart behind
 * them, out of sight of `music_app_rn`'s cross-app parity test, which compares
 * the locales key by key.
 *
 * The mirror is to ask for the web's key. But a key the host's locale does not
 * carry renders as the key itself, on screen, so switching a call site outright
 * would trade a wording drift for a visible `overlay.generatingNotes` until
 * every consuming app has added the string. This asks for the web's key when
 * the host has it and for the native one it replaces until then — adding the
 * string to the app's locale is the whole migration, and the fallback is dead
 * code from that moment.
 *
 * Give `count` for a plural key: i18next stores those as `key_one`/`key_other`
 * and answers `exists(key)` with false unless told how many.
 */
import type { i18n as I18n } from 'i18next';

export function hostKey(
  i18n: Pick<I18n, 'exists'>,
  webKey: string,
  nativeKey: string,
  count?: number
): string {
  const carried =
    count === undefined ? i18n.exists(webKey) : i18n.exists(webKey, { count });
  return carried ? webKey : nativeKey;
}

/** Whether the host carries `key` at all — for a line the web shows and native never had. */
export function hostHasKey(
  i18n: Pick<I18n, 'exists'>,
  key: string,
  count?: number
): boolean {
  return count === undefined ? i18n.exists(key) : i18n.exists(key, { count });
}
