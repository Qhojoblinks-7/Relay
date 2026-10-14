// __tests__/constants/globalStyles.test.js
// Unit tests for src/constants/globalStyles.js

import { StyleSheet } from 'react-native';
import { globalStyles } from '../../src/constants/globalStyles';
import { COLORS, SIZES } from '../../src/constants/theme';

describe('globalStyles.js - Unit Tests', () => {
  describe('globalStyles structure', () => {
    it('should be a StyleSheet created object', () => {
      expect(globalStyles).toBeDefined();
      expect(typeof globalStyles).toBe('object');
    });

    it('should have container style', () => {
      expect(globalStyles.container).toBeDefined();
      expect(globalStyles.container.flex).toBe(1);
      expect(globalStyles.container.backgroundColor).toBe(COLORS.background);
      expect(globalStyles.container.padding).toBe(SIZES.padding);
    });

    it('should have title style', () => {
      expect(globalStyles.title).toBeDefined();
      expect(globalStyles.title.color).toBe(COLORS.text);
      expect(globalStyles.title.fontSize).toBe(SIZES.extraLarge);
      expect(globalStyles.title.fontWeight).toBe('bold');
    });

    it('should have subtitle style', () => {
      expect(globalStyles.subtitle).toBeDefined();
      expect(globalStyles.subtitle.color).toBe(COLORS.textMuted);
      expect(globalStyles.subtitle.fontSize).toBe(SIZES.font);
      expect(globalStyles.subtitle.textAlign).toBe('center');
    });

    it('should have primaryButton style', () => {
      expect(globalStyles.primaryButton).toBeDefined();
      expect(globalStyles.primaryButton.backgroundColor).toBe(COLORS.primary);
      expect(globalStyles.primaryButton.paddingVertical).toBe(16);
      expect(globalStyles.primaryButton.paddingHorizontal).toBe(32);
      expect(globalStyles.primaryButton.borderRadius).toBe(SIZES.radius);
      expect(globalStyles.primaryButton.width).toBe('85%');
    });

    it('should have primaryButtonText style', () => {
      expect(globalStyles.primaryButtonText).toBeDefined();
      expect(globalStyles.primaryButtonText.color).toBe(COLORS.text);
      expect(globalStyles.primaryButtonText.fontSize).toBe(SIZES.medium);
      expect(globalStyles.primaryButtonText.fontWeight).toBe('bold');
    });

    it('should have secondaryButton style', () => {
      expect(globalStyles.secondaryButton).toBeDefined();
      expect(globalStyles.secondaryButton.paddingVertical).toBe(12);
      expect(globalStyles.secondaryButton.paddingHorizontal).toBe(24);
      expect(globalStyles.secondaryButton.borderRadius).toBe(SIZES.radius);
      expect(globalStyles.secondaryButton.borderWidth).toBe(2);
      expect(globalStyles.secondaryButton.borderColor).toBe(COLORS.secondary);
    });

    it('should have secondaryButtonText style', () => {
      expect(globalStyles.secondaryButtonText).toBeDefined();
      expect(globalStyles.secondaryButtonText.color).toBe(COLORS.text);
      expect(globalStyles.secondaryButtonText.fontSize).toBe(SIZES.font);
      expect(globalStyles.secondaryButtonText.fontWeight).toBe('bold');
    });

    it('should have input style', () => {
      expect(globalStyles.input).toBeDefined();
      expect(globalStyles.input.width).toBe('100%');
      expect(globalStyles.input.backgroundColor).toBe(COLORS.background);
      expect(globalStyles.input.borderColor).toBe(COLORS.secondary);
      expect(globalStyles.input.borderWidth).toBe(2);
      expect(globalStyles.input.borderRadius).toBe(SIZES.radius);
      expect(globalStyles.input.color).toBe(COLORS.text);
      expect(globalStyles.input.padding).toBe(16);
      expect(globalStyles.input.fontSize).toBe(SIZES.medium);
    });
  });

  describe('style consistency', () => {
    it('should use consistent border radius across buttons and inputs', () => {
      expect(globalStyles.primaryButton.borderRadius).toBe(SIZES.radius);
      expect(globalStyles.secondaryButton.borderRadius).toBe(SIZES.radius);
      expect(globalStyles.input.borderRadius).toBe(SIZES.radius);
    });

    it('should use consistent primary color for buttons', () => {
      expect(globalStyles.primaryButton.backgroundColor).toBe(COLORS.primary);
    });

    it('should use consistent text color for text elements', () => {
      expect(globalStyles.title.color).toBe(COLORS.text);
      expect(globalStyles.primaryButtonText.color).toBe(COLORS.text);
      expect(globalStyles.secondaryButtonText.color).toBe(COLORS.text);
      expect(globalStyles.input.color).toBe(COLORS.text);
    });
  });
});