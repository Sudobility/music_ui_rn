/**
 * The accessible names in a rendered tree, in the order they are drawn.
 *
 * What "the same controls in the same order" is checked against: a bar's
 * controls each carry a name, and the order of the names is the order a reader
 * meets the controls in.
 */
import type { ReactTestRendererJSON } from 'react-test-renderer';

type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

export function accessibleNames(tree: Node): string[] {
  const names: string[] = [];
  const walk = (node: Node): void => {
    if (node === null || typeof node === 'string') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const name = node.props.accessibilityLabel as unknown;
    if (typeof name === 'string') names.push(name);
    (node.children ?? []).forEach(walk);
  };
  walk(tree);
  return names;
}

/** `names`, keeping only those in `wanted` — the sequence a test cares about. */
export function inOrder(
  names: readonly string[],
  wanted: readonly string[]
): string[] {
  const keep = new Set(wanted);
  return names.filter(name => keep.has(name));
}
