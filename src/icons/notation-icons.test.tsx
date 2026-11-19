/**
 * The named glyphs are the web library's export list, no more and no fewer.
 *
 * `NOTATION_ICON_NAMES` is that list — music_ui's own test holds its exports to
 * it — so holding this file to the same list is what keeps the two libraries'
 * icon surfaces one set of names. Each name is written out by hand here (an
 * export has to be static), which is exactly the kind of list that goes stale
 * when a glyph is added on the web.
 */
import { jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { NOTATION_ICON_NAMES } from '@sudobility/music_types';
import type { ComponentType } from 'react';
import * as glyphs from './notation-icons';
import type { NotationGlyphProps } from './notation-icons';
import { NotationIcon } from './NotationIcon';

jest.mock('./NotationIcon', () => ({
  NotationIcon: jest.fn(() => null),
}));

const drawn = NotationIcon as unknown as jest.Mock;
const named = glyphs as unknown as Record<
  string,
  ComponentType<NotationGlyphProps>
>;

describe('named notation glyphs', () => {
  it('exports exactly the names the web library exports', () => {
    expect(Object.keys(glyphs).sort()).toEqual([...NOTATION_ICON_NAMES].sort());
  });

  it.each([...NOTATION_ICON_NAMES])('%s draws its own glyph', name => {
    drawn.mockClear();
    const Glyph = named[name]!;
    render(<Glyph color='#123456' size={24} />);
    expect(drawn).toHaveBeenCalledTimes(1);
    expect(drawn.mock.calls[0]![0]).toEqual({
      name,
      color: '#123456',
      size: 24,
    });
  });
});
