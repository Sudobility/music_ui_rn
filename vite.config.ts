import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// Single-entry library: one barrel (`@sudobility/music_ui_rn`). Unlike
// components-rn there are no folded-in subpath modules.
export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
  // Route JSX through NativeWind's runtime so `className` props on the compiled
  // components are processed by react-native-css-interop in consuming RN apps.
  // Without this the bundle uses React's standard jsx-runtime and className is
  // inert (components render unstyled) — the documented NativeWind interop trap.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'nativewind',
  },
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'esm' : format}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        // jsx runtimes must stay external so the consumer's NativeWind handles them
        /^react\/jsx-(dev-)?runtime$/,
        /^nativewind(\/.*)?$/,
        /^react-native-css-interop(\/.*)?$/,
        'react-native',
        '@react-native-community/slider',
        /^@react-navigation\/.*/,
        '@shopify/react-native-skia',
        'react-native-gesture-handler',
        'react-native-reanimated',
        'react-native-safe-area-context',
        'react-native-svg',
        'react-native-heroicons',
        'react-native-worklets',
        'zustand',
        'i18next',
        'react-i18next',
        'clsx',
        'class-variance-authority',
        'tailwind-merge',
        // The whole @sudobility family stays external — consumers provide them.
        /^@sudobility\/.*/,
      ],
      output: {
        exports: 'named',
        globals: {
          react: 'React',
          'react-native': 'ReactNative',
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
});
