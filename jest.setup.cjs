// Jest setup file for React Native Testing Library
require('@testing-library/jest-native/extend-expect');

/*
  SafeAreaProvider measures before it renders anything, and nothing measures in
  jsdom — so without this every child of a provider is absent from the tree and
  a passing test only proves the wrapper mounted. `ModalHost` provides one
  around every dialog in this library, which is what made this necessary; the
  package ships the mock for exactly this reason.
*/
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  // The package ships a mock, but as untranspiled TSX inside node_modules,
  // which this project's transform does not reach. It is four values.
  return {
    SafeAreaProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    SafeAreaView: ({ children, ...rest }) =>
      React.createElement(require('react-native').View, rest, children),
    SafeAreaInsetsContext: React.createContext(inset),
    SafeAreaFrameContext: React.createContext(frame),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets: inset, frame },
  };
});
