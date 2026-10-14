// __tests__/lib/devToken.test.js
// Unit tests for src/lib/devToken.js

import { createDevToken, __resetDevTokenState } from '../../src/lib/devToken';

describe('devToken.js - Unit Tests', () => {
  beforeEach(() => {
    __resetDevTokenState();
  });
  describe('createDevToken', () => {
    const testSecret = 'test-secret-key-for-testing';
    const testUserId = 'test-user-123';

    it('should return a valid JWT format (three parts separated by dots)', () => {
      const token = createDevToken(testUserId, testSecret);
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('should throw error when secret is not provided', () => {
      expect(() => createDevToken(testUserId, '')).toThrow(
        'GetStream secret not configured'
      );
    });

    it('should throw error when secret is null', () => {
      expect(() => createDevToken(testUserId, null)).toThrow(
        'GetStream secret not configured'
      );
    });

    it('should include user_id in the token payload', () => {
      const token = createDevToken(testUserId, testSecret);
      const parts = token.split('.');
      // Decode the payload (second part)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.user_id).toBe(testUserId);
    });

    it('should include issued-at (iat) timestamp in payload', () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      const token = createDevToken(testUserId, testSecret);
      const afterTime = Math.floor(Date.now() / 1000);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.iat).toBeGreaterThanOrEqual(beforeTime);
      expect(payload.iat).toBeLessThanOrEqual(afterTime);
    });

    it('should include expiration (exp) timestamp in payload', () => {
      const token = createDevToken(testUserId, testSecret);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(payload.iat);
    });

    it('should set expiration to approximately 100 years from now', () => {
      const now = Math.floor(Date.now() / 1000);
      const token = createDevToken(testUserId, testSecret);
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      const hundredYears = 60 * 60 * 24 * 365 * 100;
      expect(payload.exp - payload.iat).toBeCloseTo(hundredYears, -3);
    });

    it('should generate different tokens for different users', () => {
      const token1 = createDevToken('user1', testSecret);
      const token2 = createDevToken('user2', testSecret);
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for different secrets', () => {
      const token1 = createDevToken(testUserId, 'secret1');
      const token2 = createDevToken(testUserId, 'secret2');
      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens on subsequent calls (different iat)', async () => {
      const token1 = createDevToken(testUserId, testSecret);
      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));
      const token2 = createDevToken(testUserId, testSecret);
      expect(token1).not.toBe(token2);
    });

    it('should produce a base64url-encoded signature', () => {
      const token = createDevToken(testUserId, testSecret);
      const parts = token.split('.');
      // Base64url uses A-Z, a-z, 0-9, -, _ (no + or /)
      expect(parts[2]).not.toMatch(/[+/]/);
      expect(parts[2]).not.toMatch(/=+$/);
    });

    it('should use HS256 algorithm in header', () => {
      const token = createDevToken(testUserId, testSecret);
      const parts = token.split('.');
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
    });
  });
});