// src/context/WebRTCContext.js
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { Animated } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  StreamVideoClient,
  StreamVideo,
} from '@stream-io/video-react-native-sdk';
import Constants from 'expo-constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { callIdFor, fetchStreamToken, getChannelRole } from '../lib/getStream';
import { setPresence } from '../lib/presence';
import { notifyTransmission } from '../lib/notifications';

const WebRTCContext = createContext();

// GetStream API key lives in app.json -> expo.extra.getstream.apiKey.
// The API SECRET stays server-side only (functions config) — never in the client.
const API_KEY =
  Constants.expoConfig?.extra?.getstream?.apiKey ||
  Constants.manifest?.extra?.getstream?.apiKey ||
  'YOUR_GETSTREAM_API_KEY';

if (!API_KEY || API_KEY === 'YOUR_GETSTREAM_API_KEY') {
  console.warn(
    '[GetStream] Using placeholder API key. Add your key under ' +
      'app.json -> expo.extra.getstream.apiKey to enable voice.'
  );
}

export const WebRTCProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [client, setClient] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null); // { crewId, channelId, role }
  const [ready, setReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isNoiseCancellationActive, setIsNoiseCancellationActive] = useState(true);
  const [isAudioPermissionGranted, setIsAudioPermissionGranted] = useState(false);

  // Live microphone loudness (0 = silent, 1 = loud) used by PTTScreen's ripple.
  // Sourced from GetStream's SFU-computed local audio level (no extra mic capture).
  const levelValue = useRef(new Animated.Value(0)).current;
  const levelSubscription = useRef(null);

  // Connect the GetStream client once a real Firebase user is authenticated.
  // The client identity is bound to the Firebase uid (no more random user_xxx),
  // and the token is scoped to the user's member channels by the backend.
  useEffect(() => {
    let cancelled = false;
    let streamClient;

    (async () => {
      if (!user) return;

      const { status } = await Audio.requestPermissionsAsync();
      setIsAudioPermissionGranted(status === 'granted');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Resolve the display name for the GetStream identity.
      let name = user.email || 'Operator';
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) name = userDoc.data().displayName || name;
      } catch (e) {
        // fall back to email
      }

      const token = await fetchStreamToken(user.uid);
      streamClient = new StreamVideoClient({
        apiKey: API_KEY,
        user: { id: user.uid, name },
        token,
      });

      if (cancelled) {
        streamClient.disconnectUser();
        return;
      }
      setClient(streamClient);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      deactivateKeepAwake();
      streamClient?.disconnectUser();
      setClient(null);
      setReady(false);
      setActiveCall(null);
      setActiveChannel(null);
    };
  }, [user?.uid]);

  // Join (or switch to) a specific crew channel's audio room.
  const joinChannel = async (crewId, channelId) => {
    if (!client) return;
    if (
      activeChannel &&
      activeChannel.crewId === crewId &&
      activeChannel.channelId === channelId
    ) {
      return; // already on this channel
    }

    // Only channel members may enter the audio room (non-members can't get in).
    const role = await getChannelRole(crewId, channelId, user.uid);
    if (!role) {
      throw new Error('You are not a member of this channel.');
    }

    const call = client.call('default', callIdFor(crewId, channelId));
    await call.join({ create: true });
    await call.camera.disable();
    await call.microphone.disable(); // start with mic not publishing
    setActiveCall(call);
    setActiveChannel({ crewId, channelId, role });
    await activateKeepAwakeAsync();
  };

  // --- Voice-level meter (drives the PTT ripple) ---
  const startLevelMeter = () => {
    if (!activeCall || levelSubscription.current) return;
    levelSubscription.current = activeCall.state.localParticipant$.subscribe(
      (participant) => {
        const raw = participant?.audioLevel ?? 0;
        const level = raw > 1 ? raw / 100 : raw;
        levelValue.setValue(Math.min(1, Math.max(0, level)));
      }
    );
  };

  const stopLevelMeter = () => {
    if (levelSubscription.current) {
      levelSubscription.current.unsubscribe();
      levelSubscription.current = null;
    }
    levelValue.setValue(0);
  };

  // Push-To-Talk: enable mic publishing + start voice meter.
  // Observers (receive-only) must never transmit.
  const startTransmitting = async () => {
    if (activeChannel?.role === 'observer') return;
    try {
      if (activeCall) await activeCall.microphone.enable();
      setIsMuted(false);
      console.log('[WebRTC] Microphone ENABLED - Transmitting audio feed');
      startLevelMeter();
      // Mark presence as busy (transmitting) on the crew member doc.
      if (activeChannel) {
        await setPresence(activeChannel.crewId, user.uid, 'busy', activeChannel.channelId);
        // Ping the crew (push) that this user started talking.
        notifyTransmission({
          crewId: activeChannel.crewId,
          channelId: activeChannel.channelId,
          displayName: profile?.displayName || user.email,
        });
      }
    } catch (error) {
      console.error('Error starting audio transmission:', error);
    }
  };

  // Push-To-Talk: disable mic publishing + stop voice meter.
  const stopTransmitting = async () => {
    try {
      if (activeCall) await activeCall.microphone.disable();
      setIsMuted(true);
      console.log('[WebRTC] Microphone DISABLED - Stopped transmission');
      stopLevelMeter();
      // Back to online once the mic is released.
      if (activeChannel) {
        await setPresence(activeChannel.crewId, user.uid, 'online');
      }
    } catch (error) {
      console.error('Error stopping audio transmission:', error);
    }
  };

  const toggleNoiseCancellation = () => {
    setIsNoiseCancellationActive((prev) => !prev);
    console.log(`[Audio Engine] Noise Cancellation toggled: ${!isNoiseCancellationActive}`);
  };

  // Tear down the active call + client (called on logout).
  const disconnect = () => {
    stopLevelMeter();
    try {
      activeCall?.leave();
    } catch (e) {
      console.error('[WebRTC] Error leaving call:', e);
    }
    try {
      client?.disconnectUser();
    } catch (e) {
      console.error('[WebRTC] Error disconnecting client:', e);
    }
    setActiveCall(null);
    setActiveChannel(null);
    setClient(null);
    setReady(false);
    deactivateKeepAwake();
  };

  // A member can talk (PTT) unless they are an observer on this channel.
  const canTalk = !!activeChannel && activeChannel.role !== 'observer';

  return (
    <WebRTCContext.Provider
      value={{
        isMuted,
        isAudioPermissionGranted,
        isNoiseCancellationActive,
        levelValue,
        ready,
        canTalk,
        activeChannel,
        joinChannel,
        startTransmitting,
        stopTransmitting,
        toggleNoiseCancellation,
        disconnect,
      }}
    >
      {client ? <StreamVideo client={client}>{children}</StreamVideo> : children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => useContext(WebRTCContext);
