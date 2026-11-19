/**
 * Which key a label is asked for: the web library's where the host carries it,
 * the native one it replaces until then.
 */
import i18next from 'i18next';
import { hostHasKey, hostKey } from './host-key';

const i18n = i18next.createInstance();

beforeAll(async () => {
  await i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          overlay: { generatingNotes: 'Generating notes…' },
          generate: { working: 'Writing your music' },
          replace: {
            summary_one: 'Replaces {{count}} note',
            summary_other: 'Replaces {{count}} notes',
          },
        },
      },
    },
  });
});

describe('hostKey', () => {
  it('asks for the web key when the host carries it', () => {
    expect(hostKey(i18n, 'overlay.generatingNotes', 'generate.working')).toBe(
      'overlay.generatingNotes'
    );
  });

  it('falls back to the native key, never to a key the host cannot resolve', () => {
    expect(hostKey(i18n, 'replace.instruction', 'generate.working')).toBe(
      'generate.working'
    );
  });

  it('finds a plural key only when told how many', () => {
    // i18next stores plurals as `key_one` / `key_other`; `exists(key)` alone
    // answers false for them.
    expect(hostKey(i18n, 'replace.summary', 'generate.working')).toBe(
      'generate.working'
    );
    expect(hostKey(i18n, 'replace.summary', 'generate.working', 2)).toBe(
      'replace.summary'
    );
  });
});

describe('hostHasKey', () => {
  it('says whether a line the web shows can be shown here yet', () => {
    expect(hostHasKey(i18n, 'overlay.generatingNotes')).toBe(true);
    expect(hostHasKey(i18n, 'inspector.selectMeasureHint')).toBe(false);
    expect(hostHasKey(i18n, 'replace.summary', 1)).toBe(true);
  });
});
