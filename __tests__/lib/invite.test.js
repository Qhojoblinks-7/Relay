// __tests__/lib/invite.test.js
// Unit tests for src/lib/invite.js

import {
  buildInviteLink,
  generateInviteCode,
  parseInvite,
} from '../../src/lib/invite';

describe('invite.js - Unit Tests', () => {
  describe('buildInviteLink', () => {
    it('should build a valid HTTPS invite link', () => {
      const crewId = 'test-crew-id';
      const code = 'ABC12345';
      const link = buildInviteLink(crewId, code);
      expect(link).toContain('https://relay.app/join?');
      expect(link).toContain(`c=${encodeURIComponent(crewId)}`);
      expect(link).toContain(`code=${encodeURIComponent(code)}`);
    });

    it('should encode special characters in crewId', () => {
      const crewId = 'crew with spaces & special';
      const code = 'ABC12345';
      const link = buildInviteLink(crewId, code);
      expect(link).toContain('c=crew%20with%20spaces%20%26%20special');
    });

    it('should encode special characters in code', () => {
      const crewId = 'test-crew';
      const code = 'AB+12/45';
      const link = buildInviteLink(crewId, code);
      expect(link).toContain('code=AB%2B12%2F45');
    });
  });

  describe('generateInviteCode', () => {
    it('should generate an 8-character code', () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
    });

    it('should only use valid characters', () => {
      const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for (let i = 0; i < 100; i++) {
        const code = generateInviteCode();
        for (const char of code) {
          expect(validChars).toContain(char);
        }
      }
    });

    it('should generate unique codes across multiple calls', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      // With 8 chars from 32-char alphabet, collisions are extremely unlikely
      expect(codes.size).toBeGreaterThan(90);
    });

    it('should not contain ambiguous characters (0, 1, O, I)', () => {
      const ambiguous = ['0', '1', 'O', 'I'];
      for (let i = 0; i < 100; i++) {
        const code = generateInviteCode();
        for (const char of code) {
          expect(ambiguous).not.toContain(char);
        }
      }
    });
  });

  describe('parseInvite', () => {
    it('should parse HTTPS invite link with c and code params', () => {
      const link = 'https://relay.app/join?c=crew123&code=ABC12345';
      const result = parseInvite(link);
      expect(result.crewId).toBe('crew123');
      expect(result.code).toBe('ABC12345');
      expect(result.raw).toBe(link);
    });

    it('should parse relay:// deep link with c and code params', () => {
      const link = 'relay://join?c=crew456&code=XYZ789';
      const result = parseInvite(link);
      expect(result.crewId).toBe('crew456');
      expect(result.code).toBe('XYZ789');
    });

    it('should decode URL-encoded parameters', () => {
      const link = 'https://relay.app/join?c=crew%20with%20spaces&code=ABC%2B123';
      const result = parseInvite(link);
      expect(result.crewId).toBe('crew with spaces');
      expect(result.code).toBe('ABC+123');
    });

    it('should parse space-separated crewId and code', () => {
      const input = 'crew123456789 ABC12345';
      const result = parseInvite(input);
      expect(result.crewId).toBe('crew123456789');
      expect(result.code).toBe('ABC12345');
    });

    it('should treat short input as raw code only', () => {
      const input = 'ABC12345';
      const result = parseInvite(input);
      expect(result.crewId).toBe('');
      expect(result.code).toBe('ABC12345');
    });

    it('should handle null/undefined input', () => {
      const result = parseInvite(null);
      expect(result.crewId).toBe('');
      expect(result.code).toBe('');
      expect(result.raw).toBe(null);
    });

    it('should handle empty string input', () => {
      const result = parseInvite('');
      expect(result.crewId).toBe('');
      expect(result.code).toBe('');
      expect(result.raw).toBe('');
    });

    it('should trim whitespace from raw code', () => {
      const input = '  ABC12345  ';
      const result = parseInvite(input);
      expect(result.code).toBe('ABC12345');
    });

    it('should not parse space-separated if parts are too short', () => {
      const input = 'short code';
      const result = parseInvite(input);
      // crewId.length >= 10 and code.length >= 4 check fails
      expect(result.crewId).toBe('');
      expect(result.code).toBe('short code');
    });

    it('should handle links with only code param (no c)', () => {
      const link = 'https://relay.app/join?code=ABC12345';
      const result = parseInvite(link);
      expect(result.crewId).toBe('');
      expect(result.code).toBe('ABC12345');
    });
  });
});