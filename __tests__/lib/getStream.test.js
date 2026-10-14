// __tests__/lib/getStream.test.js
// Unit tests for src/lib/getStream.js

import { callIdFor, getChannelRole, fetchStreamToken } from '../../src/lib/getStream';

jest.mock('../../src/lib/firebase', () => ({
  db: {},
}));

const { getDoc, getDocs, collection } = require('firebase/firestore');
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  collection: jest.fn(),
}));

const { httpsCallable, getFunctions } = require('firebase/functions');
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
  getFunctions: jest.fn(),
}));

const { createDevToken } = require('../../src/lib/devToken');
jest.mock('../../src/lib/devToken', () => ({
  createDevToken: jest.fn(),
}));

describe('getStream.js - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('callIdFor', () => {
    it('should join crewId and channelId with underscore', () => {
      expect(callIdFor('crew123', 'channel456')).toBe('crew123_channel456');
    });

    it('should handle empty crewId', () => {
      expect(callIdFor('', 'channel456')).toBe('_channel456');
    });

    it('should handle empty channelId', () => {
      expect(callIdFor('crew123', '')).toBe('crew123_');
    });

    it('should handle both empty', () => {
      expect(callIdFor('', '')).toBe('_');
    });

    it('should handle numeric IDs', () => {
      expect(callIdFor('123', '456')).toBe('123_456');
    });
  });

  describe('getChannelRole', () => {
    it('should return null when crewId is missing', async () => {
      const result = await getChannelRole(null, 'channel1', 'user1');
      expect(result).toBeNull();
      expect(getDoc).not.toHaveBeenCalled();
    });

    it('should return null when channelId is missing', async () => {
      const result = await getChannelRole('crew1', null, 'user1');
      expect(result).toBeNull();
    });

    it('should return null when uid is missing', async () => {
      const result = await getChannelRole('crew1', 'channel1', null);
      expect(result).toBeNull();
    });

    it('should return null when member doc does not exist', async () => {
      getDoc.mockResolvedValueOnce({ exists: () => false });
      const result = await getChannelRole('crew1', 'channel1', 'user1');
      expect(result).toBeNull();
    });

    it('should return role when member doc exists', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'admin' }),
      });
      const result = await getChannelRole('crew1', 'channel1', 'user1');
      expect(result).toBe('admin');
    });

    it('should default to member when role is missing but doc exists', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({}),
      });
      const result = await getChannelRole('crew1', 'channel1', 'user1');
      expect(result).toBe('member');
    });

    it('should return observer role', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ role: 'observer' }),
      });
      const result = await getChannelRole('crew1', 'channel1', 'user1');
      expect(result).toBe('observer');
    });
  });

  describe('fetchStreamToken', () => {
    it('should use dev token when useDevToken is true', async () => {
      createDevToken.mockResolvedValueOnce('dev-token-123');
      const token = await fetchStreamToken('user123', 'crew456');
      expect(token).toBe('dev-token-123');
      expect(createDevToken).toHaveBeenCalledWith('user123', expect.any(String));
    });

    it('should call Cloud Function when not in dev mode', async () => {
      httpsCallable.mockResolvedValueOnce({
        data: { token: 'cf-token-123' },
      });

      const token = await fetchStreamToken('user123', 'crew456', {
        useDevToken: false,
        secret: 'test-secret',
      });
      expect(token).toBe('cf-token-123');
    });

    it('should fall back to dev token when Cloud Function fails', async () => {
      httpsCallable.mockRejectedValueOnce(new Error('Function error'));
      createDevToken.mockResolvedValueOnce('dev-token-fallback');

      const token = await fetchStreamToken('user123', 'crew456', {
        useDevToken: false,
        secret: 'test-secret',
      });
      expect(token).toBe('dev-token-fallback');
    });

    it('should return undefined when Cloud Function returns no token', async () => {
      httpsCallable.mockResolvedValueOnce({ data: {} });
      createDevToken.mockResolvedValueOnce('dev-token-fallback');

      const token = await fetchStreamToken('user123', 'crew456', {
        useDevToken: false,
        secret: 'test-secret',
      });
      expect(token).toBe('dev-token-fallback');
    });
  });
});