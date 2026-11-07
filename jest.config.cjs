/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.globals.cjs', './jest.mocks.cjs'],
  setupFilesAfterEnv: ['./jest.setup.cjs'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/packages/'],
  transformIgnorePatterns: [
    // Bun stores deps in node_modules/.bun/<pkg>@<ver>/node_modules/<pkg>/, so
    // the usual pattern misses them. Mirrors music_app_rn's allow-list — every
    // ESM-only dep the library's own code or tests can reach must be named.
    'node_modules/(?!(\\.bun/[^/]+/node_modules/)?(react-native|react-native-macos|@react-native|@react-native-community|@react-native-segmented-control|@react-native-documents|@react-navigation|nativewind|react-native-css-interop|react-native-reanimated|react-native-svg|react-native-heroicons|react-native-gesture-handler|react-native-safe-area-context|react-native-in-app-review|clsx|class-variance-authority|tailwind-merge|@testing-library|@sudobility|immer|zustand|nanoid|uuid|i18next|react-i18next|@moosiac|color|color-string|color-convert|color-name|simple-swizzle|is-arrayish|react-native-bottom-tabs|@bottom-tabs|react-native-screens)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@sudobility/music_ui_rn$': '<rootDir>/src/index.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};
