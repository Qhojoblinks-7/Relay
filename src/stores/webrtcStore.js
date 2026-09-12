import { create } from 'zustand';
import { Animated, AppState, Vibration, NativeEventEmitter, NativeModules, Platform } from 'react-native';
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
import InCallManager from 'react-native-incall-manager';

let hasExpoAudio = true;
let requestRecordingPermissionsAsync, setAudioModeAsync;
try {
  const expoAudio = require('expo-audio');
  requestRecordingPermissionsAsync = expoAudio.requestRecordingPermissionsAsync;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
} catch (e) {
  hasExpoAudio = false;
}

const hasInCallManager = typeof InCallManager !== 'undefined' && InCallManager !== null;

let _audioDeviceSub = null;
let _btPermissionSub = null;

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
  clientCrewId: null,
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
  audioDevice: 'speaker',
  hasBluetoothDevice: false,
  hasWiredHeadset: false,
  isProximityNear: false,

  _levelSubscription: null,
  _remoteLevelSubscription: null,
  _micWatchdogRef: null,
  _initPromise: null,
  _joinPromise: null,
  _ncInstance: null,
  _audioDeviceSub: null,

  initializeClient: (user, crewId) => {
    if (!user) {
      const { client, activeCall } = get();
      if (client) {
        client.disconnectUser().catch((e) =>
          console.warn('[WebRTC] auto-disconnect on logout failed:', e.message)
        );
      }
      if (activeCall) {
        activeCall.leave().catch((e) =>
          console.warn('[WebRTC] cleanup leave on logout failed:', e.message)
        );
      }
      set({
        client: null,
        clientCrewId: null,
        activeCall: null,
        activeChannel: null,
        ready: false,
        _joinPromise: null,
      });
      return () => {};
    }

    const existingClient = get().client;
    const existingCrewId = get().clientCrewId;
    if (existingClient && existingClient.state.connectedUser?.id === user.uid && existingCrewId === crewId) {
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

    if (existingClient) {
      existingClient.disconnectUser().catch((e) =>
        console.warn('[WebRTC] disconnect old client failed:', e.message)
      );
    }

    console.log('[WebRTC] initializing client for', user.uid);

    (async () => {
      let cancelled = false;
      const check = () => {
        const { user: curUser, crewId: curCrewId } = get();
        if (curUser?.uid !== user.uid || curCrewId !== crewId) {
          cancelled = true;
        }
      };

      try {
        if (hasExpoAudio) {
          const { status } = await requestRecordingPermissionsAsync();
          if (cancelled) return;
          set({ isAudioPermissionGranted: status === 'granted' });
          await setAudioModeAsync({
            allowsRecording: true,
            playsInSilentMode: true,
            shouldPlayInBackground: true,
            interruptionMode: 'doNotMix',
            // Don't force earpiece — let the system pick the best route
            // (Bluetooth headset, wired headphone, or speaker) so we don't
            // override an active Bluetooth connection on iOS.
            shouldRouteThroughEarpiece: false,
          });
        }

        if (cancelled) return;

        let name = user.email || 'Operator';
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (cancelled) return;
          if (userDoc.exists()) name = userDoc.data().displayName || name;
        } catch (e) {
          // fall back to email
        }

        if (cancelled) return;

        const token = await fetchStreamToken(user.uid, crewId);
        if (!token || cancelled) return;
        const streamClient = StreamVideoClient.getOrCreateInstance({
          apiKey: API_KEY,
          user: { id: user.uid, name },
          token,
        });

        set({ client: streamClient, clientCrewId: crewId, ready: true });
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
        await guard(call.microphone.enable(), 5000, 'microphone.enable');
        const stream = call.state?.mediaStream || call.mediaStream;
        if (stream) {
          stream.getAudioTracks().forEach((t) => { t.enabled = false; });
        }
        console.log('[WebRTC] Microphone stay-enabled + muted for low-latency PTT');
      } catch (e) {
        console.warn('[WebRTC] Mic pre-enable skipped:', e.message);
      }

      set({ activeCall: call, activeChannel: { crewId, channelId, role } });
      console.log('[WebRTC] joined channel', { crewId, channelId, role });
      await activateKeepAwakeAsync();
      get().startRemoteLevelTracking();

      try {
        await get().enableNoiseCancellation();
      } catch (e) {
        console.warn('[WebRTC] auto NC failed:', e.message);
      }
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
    let wasBusy = false;

    const vibrateForIncoming = () => {
      const appState = AppState.currentState;
      if (appState === 'background' || appState === 'inactive') {
        Vibration.vibrate([0, 200, 100, 200]);
      }
    };

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
      const newBusy = !!talking;
      if (newBusy && !wasBusy) {
        vibrateForIncoming();
      }
      wasBusy = newBusy;
      set({ channelBusy: newBusy, currentSpeaker: talking });
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
    Vibration.cancel();
    set({ channelBusy: false, currentSpeaker: null });
  },

  startTransmitting: async () => {
    const { activeCall, activeChannel, profile } = get();
    const { user } = useAuthStore.getState();
    if (activeChannel?.role === 'observer') return false;
    if (get().channelBusy) return false;
    try {
      if (activeCall) {
        const stream = activeCall.state?.mediaStream || activeCall.mediaStream;
        if (stream && stream.getAudioTracks().length > 0) {
          stream.getAudioTracks().forEach((t) => { t.enabled = true; });
          console.log('[WebRTC] Audio track unmuted (low-latency PTT)');
        } else {
          await activeCall.microphone.enable();
          console.log('[WebRTC] Microphone ENABLED (fallback) - Transmitting');
        }
      }
      set({ isMuted: false });
      get().startLevelMeter();
      get().startMicWatchdog();

      // Presence/notification in background — don't block PTT feedback
      if (activeChannel && user) {
        const ch = activeChannel;
        const u = user;
        const displayName = profile?.displayName || u.email;
        setPresence(ch.crewId, u.uid, 'busy', ch.channelId).catch(() => {});
        notifyTransmission({
          crewId: ch.crewId,
          channelId: ch.channelId,
          displayName,
        }).catch(() => {});
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
      if (activeCall) {
        const stream = activeCall.state?.mediaStream || activeCall.mediaStream;
        if (stream && stream.getAudioTracks().length > 0) {
          stream.getAudioTracks().forEach((t) => { t.enabled = false; });
          console.log('[WebRTC] Audio track muted (low-latency PTT)');
        } else {
          await activeCall.microphone.disable();
          console.log('[WebRTC] Microphone DISABLED (fallback)');
        }
      }
      set({ isMuted: true });
      get().stopLevelMeter();
      if (activeChannel && user) {
        const ch = activeChannel;
        const u = user;
        setPresence(ch.crewId, u.uid, 'online').catch(() => {});
      }
    } catch (error) {
      console.error('Error stopping audio transmission:', error);
    }
  },

  enableNoiseCancellation: async () => {
    const { activeCall, isNoiseCancellationActive, _ncInstance } = get();
    if (!activeCall || isNoiseCancellationActive) return;

    let instance = _ncInstance;
    if (!instance) {
      instance = new NoiseCancellation();
      set({ _ncInstance: instance });
    }

    try {
      await activeCall.microphone.enableNoiseCancellation(instance);
      set({ isNoiseCancellationActive: true });
      console.log('[WebRTC] Noise cancellation enabled by default');
    } catch (e) {
      console.warn('[WebRTC] Noise cancellation enable failed:', e.message);
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

  requestBluetoothPermission: async () => {
    if (Platform.OS !== 'android') return true;
    if (!_btPermissionSub) {
      try {
        const { PermissionsAndroid } = require('react-native');
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        ]);
        const allGranted = Object.values(granted).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
        return allGranted;
      } catch (e) {
        console.warn('[Audio Engine] Bluetooth permission request failed:', e.message);
        return false;
      }
    }
    return true;
  },

  toggleSpeakerphone: async () => {
    const next = !get().isSpeakerphone;
    set({ isSpeakerphone: next });
    const mode = {
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'duckOthers',
      shouldRouteThroughEarpiece: false,
    };
    if (hasExpoAudio) {
      try {
        await setAudioModeAsync(mode);
      } catch (e) {
        console.warn('[Audio Engine] speakerphone toggle failed:', e.message);
      }
    }
    if (hasInCallManager) {
      try {
        InCallManager.setForceSpeakerphoneOn(next);
      } catch (e) {
        console.warn('[Audio Engine] InCallManager speaker toggle failed:', e.message);
      }
    }
  },

  setAudioRoute: async (route) => {
    const { hasBluetoothDevice, hasWiredHeadset } = get();
    set({ audioDevice: route });

    if (hasExpoAudio) {
      try {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'duckOthers',
          shouldRouteThroughEarpiece: route === 'earpiece' && !hasBluetoothDevice && !hasWiredHeadset,
        });
      } catch (e) {
        console.warn('[Audio Engine] setAudioRoute expo failed:', e.message);
      }
    }

    if (hasInCallManager) {
      try {
        const force = route === 'speaker' || route === 'bluetooth';
        InCallManager.setForceSpeakerphoneOn(force);
      } catch (e) {
        console.warn('[Audio Engine] setAudioRoute InCallManager failed:', e.message);
      }
    }
  },

  startAudioDeviceTracking: () => {
    if (!hasInCallManager) return;
    if (_audioDeviceSub) return;
    try {
      const emitter = new NativeEventEmitter(NativeModules.RNInCallManager);
      _audioDeviceSub = emitter.addListener('AudioBundle', ({ devices }) => {
        if (!devices) return;
        const hasBT = devices.some((d) => d.type === 'bluetooth' || d.type === 'bluetoothA2dp' || d.type === 'bluetoothSco');
        const hasWH = devices.some((d) => d.type === 'wiredHeadset' || d.type === 'headphones');
        set({
          hasBluetoothDevice: hasBT,
          hasWiredHeadset: hasWH,
        });
      });
    } catch (e) {
      try {
        if (typeof InCallManager.addEventListener === 'function') {
          _audioDeviceSub = InCallManager.addEventListener('AudioBundle', ({ devices }) => {
            if (!devices) return;
            const hasBT = devices.some((d) => d.type === 'bluetooth' || d.type === 'bluetoothA2dp' || d.type === 'bluetoothSco');
            const hasWH = devices.some((d) => d.type === 'wiredHeadset' || d.type === 'headphones');
            set({
              hasBluetoothDevice: hasBT,
              hasWiredHeadset: hasWH,
            });
          });
        }
      } catch (e2) {
        console.warn('[Audio Engine] device tracking setup failed:', e2.message);
      }
    }
  },

  stopAudioDeviceTracking: () => {
    if (_audioDeviceSub) {
      _audioDeviceSub.remove?.();
      _audioDeviceSub = null;
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
      clientCrewId: null,
      ready: false,
      isNoiseCancellationActive: false,
      isSpeakerphone: false,
      _joinPromise: null,
      _ncInstance: null,
    });
    get().stopAudioDeviceTracking();
    deactivateKeepAwake();
  },

  leaveChannel: async () => {
    const { activeCall, _ncInstance } = get();
    if (!activeCall) return;
    get().stopMicWatchdog();
    get().stopLevelMeter();
    get().stopRemoteLevelTracking();
    try {
      if (_ncInstance) {
        await activeCall.microphone.disableNoiseCancellation();
      }
    } catch (e) {
      console.warn('[WebRTC] NC disable on leave failed:', e?.message);
    }
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
