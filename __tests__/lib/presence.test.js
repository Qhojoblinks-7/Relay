// __tests__/lib/presence.test.js
// Unit tests for src/lib/presence.js

import { setPresence } from '../../src/lib/presence';

// Mock firebase firestore
jest.mock('../../src/lib/firebase', () => ({
  db: {},
}));

const { updateDoc } = require('firebase/firestore');
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

describe('presence.js - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setPresence', () => {
    it('should call updateDoc with correct parameters for online status', async () => {
      updateDoc.mockResolvedValueOnce(undefined);
      await setPresence('crew123', 'user456', 'online');
      expect(updateDoc).toHaveBeenCalled();
      const [docRef, data] = updateDoc.mock.calls[0];
      expect(data.presence).toBe('online');
      expect(data.transmittingChannel).toBeNull();
    });

    it('should set transmittingChannel when status is busy', async () => {
      updateDoc.mockResolvedValueOnce(undefined);
      await setPresence('crew123', 'user456', 'busy', 'channel789');
      expect(updateDoc).toHaveBeenCalled();
      const data = updateDoc.mock.calls[0][1];
      expect(data.presence).toBe('busy');
      expect(data.transmittingChannel).toBe('channel789');
    });

    it('should clear transmittingChannel when status is not busy', async () => {
      updateDoc.mockResolvedValueOnce(undefined);
      await setPresence('crew123', 'user456', 'online', 'channel789');
      expect(updateDoc).toHaveBeenCalled();
      const data = updateDoc.mock.calls[0][1];
      expect(data.presence).toBe('online');
      expect(data.transmittingChannel).toBeNull();
    });

    it('should handle missing crewId gracefully', async () => {
      await setPresence(null, 'user456', 'online');
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should handle missing uid gracefully', async () => {
      await setPresence('crew123', null, 'online');
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should handle missing both crewId and uid', async () => {
      await setPresence(null, null, 'online');
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should handle undefined crewId and uid', async () => {
      await setPresence(undefined, undefined, 'online');
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should not throw when updateDoc fails', async () => {
      updateDoc.mockRejectedValueOnce(new Error('Network error'));
      await expect(setPresence('crew123', 'user456', 'online')).resolves.not.toThrow();
    });

    it('should use default transmittingChannel of null', async () => {
      updateDoc.mockResolvedValueOnce(undefined);
      await setPresence('crew123', 'user456', 'busy');
      expect(updateDoc).toHaveBeenCalled();
      const data = updateDoc.mock.calls[0][1];
      expect(data.transmittingChannel).toBeNull();
    });
  });
});