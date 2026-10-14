// jest.setupAfterEach.js - Cleanup after each test
import { cleanup } from '@testing-library/react-native';
import { jest } from '@jest/globals';

// Import testing library matchers (must run after Jest globals are available)
import '@testing-library/react-native';

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});