// __tests__/constants/theme.test.js
// Unit tests for src/constants/theme.js

import { COLORS, SIZES } from '../../src/constants/theme';

describe('theme.js - Unit Tests', () => {
  describe('COLORS', () => {
    it('should have background color', () => {
      expect(COLORS.background).toBeDefined();
      expect(typeof COLORS.background).toBe('string');
      expect(COLORS.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should have primary color', () => {
      expect(COLORS.primary).toBeDefined();
      expect(typeof COLORS.primary).toBe('string');
      expect(COLORS.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should have secondary color', () => {
      expect(COLORS.secondary).toBeDefined();
      expect(typeof COLORS.secondary).toBe('string');
      expect(COLORS.secondary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should have text color', () => {
      expect(COLORS.text).toBeDefined();
      expect(typeof COLORS.text).toBe('string');
    });

    it('should have textMuted color', () => {
      expect(COLORS.textMuted).toBeDefined();
      expect(typeof COLORS.textMuted).toBe('string');
    });

    it('should have danger color', () => {
      expect(COLORS.danger).toBeDefined();
      expect(typeof COLORS.danger).toBe('string');
    });

    it('should use valid hex color format for all colors', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      Object.values(COLORS).forEach((color) => {
        expect(color).toMatch(hexColorRegex);
      });
    });
  });

  describe('SIZES', () => {
    it('should have base size', () => {
      expect(SIZES.base).toBeDefined();
      expect(typeof SIZES.base).toBe('number');
      expect(SIZES.base).toBe(8);
    });

    it('should have small size', () => {
      expect(SIZES.small).toBeDefined();
      expect(typeof SIZES.small).toBe('number');
      expect(SIZES.small).toBe(12);
    });

    it('should have font size', () => {
      expect(SIZES.font).toBeDefined();
      expect(typeof SIZES.font).toBe('number');
      expect(SIZES.font).toBe(14);
    });

    it('should have medium size', () => {
      expect(SIZES.medium).toBeDefined();
      expect(typeof SIZES.medium).toBe('number');
      expect(SIZES.medium).toBe(16);
    });

    it('should have large size', () => {
      expect(SIZES.large).toBeDefined();
      expect(typeof SIZES.large).toBe('number');
      expect(SIZES.large).toBe(18);
    });

    it('should have extraLarge size', () => {
      expect(SIZES.extraLarge).toBeDefined();
      expect(typeof SIZES.extraLarge).toBe('number');
      expect(SIZES.extraLarge).toBe(24);
    });

    it('should have padding size', () => {
      expect(SIZES.padding).toBeDefined();
      expect(typeof SIZES.padding).toBe('number');
      expect(SIZES.padding).toBe(24);
    });

    it('should have radius size', () => {
      expect(SIZES.radius).toBeDefined();
      expect(typeof SIZES.radius).toBe('number');
      expect(SIZES.radius).toBe(12);
    });

    it('should have all numeric values for sizes', () => {
      Object.values(SIZES).forEach((size) => {
        expect(typeof size).toBe('number');
      });
    });
  });
});