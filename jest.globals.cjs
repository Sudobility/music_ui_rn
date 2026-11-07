// Set React Native globals before any modules are loaded.
// This runs via Jest's setupFiles (before setupFilesAfterEnv).
global.__DEV__ = true;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;
