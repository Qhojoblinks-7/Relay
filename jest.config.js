module.exports = {
  preset: 'jest-expo',
  setupFiles: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/jest.mocks.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setupAfterEach.js'],
  testMatch: [
    '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
  ],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@stream-io|@notifee|react-native-safe-area|react-native-screens|react-navigation|@react-navigation|lucide-react-native|react-native-svg|react-native-qrcode-svg|react-native-incall-manager|react-native-volume-manager|zustand|@react-native-async-storage|@react-native-community|expo-modules-core|expo-router|expo-asset|expo-constants|expo-splash-screen|expo-status-bar|expo-keep-awake|expo-haptics|expo-device|expo-updates|expo-audio|expo-camera|jest-expo|@testing-library)/)',
  ],
  moduleNameMapper: {
    '\\.svg$': 'jest-svg-transformer',
    '^@stream-io/video-react-native-sdk$': '<rootDir>/__mocks__/streamVideoMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/main.js',
    '!**/__tests__/**',
    '!**/__mocks__/**',
  ],
  testTimeout: 15000,
};