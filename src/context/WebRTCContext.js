// src/context/WebRTCContext.js
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
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

// GetStream API key: env vars take priority, then app.json, then empty.
// The API SECRET stays server-side only (functions config) — never in the client.
const API_KEY =
  process.env.EXPO_PUBLIC_GETSTREAM_API_KEY ||
  Constants.expoConfig?.extra?.getstream?.apiKey ||
  Constants.manifest?.extra?.getstream?.apiKey ||
  '';

if (!API_KEY || API_KEY === 'YOUR_GETSTREAM_API_KEY') {
  console.warn(
    '[GetStream] No API key found. Set EXPO_PUBLIC_GETSTREAM_API_KEY in your .env file ' +
      'or add your key under app.json -> expo.extra.getstream.apiKey to enable voice.'
  );
}

export const WebRTCProvider = ({ children }) => {
  const { user, profile, crewId } = useAuth();
  const [client, setClient] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null); // { crewId, channelId, role }
  const [ready, setReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isNoiseCancellationActive, setIsNoiseCancellationActive] = useState(true);
  const [isAudioPermissionGranted, setIsAudioPermissionGranted] = useState(false);
  const [isSpeakerphone, setIsSpeakerphone] = useState(false);
  const [channelBusy, setChannelBusy] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);

  // Live microphone loudness (0 = silent, 1 = loud) used by PTTScreen's ripple.
  // Sourced from GetStream's SFU-computed local audio level (no extra mic capture).
  const levelValue = useRef(new Animated.Value(0)).current;
  const levelSubscription = useRef(null);
  const remoteLevelSubscriptions = useRef([]);
  const micWatchdogRef = useRef(null);

  // Connect the GetStream client once a real Firebase user is authenticated.
  // The client identity is bound to the Firebase uid (no more random user_xxx),
  // and the token is scoped to the user's member channels by the backend.
  useEffect(() => {
    let cancelled = false;
    let streamClient;

    (async () => {
      try {
        if (!user) return;
        console.log('[WebRTC] initializing client for', user.uid);

        const { status } = await requestRecordingPermissionsAsync();
        setIsAudioPermissionGranted(status === 'granted');
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
          shouldRouteThroughEarpiece: false,
        });

        // Resolve the display name for the GetStream identity.
        let name = user.email || 'Operator';
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) name = userDoc.data().displayName || name;
        } catch (e) {
          // fall back to email
        }

        const token = await fetchStreamToken(user.uid, crewId);
        console.log('[WebRTC] token obtained, creating client');
        streamClient = StreamVideoClient.getOrCreateInstance({
          apiKey: API_KEY,
          user: { id: user.uid, name },
          token,
        });
        console.log('[WebRTC] client created and user connected');

        if (cancelled) {
          streamClient.disconnectUser();
          return;
        }
        setClient(streamClient);
        setReady(true);
        console.log('[WebRTC] ready set to true');
      } catch (err) {
        console.error('[WebRTC] client init failed:', err);
      }
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
    if (!client) {
      console.warn('[WebRTC] joinChannel skipped: client not ready');
      return;
    }
    if (
      activeChannel &&
      activeChannel.crewId === crewId &&
      activeChannel.channelId === channelId
    ) {
      console.log('[WebRTC] joinChannel skipped: already on this channel');
      return; // already on this channel
    }

    console.log('[WebRTC] joinChannel start', { crewId, channelId, uid: user.uid });
    // Only channel members may enter the audio room (non-members can't get in).
    const role = await getChannelRole(crewId, channelId, user.uid);
    console.log('[WebRTC] joinChannel role lookup', { crewId, channelId, uid: user.uid, role });
    if (!role) {
      throw new Error('You are not a member of this channel.');
    }

    const call = client.call('default', callIdFor(crewId, channelId));
    console.log('[WebRTC] joinChannel calling call.join', { callId: callIdFor(crewId, channelId) });
    const joinPromise = call.join({ create: true, ring: false, notify: false });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('call.join timed out after 15s')), 15000)
    );
    await Promise.race([joinPromise, timeoutPromise]);
    console.log('[WebRTC] joinChannel call.join succeeded');

    // Audio-only PTT app: no camera. Disable the mic so we start not publishing.
    // Guard the SDK call with a timeout so a stuck call can't block activation.
    const guard = (p, ms, label) =>
      Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(label)), ms))]);
    try {
      await guard(call.microphone.disable(), 5000, 'microphone.disable');
    } catch (e) {
      console.warn('[WebRTC] mic disable skipped:', e.message);
    }

    setActiveCall(call);
    setActiveChannel({ crewId, channelId, role });
    console.log('[WebRTC] joined channel', { crewId, channelId, role });
    await activateKeepAwakeAsync();
    startRemoteLevelTracking();
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

  // Track remote participants' audio levels for busy lockout + speaker indicator.
  // If any remote participant is talking, the channel is "busy" (can't transmit).
  const startRemoteLevelTracking = () => {
    if (!activeCall) return;
    stopRemoteLevelTracking();
    remoteLevelSubscriptions.current = [];
    const updateBusyState = () => {
      const remoteParticipants = activeCall.state.remoteParticipants || [];
      let talking = null;
      for (const p of remoteParticipants) {
        const level = p.audioLevel || 0;
        if (level > 0.05) {
          talking = p.name || 'Someone';
          break;
        }
      }
      setChannelBusy(!!talking);
      setCurrentSpeaker(talking);
    };
    activeCall.state.remoteParticipants$.subscribe((participants) => {
      remoteLevelSubscriptions.current.forEach((s) => s.unsubscribe());
      remoteLevelSubscriptions.current = [];
      participants.forEach((p) => {
        const sub = p.audioLevel$.subscribe(updateBusyState);
        remoteLevelSubscriptions.current.push(sub);
      });
      updateBusyState();
    });
  };

  const stopRemoteLevelTracking = () => {
    remoteLevelSubscriptions.current.forEach((s) => s.unsubscribe());
    remoteLevelSubscriptions.current = [];
    setChannelBusy(false);
    setCurrentSpeaker(null);
  };

  // Push-To-Talk: enable mic publishing + start voice meter.
  // Observers (receive-only) must never transmit.
  // Returns false if blocked by busy lockout so UI can give feedback.
  const startTransmitting = async () => {
    if (activeChannel?.role === 'observer') return false;
    if (channelBusy) return false;
    try {
      if (activeCall) await activeCall.microphone.enable();
      setIsMuted(false);
      console.log('[WebRTC] Microphone ENABLED - Transmitting audio feed');
      startLevelMeter();
      startMicWatchdog();
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
      return true;
    } catch (error) {
      console.error('Error starting audio transmission:', error);
      return false;
    }
  };

  // Push-To-Talk: disable mic publishing + stop voice meter.
  const stopTransmitting = async () => {
    try {
      stopMicWatchdog();
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

  // Mic watchdog: re-enables the mic if it gets disabled mid-transmission.
  // This prevents "voice dying out" when the OS or SDK silently mutes.
  const startMicWatchdog = () => {
    stopMicWatchdog();
    micWatchdogRef.current = setInterval(async () => {
      if (!activeCall || isMuted) return;
      try {
        const isEnabled = activeCall.microphone.enabled;
        if (!isEnabled) {
          console.log('[WebRTC] Watchdog: mic dropped, re-enabling');
          await activeCall.microphone.enable();
        }
      } catch (e) {
        console.warn('[WebRTC] Watchdog error:', e?.message);
      }
    }, 2000);
  };

  const stopMicWatchdog = () => {
    if (micWatchdogRef.current) {
      clearInterval(micWatchdogRef.current);
      micWatchdogRef.current = null;
    }
  };

  const toggleSpeakerphone = async () => {
    const next = !isSpeakerphone;
    setIsSpeakerphone(next);
    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: !next,
      });
    } catch (e) {
      console.warn('[Audio Engine] speakerphone toggle failed:', e.message);
    }
  };

  // Tear down the active call + client (called on logout).
  const disconnect = async () => {
    stopMicWatchdog();
    stopLevelMeter();
    stopRemoteLevelTracking();
    try {
      await activeCall?.leave();
    } catch (e) {
      console.error('[WebRTC] Error leaving call:', e);
    }
    try {
      if (client) await client.disconnectUser();
    } catch (e) {
      console.error('[WebRTC] Error disconnecting client:', e);
    }
    setActiveCall(null);
    setActiveChannel(null);
    setClient(null);
    setReady(false);
    deactivateKeepAwake();
  };

  const leaveChannel = async () => {
    stopMicWatchdog();
    stopLevelMeter();
    stopRemoteLevelTracking();
    try {
      await activeCall?.leave();
    } catch (e) {
      console.error('[WebRTC] Error leaving channel:', e);
    }
    setActiveCall(null);
    setActiveChannel(null);
    deactivateKeepAwake();
  };

  // A member can talk (PTT) unless they are an observer on this channel.
  const canTalk = !!activeChannel && activeChannel.role !== 'observer';
  console.log('[WebRTC] canTalk changed', { activeChannel, canTalk });

  return (
    <WebRTCContext.Provider
      value={{
        isMuted,
        isAudioPermissionGranted,
        isNoiseCancellationActive,
        isSpeakerphone,
        levelValue,
        ready,
        canTalk,
        activeChannel,
        channelBusy,
        currentSpeaker,
        joinChannel,
        leaveChannel,
        startTransmitting,
        stopTransmitting,
        toggleNoiseCancellation,
        toggleSpeakerphone,
        disconnect,
      }}
    >
      {client ? <StreamVideo client={client}>{children}</StreamVideo> : children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = () => useContext(WebRTCContext);
