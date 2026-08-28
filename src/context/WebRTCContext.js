// src/context/WebRTCContext.js
import { useEffect } from 'react';
import { StreamVideo } from '@stream-io/video-react-native-sdk';
import useWebRTCStore from '../stores/webrtcStore';
import useAuthStore from '../stores/authStore';

export const WebRTCProvider = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const crewId = useAuthStore((state) => state.crewId);
  const initializeClient = useWebRTCStore((state) => state.initializeClient);

  useEffect(() => {
    const cleanup = initializeClient(user, crewId);
    return cleanup;
  }, [user?.uid, crewId]);

  const client = useWebRTCStore((state) => state.client);

  return (
    <>
      {client ? <StreamVideo client={client}>{children}</StreamVideo> : children}
    </>
  );
};
