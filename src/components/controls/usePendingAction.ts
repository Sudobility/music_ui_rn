/**
 * The waiting state of a call to action.
 *
 * The rule is the user's: **a control that starts work somebody has to wait
 * for turns into a spinner while they wait, and cannot be pressed again
 * meanwhile.** `run` is that rule in one place — it marks the action pending
 * before the work starts, clears it in `finally`, and refuses a second call
 * while the first is in flight. The refusal is a ref, not the state: two taps
 * inside one frame both see the state from before the first, and only a ref
 * is already set when the second arrives.
 *
 * `key` says *which* of several controls is waiting (one Export button among
 * five, one tile's Duplicate among a grid), so only that one spins; every one
 * of them is refused while any is pending.
 *
 * **One hook, read either way.** `@sudobility/music_ui` returns this as a
 * tuple — `const [pending, run] = usePendingAction()` — and the native apps
 * read it by name — `saving.pending`, `saving.run(...)`. The value answers
 * both: it is the web's `[pending, run]` pair carrying `pending`, `pendingKey`
 * and `run` as properties, so a call site written against either library reads
 * the same here.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Starts `work` unless something is already in flight. Answers what the work
 * answered, or `undefined` when it was refused. A rejection propagates.
 */
export type PendingRun<K> = <T>(
  work: () => Promise<T>,
  key?: K
) => Promise<T | undefined>;

export type PendingAction<K> = readonly [
  pending: boolean,
  run: PendingRun<K>,
] & {
  /** Something is in flight. */
  readonly pending: boolean;
  /** The key the work in flight was started with, or null. */
  readonly pendingKey: K | null;
  readonly run: PendingRun<K>;
};

export function usePendingAction<K = true>(): PendingAction<K> {
  const [pendingKey, setPendingKey] = useState<K | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async <T>(work: () => Promise<T>, key?: K): Promise<T | undefined> => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      setPendingKey((key ?? true) as K);
      try {
        return await work();
      } finally {
        inFlight.current = false;
        if (mounted.current) setPendingKey(null);
      }
    },
    []
  );

  const pending = pendingKey !== null;
  return Object.assign([pending, run] as const, { pending, pendingKey, run });
}

/**
 * The same, for a list where each row has its own CTA (duplicate one project
 * while another is still copying). `isPending(key)` is that row's state.
 *
 * Unlike a keyed `usePendingAction`, rows do not refuse one another: each key
 * is its own flight, and only a second run of the *same* key is refused.
 * `@sudobility/music_ui`'s `usePendingKeys`: same name, signature and rule.
 */
export function usePendingKeys(): [
  isPending: (key: string) => boolean,
  run: <T>(key: string, work: () => Promise<T>) => Promise<T | undefined>,
] {
  const [keys, setKeys] = useState<ReadonlySet<string>>(new Set());
  const inFlight = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async <T>(key: string, work: () => Promise<T>): Promise<T | undefined> => {
      if (inFlight.current.has(key)) return undefined;
      inFlight.current.add(key);
      setKeys(new Set(inFlight.current));
      try {
        return await work();
      } finally {
        inFlight.current.delete(key);
        if (mounted.current) setKeys(new Set(inFlight.current));
      }
    },
    []
  );

  const isPending = useCallback((key: string) => keys.has(key), [keys]);
  return [isPending, run];
}
