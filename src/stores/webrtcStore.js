import { create } from 'zustand';
import { Animated } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  StreamVideoClient,
  StreamVideo,
} from '@stream-io/video-react-native-sdk';
import { NoiseCancellation } from '@stream-io/noise-cancellation-react-native';
import Constants from 'expo-constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { callIdFor, fetchStreamToken, getChannelRole } from '../lib/getStream';
import { setPresence } from '../lib/presence';
import { notifyTransmission } from '../lib/notifications';
import useAuthStore from './authStore';

let hasExpoAudio = true;
let requestRecordingPermissionsAsync, setAudioModeAsync;
try {
  const expoAudio = require('expo-audio');
  requestRecordingPermissionsAsync = expoAudio.requestRecordingPermissionsAsync;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
} catch (e) {
  hasExpoAudio = false;
}

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

const useWebRTCStore = create((set, get) => ({
  client: null,
  activeCall: null,
  activeChannel: null,
  ready: false,
  isMuted: true,
  isNoiseCancellationActive: true,
  isAudioPermissionGranted: false,
  isSpeakerphone: false,
  channelBusy: false,
  currentSpeaker: null,
  levelValue: new Animated.Value(0),

  _levelSubscription: null,
  _remoteLevelSubscription: null,
  _micWatchdogRef: null,
  _initPromise: null,
  _joinPromise: null,
  _ncInstance: null,

  initializeClient: (user, crewId) => {
    if (!user) return () => {};

    const existingClient = get().client;
    if (existingClient && existingClient.state.connectedUser?.id === user.uid) {
      console.log('[WebRTC] client already connected for', user.uid);
      set({ ready: true });
      return () => {
        deactivateKeepAwake();
        get().stopMicWatchdog();
        get().stopLevelMeter();
        get().stopRemoteLevelTracking();
        const { activeCall } = get();
        if (activeCall) {
          activeCall.leave().catch((e) => console.warn('[WebRTC] cleanup leave failed:', e.message));
        }
        set({ activeCall: null, activeChannel: null, _joinPromise: null });
      };
    }

    console.log('[WebRTC] initializing client for', user.uid);

    (async () => {
      try {
        if (hasExpoAudio) {
          const { status } = await requestRecordingPermissionsAsync();
          set({ isAudioPermissionGranted: status === 'granted' });
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
            shouldPlayInBackground: true,
            interruptionMode: 'doNotMix',
            shouldRouteThroughEarpiece: true,
          });
        }

        let name = user.email || 'Operator';
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) name = userDoc.data().displayName || name;
        } catch (e) {
          // fall back to email
        }

        const token = await fetchStreamToken(user.uid, crewId);
        if (!token) {
          console.error('[WebRTC] token fetch returned empty');
          return;
        }
        console.log('[WebRTC] token obtained, creating client');
        const streamClient = StreamVideoClient.getOrCreateInstance({
          apiKey: API_KEY,
          user: { id: user.uid, name },
          token,
        });
        console.log('[WebRTC] client created and user connected');

        set({ client: streamClient, ready: true });
        console.log('[WebRTC] ready set to true');
      } catch (err) {
        console.error('[WebRTC] client init failed:', err);
      }
    })();

    return () => {
      deactivateKeepAwake();
      get().stopMicWatchdog();
      get().stopLevelMeter();
      get().stopRemoteLevelTracking();
      const { activeCall } = get();
      if (activeCall) {
        activeCall.leave().catch((e) => console.warn('[WebRTC] cleanup leave failed:', e.message));
      }
      set({ activeCall: null, activeChannel: null, _joinPromise: null });
    };
  },

  joinChannel: async (crewId, channelId) => {
    const { _joinPromise } = get();
    if (_joinPromise) {
      console.log('[WebRTC] joinChannel skipped: join already in progress');
      return;
    }

    const promise = (async () => {
      const { client, activeChannel } = get();
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
        return;
      }

      console.log('[WebRTC] joinChannel start', { crewId, channelId });
      const uid = useAuthStore.getState().user?.uid;
      const role = await getChannelRole(crewId, channelId, uid);
      console.log('[WebRTC] joinChannel role lookup', { crewId, channelId, uid, role });
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

      const guard = (p, ms, label) =>
        Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error(label)), ms))]);
      try {
        await guard(call.microphone.disable(), 5000, 'microphone.disable');
      } catch (e) {
        console.warn('[WebRTC] mic disable skipped:', e.message);
      }

      set({ activeCall: call, activeChannel: { crewId, channelId, role } });
      console.log('[WebRTC] joined channel', { crewId, channelId, role });
      await activateKeepAwakeAsync();
      get().startRemoteLevelTracking();
    })();

    set({ _joinPromise: promise });

    promise.finally(() => {
      set({ _joinPromise: null });
    });
  },

  startLevelMeter: () => {
    const { activeCall, levelValue, _levelSubscription } = get();
    if (!activeCall || _levelSubscription) return;
    const subscription = activeCall.state.localParticipant$.subscribe(
      (participant) => {
        const raw = participant?.audioLevel ?? 0;
        const level = raw > 1 ? raw / 100 : raw;
        levelValue.setValue(Math.min(1, Math.max(0, level)));
      }
    );
    set({ _levelSubscription: subscription });
  },

  stopLevelMeter: () => {
    const { _levelSubscription, levelValue } = get();
    if (_levelSubscription) {
      _levelSubscription.unsubscribe();
      set({ _levelSubscription: null });
    }
    levelValue.setValue(0);
  },

  startRemoteLevelTracking: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    get().stopRemoteLevelTracking();
    const updateBusyState = () => {
      const { activeCall: call } = get();
      if (!call) return;
      const remoteParticipants = call.state.remoteParticipants || [];
      let talking = null;
      for (const p of remoteParticipants) {
        const level = p.audioLevel || 0;
        if (level > 0.05) {
          talking = p.name || 'Someone';
          break;
        }
      }
      set({ channelBusy: !!talking, currentSpeaker: talking });
    };
    const subscription = activeCall.state.remoteParticipants$.subscribe(updateBusyState);
    set({ _remoteLevelSubscription: subscription });
    updateBusyState();
  },

  stopRemoteLevelTracking: () => {
    const { _remoteLevelSubscription } = get();
    if (_remoteLevelSubscription) {
      _remoteLevelSubscription.unsubscribe();
      set({ _remoteLevelSubscription: null });
    }
    set({ channelBusy: false, currentSpeaker: null });
  },

  startTransmitting: async () => {
    const { activeCall, activeChannel, profile } = get();
    const { user } = useAuthStore.getState();
    if (activeChannel?.role === 'observer') return false;
    if (get().channelBusy) return false;
    try {
      if (activeCall) await activeCall.microphone.enable();
      set({ isMuted: false });
      console.log('[WebRTC] Microphone ENABLED - Transmitting audio feed');
      get().startLevelMeter();
      get().startMicWatchdog();
      if (activeChannel && user) {
        await setPresence(activeChannel.crewId, user.uid, 'busy', activeChannel.channelId);
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
  },

  stopTransmitting: async () => {
    const { activeCall, activeChannel } = get();
    const { user } = useAuthStore.getState();
    try {
      get().stopMicWatchdog();
      if (activeCall) await activeCall.microphone.disable();
      set({ isMuted: true });
      console.log('[WebRTC] Microphone DISABLED - Stopped transmission');
      get().stopLevelMeter();
      if (activeChannel && user) {
        await setPresence(activeChannel.crewId, user.uid, 'online');
      }
    } catch (error) {
      console.error('Error stopping audio transmission:', error);
    }
  },

  toggleNoiseCancellation: async () => {
    const { activeCall, isNoiseCancellationActive } = get();
    const next = !isNoiseCancellationActive;

    if (!activeCall) {
      set({ isNoiseCancellationActive: next });
      return;
    }

    let instance = get()._ncInstance;
    if (!instance) {
      instance = new NoiseCancellation();
      set({ _ncInstance: instance });
    }

    try {
      if (next) {
        await activeCall.microphone.enableNoiseCancellation(instance);
      } else {
        await activeCall.microphone.disableNoiseCancellation();
      }
      set({ isNoiseCancellationActive: next });
    } catch (e) {
      console.warn('[WebRTC] Noise cancellation toggle failed:', e.message);
    }
  },

  startMicWatchdog: () => {
    get().stopMicWatchdog();
    const interval = setInterval(async () => {
      const currentCall = get().activeCall;
      const currentMuted = get().isMuted;
      if (!currentCall || currentMuted) return;
      try {
        const isEnabled = currentCall.microphone.enabled;
        if (!isEnabled) {
          console.log('[WebRTC] Watchdog: mic dropped, re-enabling');
          await currentCall.microphone.enable();
        }
      } catch (e) {
        console.warn('[WebRTC] Watchdog error:', e?.message);
      }
    }, 2000);
    set({ _micWatchdogRef: interval });
  },

  stopMicWatchdog: () => {
    const { _micWatchdogRef } = get();
    if (_micWatchdogRef) {
      clearInterval(_micWatchdogRef);
      set({ _micWatchdogRef: null });
    }
  },

  toggleSpeakerphone: async () => {
    const next = !get().isSpeakerphone;
    set({ isSpeakerphone: next });
    if (hasExpoAudio) {
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
    }
  },

  disconnect: async () => {
    const { activeCall, client } = get();
    get().stopMicWatchdog();
    get().stopLevelMeter();
    get().stopRemoteLevelTracking();
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
    set({
      activeCall: null,
      activeChannel: null,
      client: null,
      ready: false,
      _joinPromise: null,
    });
    deactivateKeepAwake();
  },

  leaveChannel: async () => {
    const { activeCall } = get();
    if (!activeCall) return;
    get().stopMicWatchdog();
    get().stopLevelMeter();
    get().stopRemoteLevelTracking();
    try {
      await activeCall.leave();
    } catch (e) {
      console.error('[WebRTC] Error leaving channel:', e);
    }
    set({ activeCall: null, activeChannel: null, _joinPromise: null });
    deactivateKeepAwake();
  },
}));

export default useWebRTCStore;
