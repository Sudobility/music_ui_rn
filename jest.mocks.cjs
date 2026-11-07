// Jest mocks — runs before modules are loaded (setupFiles)

// Deep proxy returns empty strings for function calls and nested proxies for property access.
// This allows any depth of property access (e.g., colors.component.badge.primary.base).
function createDeepProxy() {
  return new Proxy(() => '', {
    get: (_target, prop) => {
      if (prop === 'then') return undefined;
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === Symbol.iterator) return undefined;
      // Behave like an (empty) string for the handful of real string methods
      // that token-parsing code chains on (e.g. `token.split(' ').find(...)`),
      // so it doesn't crash — it just gets empty results and falls back. The
      // allowlist avoids legacy String.prototype HTML methods (link, sub, bold,
      // …) that collide with design-token names like `textVariants.link`.
      const STRING_METHODS = [
        'split',
        'includes',
        'startsWith',
        'endsWith',
        'trim',
        'replace',
        'replaceAll',
        'toLowerCase',
        'toUpperCase',
        'indexOf',
        'lastIndexOf',
        'slice',
        'match',
        'search',
      ];
      if (typeof prop === 'string' && STRING_METHODS.includes(prop)) {
        return String.prototype[prop].bind('');
      }
      return createDeepProxy();
    },
    apply: () => '',
  });
}

jest.mock('@sudobility/design', () => ({
  variants: createDeepProxy(),
  textVariants: createDeepProxy(),
  designTokens: createDeepProxy(),
  colors: createDeepProxy(),
  Colors: createDeepProxy(),
  Tokens: createDeepProxy(),
  Typography: createDeepProxy(),
  Variants: createDeepProxy(),
  ui: createDeepProxy(),
  cn: (...args) => args.filter(Boolean).join(' '),
  getCardVariantColors: () => '',
  getCalloutVariantColors: () => ({ background: '', text: '' }),
  getSectionBadgeColors: () => ({ container: '', icon: '' }),
  getStatusIndicatorColor: () => '',
  statusIndicatorColors: createDeepProxy(),
  getColorClasses: () => '',
  buildColorClass: () => '',
  buttonVariant: () => '',
  focusRing: '',
  focusVisible: '',
  GRADIENTS: createDeepProxy(),
  GRADIENT_CLASSES: createDeepProxy(),
  SEMANTIC_COLOR_MAP: createDeepProxy(),
  // No theme is configured unless a test configures one: components draw
  // their unthemed fallback colours.
  getActiveTheme: () => null,
}));

// NB: music_ui_rn *consumes* @sudobility/components-rn as a real dependency, so
// (unlike the components-rn repo this harness came from) we do NOT self-mock it
// here — tests resolve the real package from node_modules.

// Mock NativeWind
jest.mock('nativewind', () => ({
  styled: component => component,
  // Interop is a no-op here: tests read the `className` a component passes.
  cssInterop: component => component,
  // No runtime theme variables unless a test sets some
  // (see __tests__/theme-color.test.tsx).
  useUnstableNativeVariable: () => undefined,
}));

// SVG's Fabric components need native codegen, which Jest's React Native
// environment does not provide. The tests exercise our components' behavior.
jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Svg: View, Path: View };
});
