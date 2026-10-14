// src/context/WebRTCContext.js
import { useEffect } from 'react';
import useWebRTCStore from '../stores/webrtcStore';
import useAuthStore from '../stores/authStore';

export const WebRTCProvider = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const crewId = useAuthStore((state) => state.crewId);
  const initializeClient = useWebRTCStore((state) => state.initializeClient);
  const ready = useWebRTCStore((state) => state.ready);

  useEffect(() => {
    // Only initialize when we have BOTH user and crewId
    // (crewId comes from loadUserProfile which runs after auth)
    if (!user?.uid || !crewId) {
      console.log('[WebRTCContext] Skipping init - missing user or crewId', { userId: user?.uid, crewId });
      return;
    }
    console.log('[WebRTCContext] Effect triggered', { userId: user.uid, crewId, ready });
    const cleanup = initializeClient(user, crewId);
    return cleanup;
  }, [user?.uid, crewId, initializeClient]);

  return children;
};
