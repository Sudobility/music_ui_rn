/** @type {import('tailwindcss').Config} */
// Semantic colors come from @sudobility/design's NativeWind preset (concrete HSL
// for the active theme — NativeWind can't use CSS custom properties). This keeps
// music_ui_rn visually in parity with components-rn and the web app, which build
// from the same swissTheme.
const {
  createNativeWindPreset,
  defaultTheme,
} = require('@sudobility/design/themes');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset'), createNativeWindPreset(defaultTheme)],
  theme: {
    extend: {
      // 4px spacing grid matching the design system
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
    },
  },
  plugins: [],
};
