/**
 * Gives the test host a string, the way an app's locale would, and takes it
 * away again.
 *
 * Library tests run with an empty bundle — every `t(key)` answers the key — so
 * a component that asks `hostKey`/`hostHasKey` behaves as it does in an app
 * that has not added the web's string yet. A test of the *other* branch says
 * what the host carries for its duration.
 */
import i18next from 'i18next';

export function withHostStrings(strings: Record<string, string>): () => void {
  for (const [key, value] of Object.entries(strings))
    i18next.addResource('en', 'translation', key, value);
  return () => {
    // i18next has no single-key removal; rebuild the bundle without them.
    const bundle = i18next.getResourceBundle('en', 'translation') as Record<
      string,
      unknown
    >;
    const remaining = prune(bundle, Object.keys(strings));
    i18next.removeResourceBundle('en', 'translation');
    i18next.addResourceBundle('en', 'translation', remaining, true, true);
  };
}

function prune(
  bundle: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(bundle)) as Record<string, unknown>;
  for (const key of keys) {
    const path = key.split('.');
    let node: Record<string, unknown> | undefined = copy;
    for (const part of path.slice(0, -1))
      node = node?.[part] as Record<string, unknown> | undefined;
    if (node) delete node[path[path.length - 1]!];
  }
  return copy;
}
