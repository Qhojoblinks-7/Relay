// jest.setup.js - Global setup for testing Relay
import { jest } from '@jest/globals';

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('React Native'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('expo')
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Global test utilities
global.__TESTING__ = true;