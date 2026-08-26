// src/context/WebRTCContext.js
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { Animated } from 'react-native';
import {
  StreamVideoClient,
  StreamVideo,
} from '@stream-io/video-react-native-sdk';

const WebRTCContext = createContext();

// Get your free API key from https://getstream.io/dashboard/
// TODO: move this into app.json `extra` or an env file for production.
const API_KEY = 'YOUR_GETSTREAM_API_KEY';
const DEFAULT_CHANNEL = 'Production';

export const WebRTCProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isNoiseCancellationActive, setIsNoiseCancellationActive] = useState(true);
  const [isAudioPermissionGranted, setIsAudioPermissionGranted] = useState(false);

  // Live microphone loudness (0 = silent, 1 = loud) used by PTTScreen's ripple.
  // Sourced from GetStream's SFU-computed local audio level (no extra mic capture).
  const levelValue = useRef(new Animated.Value(0)).current;
  const levelSubscription = useRef(null);

  useEffect(() => {
    let streamClient;
    let cancelled = false;

    (async () => {
      // 1. Request native mic permissions
      const { status } = await Audio.requestPermissionsAsync();
      setIsAudioPermissionGranted(status === 'granted');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 2. Mock User & Dev Token (Replace with your backend auth tokens)
      const user = { id: 'user_' + Math.floor(Math.random() * 1000), name: 'Operator' };
      const token = StreamVideoClient.devToken(user.id);

      // 3. Initialize GetStream Video/Audio Client
      streamClient = new StreamVideoClient({ apiKey: API_KEY, user, token });
      if (cancelled) {
        streamClient.disconnectUser();
        return;
      }
      setClient(streamClient);

      // 4. Auto-join the default audio channel (audio-only, mic muted)
      try {
        const call = streamClient.call('default', DEFAULT_CHANNEL);
        await call.join({ create: true });
        await call.camera.disable();
        await call.microphone.disable(); // start with mic not publishing
        if (!cancelled) setActiveCall(call);
      } catch (err) {
        console.error('Failed to join channel:', err);
      }
    })();

    return () => {
      cancelled = true;
      streamClient?.disconnectUser();
    };
  }, []);

  // Join (or switch to) a specific audio channel
  const joinChannel = async (channelId = DEFAULT_CHANNEL) => {
    if (!client) return;
      const call = client.call('default', channelId);
      await call.join({ create: true });
      await call.camera.disable();
      await call.microphone.disable(); // start with mic not publishing
      setActiveCall(call);
  };

  // --- Voice-level meter (drives the PTT ripple) ---
  // Subscribes to GetStream's SFU-computed local audio level so we never open a
  // second microphone capture alongside the active WebRTC track.
  const startLevelMeter = () => {
    if (!activeCall || levelSubscription.current) return;
    levelSubscription.current = activeCall.state.localParticipant$.subscribe(
      (participant) => {
        const raw = participant?.audioLevel ?? 0;
        // Normalize: Stream reports 0..1, but guard against a 0..100 scale.
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

  // Push-To-Talk: enable mic publishing + start voice meter
  const startTransmitting = async () => {
    try {
      if (activeCall) await activeCall.microphone.enable();
      setIsMuted(false);
      console.log('[WebRTC] Microphone ENABLED - Transmitting audio feed');
      startLevelMeter();
    } catch (error) {
      console.error('Error starting audio transmission:', error);
    }
  };

  // Push-To-Talk: disable mic publishing + stop voice meter
  const stopTransmitting = async () => {
    try {
      if (activeCall) await activeCall.microphone.disable();
      setIsMuted(true);
      console.log('[WebRTC] Microphone DISABLED - Stopped transmission');
      stopLevelMeter();
    } catch (error) {
      console.error('Error stopping audio transmission:', error);
    }
  };

  const toggleNoiseCancellation = () => {
    setIsNoiseCancellationActive((prev) => !prev);
    console.log(`[Audio Engine] Noise Cancellation toggled: ${!isNoiseCancellationActive}`);
  };

  return (
    <WebRTCContext.Provider
      value={{
        isMuted,
        isAudioPermissionGranted,
        isNoiseCancellationActive,
        levelValue,
        joinChannel,
        startTransmitting,
        stopTransmitting,
        toggleNoiseCancellation,
      }}
    >
      {client ? <StreamVideo client={client}>{children}</StreamVideo> : children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => useContext(WebRTCContext);
