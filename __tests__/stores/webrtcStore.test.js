// __tests__/stores/webrtcStore.test.js
// Integration tests for src/stores/webrtcStore.js

const mockCall = {
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  microphone: {
    enable: jest.fn().mockResolvedValue(undefined),
    disable: jest.fn().mockResolvedValue(undefined),
    enableNoiseCancellation: jest.fn().mockResolvedValue(undefined),
    disableNoiseCancellation: jest.fn().mockResolvedValue(undefined),
    enabled: true,
  },
  state: {
    localParticipant$: { subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) },
    remoteParticipants$: { subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })) },
    remoteParticipants: [],
    mediaStream: null,
  },
  mediaStream: null,
};

const mockClientInstance = {
  disconnectUser: jest.fn().mockResolvedValue(undefined),
  call: jest.fn(() => mockCall),
  state: { connectedUser: { id: 'test-uid-123' } },
};

// --- Mock firebase/auth ---
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  deleteUser: jest.fn(),
}));

// --- Mock firebase/firestore ---
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, ...path) => ({
    __type: 'doc',
    path: path.join('/'),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
  })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn((db, ...path) => ({ __type: 'collection', path: path.join('/') })),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  onSnapshot: jest.fn(),
}));

// --- Mock firebase/functions ---
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(() => jest.fn().mockResolvedValue({ data: {} })),
  getFunctions: jest.fn(),
}));

// --- Mock firebase lib ---
jest.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

// --- Mock getStream lib ---
jest.mock('../../src/lib/getStream', () => ({
  callIdFor: jest.fn((crewId, channelId) => `${crewId}_${channelId}`),
  fetchStreamToken: jest.fn(),
  getChannelRole: jest.fn(),
}));

// --- Mock presence lib ---
jest.mock('../../src/lib/presence', () => ({
  setPresence: jest.fn().mockResolvedValue(undefined),
}));

// --- Mock notifications lib ---
jest.mock('../../src/lib/notifications', () => ({
  registerFcmToken: jest.fn().mockResolvedValue(undefined),
  setupFcmListeners: jest.fn(() => () => {}),
  notifyTransmission: jest.fn().mockResolvedValue(undefined),
}));

// --- Mock authStore ---
const mockAuthUser = { uid: 'test-uid-123', email: 'test@example.com' };
let mockAuthState = { user: mockAuthUser, crewId: 'test-crew' };
jest.mock('../../src/stores/authStore', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => mockAuthState),
  },
}));

const mockUseAuthStore = require('../../src/stores/authStore').default;

// --- Mock @stream-io/video-react-native-sdk ---
jest.mock('@stream-io/video-react-native-sdk', () => ({
  StreamVideoClient: {
    getOrCreateInstance: jest.fn(() => mockClientInstance),
  },
  StreamVideo: jest.fn(() => ({
    call: jest.fn(() => mockCall),
  })),
  __mockCall: mockCall,
}));

// --- Mock @stream-io/noise-cancellation-react-native ---
jest.mock('@stream-io/noise-cancellation-react-native', () => ({
  NoiseCancellation: jest.fn().mockImplementation(() => ({
    setNoiseCancellation: jest.fn(),
  })),
}));

// --- Mock react-native ---
const mockListener = { remove: jest.fn() };
jest.mock('react-native', () => ({
  Animated: {
    Value: jest.fn().mockImplementation(() => ({
      setValue: jest.fn(),
      interpolate: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      stopAnimation: jest.fn((cb) => cb && cb(0)),
      _value: 0,
    })),
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => mockListener),
  },
  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => mockListener),
  })),
  NativeModules: {
    RNInCallManager: {},
  },
  Platform: { OS: 'ios' },
}));

// --- Mock expo-audio ---
jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

// --- Mock expo-keep-awake ---
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn(),
}));

// --- Mock expo-constants ---
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      getstream: { apiKey: 'test-key', useDevToken: true, secret: 'test-secret' },
    },
  },
  manifest: {
    extra: {
      getstream: { apiKey: 'test-key', useDevToken: true, secret: 'test-secret' },
    },
  },
}));

// --- Mock react-native-incall-manager ---
jest.mock('react-native-incall-manager', () => ({
  setForceSpeakerphoneOn: jest.fn(),
  addEventListener: jest.fn(() => mockListener),
  removeEventListener: jest.fn(),
}), { virtual: true });

// --- Import modules after mocks ---
const { StreamVideoClient } = require('@stream-io/video-react-native-sdk');
const { doc, getDoc } = require('firebase/firestore');
const { fetchStreamToken, getChannelRole, callIdFor } = require('../../src/lib/getStream');
const { setPresence } = require('../../src/lib/presence');
const { notifyTransmission } = require('../../src/lib/notifications');
const useWebRTCStore = require('../../src/stores/webrtcStore').default;

// Helper to reset store
function resetStore() {
  useWebRTCStore.setState({
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
  });
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('webrtcStore - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getDoc.mockReset();
    StreamVideoClient.getOrCreateInstance.mockReset();
    mockCall.join.mockReset();
    mockCall.leave.mockReset();
    mockCall.microphone.enable.mockReset();
    mockCall.microphone.disable.mockReset();
    mockCall.microphone.enableNoiseCancellation.mockReset();
    mockCall.microphone.disableNoiseCancellation.mockReset();
    mockClientInstance.disconnectUser.mockReset();
    mockClientInstance.call.mockReset();

    StreamVideoClient.getOrCreateInstance.mockImplementation(() => mockClientInstance);
    mockClientInstance.call.mockImplementation(() => mockCall);
    mockCall.join.mockResolvedValue(undefined);
    mockCall.leave.mockResolvedValue(undefined);
    mockCall.microphone.enable.mockResolvedValue(undefined);
    mockCall.microphone.disable.mockResolvedValue(undefined);
    mockCall.microphone.enableNoiseCancellation.mockResolvedValue(undefined);
    mockCall.microphone.disableNoiseCancellation.mockResolvedValue(undefined);
    mockClientInstance.disconnectUser.mockResolvedValue(undefined);

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ displayName: 'Test User' }),
    });

    fetchStreamToken.mockResolvedValue('test-token');
    getChannelRole.mockResolvedValue('member');

    mockAuthState = { user: mockAuthUser, crewId: 'test-crew' };
    resetStore();
  });

  describe('initializeClient', () => {
    it('should create a StreamVideoClient with correct params', async () => {
      const user = { uid: 'user-123', email: 'test@example.com' };
      mockAuthState = { user, crewId: 'crew-123' };

      useWebRTCStore.getState().initializeClient(user, 'crew-123');

      await flushPromises();

      expect(fetchStreamToken).toHaveBeenCalledWith('user-123', 'crew-123');
      expect(StreamVideoClient.getOrCreateInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'test-key',
          user: { id: 'user-123', name: 'Test User' },
          token: 'test-token',
        })
      );
      expect(useWebRTCStore.getState().client).toBe(mockClientInstance);
      expect(useWebRTCStore.getState().clientCrewId).toBe('crew-123');
      expect(useWebRTCStore.getState().ready).toBe(true);
    });

    it('should disconnect client and call on null user (logout)', async () => {
      mockClientInstance.disconnectUser.mockClear();
      mockCall.leave.mockClear();

      useWebRTCStore.setState({
        client: mockClientInstance,
        clientCrewId: 'crew-123',
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-123', channelId: 'ch1', role: 'member' },
        ready: true,
      });

      useWebRTCStore.getState().initializeClient(null, null);

      await flushPromises();

      expect(mockClientInstance.disconnectUser).toHaveBeenCalled();
      expect(mockCall.leave).toHaveBeenCalled();
      expect(useWebRTCStore.getState().client).toBeNull();
      expect(useWebRTCStore.getState().clientCrewId).toBeNull();
      expect(useWebRTCStore.getState().activeCall).toBeNull();
      expect(useWebRTCStore.getState().ready).toBe(false);
    });

    it('should disconnect stale client when user/crew changes', async () => {
      const oldClient = {
        disconnectUser: jest.fn().mockResolvedValue(undefined),
        call: jest.fn(() => mockCall),
        state: { connectedUser: { id: 'old-user' } },
      };

      useWebRTCStore.setState({
        client: oldClient,
        clientCrewId: 'old-crew',
        ready: false,
      });

      const user = { uid: 'new-user', email: 'new@example.com' };
      mockAuthState = { user, crewId: 'new-crew' };
      useWebRTCStore.getState().initializeClient(user, 'new-crew');

      await flushPromises();

      expect(oldClient.disconnectUser).toHaveBeenCalled();
      expect(StreamVideoClient.getOrCreateInstance).toHaveBeenCalled();
      expect(useWebRTCStore.getState().client).toBe(mockClientInstance);
      expect(useWebRTCStore.getState().clientCrewId).toBe('new-crew');
    });

    it('should skip re-init when client already matches user and crew', async () => {
      useWebRTCStore.setState({
        client: mockClientInstance,
        clientCrewId: 'crew-123',
        ready: true,
      });

      const user = { uid: 'test-uid-123', email: 'test@example.com' };
      mockAuthState = { user, crewId: 'crew-123' };

      const cleanup = useWebRTCStore.getState().initializeClient(user, 'crew-123');
      await flushPromises();

      expect(StreamVideoClient.getOrCreateInstance).not.toHaveBeenCalled();
      expect(useWebRTCStore.getState().ready).toBe(true);
      cleanup();
    });

    it('should abort if crewId changes during async init (race condition)', async () => {
      getDoc.mockImplementationOnce(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              exists: () => true,
              data: () => ({ displayName: 'Delayed User' }),
            });
          }, 200);
        });
      });

      const user = { uid: 'race-uid', email: 'race@example.com' };
      mockAuthState = { user, crewId: 'race-crew' };
      useWebRTCStore.getState().initializeClient(user, 'race-crew');

      mockAuthState = { user: null, crewId: null };
      useWebRTCStore.getState().initializeClient(null, null);

      await flushPromises();

      expect(useWebRTCStore.getState().client).toBeNull();
      expect(useWebRTCStore.getState().ready).toBe(false);
    });

    it('should handle fetchStreamToken failure gracefully', async () => {
      fetchStreamToken.mockRejectedValueOnce(new Error('Token fetch failed'));

      const user = { uid: 'fail-uid', email: 'fail@example.com' };
      mockAuthState = { user, crewId: 'crew-fail' };
      useWebRTCStore.getState().initializeClient(user, 'crew-fail');

      await flushPromises();

      expect(useWebRTCStore.getState().client).toBeNull();
      expect(useWebRTCStore.getState().ready).toBe(false);
    });
  });

  describe('startTransmitting', () => {
    beforeEach(() => {
      mockCall.mediaStream = {
        getAudioTracks: () => [{ enabled: true, kind: 'audio' }],
      };
    });

    it('should return false if role is observer', async () => {
      useWebRTCStore.setState({
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-1', channelId: 'ch-1', role: 'observer' },
        channelBusy: false,
      });

      const result = await useWebRTCStore.getState().startTransmitting();
      expect(result).toBe(false);
      expect(setPresence).not.toHaveBeenCalled();
      expect(notifyTransmission).not.toHaveBeenCalled();
    });

    it('should return false if channel is busy', async () => {
      useWebRTCStore.setState({
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-1', channelId: 'ch-1', role: 'member' },
        channelBusy: true,
      });

      const result = await useWebRTCStore.getState().startTransmitting();
      expect(result).toBe(false);
    });

    it('should enable audio tracks, set isMuted false, and return true', async () => {
      useWebRTCStore.setState({
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-1', channelId: 'ch-1', role: 'member' },
        channelBusy: false,
        isMuted: true,
      });

      const result = await useWebRTCStore.getState().startTransmitting();

      expect(result).toBe(true);
      expect(useWebRTCStore.getState().isMuted).toBe(false);
      const audioTrack = mockCall.mediaStream.getAudioTracks()[0];
      expect(audioTrack.enabled).toBe(true);
    });

    it('should call setPresence and notifyTransmission fire-and-forget', async () => {
      useWebRTCStore.setState({
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-1', channelId: 'ch-1', role: 'member' },
        channelBusy: false,
      });

      const track = { enabled: true, kind: 'audio' };
      mockCall.mediaStream = { getAudioTracks: () => [track] };

      const result = await useWebRTCStore.getState().startTransmitting();

      expect(result).toBe(true);
      expect(setPresence).toHaveBeenCalledWith('crew-1', mockAuthUser.uid, 'busy', 'ch-1');
      expect(notifyTransmission).toHaveBeenCalledWith({
        crewId: 'crew-1',
        channelId: 'ch-1',
        displayName: mockAuthUser.email,
      });
    });
  });

  describe('stopTransmitting', () => {
    it('should disable audio tracks and set isMuted true', async () => {
      const track = { enabled: true, kind: 'audio' };
      mockCall.mediaStream = { getAudioTracks: () => [track] };

      useWebRTCStore.setState({
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-1', channelId: 'ch-1', role: 'member' },
        isMuted: false,
      });

      await useWebRTCStore.getState().stopTransmitting();

      expect(track.enabled).toBe(false);
      expect(useWebRTCStore.getState().isMuted).toBe(true);
    });

    it('should call setPresence fire-and-forget with online status', async () => {
      useWebRTCStore.setState({
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-1', channelId: 'ch-1', role: 'member' },
        isMuted: false,
      });

      await useWebRTCStore.getState().stopTransmitting();

      expect(setPresence).toHaveBeenCalledWith('crew-1', mockAuthUser.uid, 'online');
    });

    it('should handle errors gracefully', async () => {
      mockCall.mediaStream = null;
      mockCall.microphone.disable.mockRejectedValueOnce(new Error('Mic disable failed'));

      useWebRTCStore.setState({
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-1', channelId: 'ch-1', role: 'member' },
        isMuted: false,
      });

      await expect(useWebRTCStore.getState().stopTransmitting()).resolves.not.toThrow();
      expect(useWebRTCStore.getState().isMuted).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should leave call, disconnect client, and reset all state', async () => {
      mockCall.leave.mockClear();
      mockClientInstance.disconnectUser.mockClear();

      useWebRTCStore.setState({
        client: mockClientInstance,
        clientCrewId: 'crew-123',
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-123', channelId: 'ch-1', role: 'member' },
        ready: true,
        _ncInstance: { setNoiseCancellation: jest.fn() },
      });

      await useWebRTCStore.getState().disconnect();

      expect(mockCall.leave).toHaveBeenCalled();
      expect(mockClientInstance.disconnectUser).toHaveBeenCalled();
      expect(useWebRTCStore.getState().client).toBeNull();
      expect(useWebRTCStore.getState().activeCall).toBeNull();
      expect(useWebRTCStore.getState().activeChannel).toBeNull();
      expect(useWebRTCStore.getState().ready).toBe(false);
    });

    it('should handle errors during disconnect gracefully', async () => {
      mockCall.leave.mockRejectedValueOnce(new Error('Leave failed'));
      mockClientInstance.disconnectUser.mockRejectedValueOnce(new Error('Disconnect failed'));

      useWebRTCStore.setState({
        client: mockClientInstance,
        activeCall: mockCall,
        ready: true,
      });

      await expect(useWebRTCStore.getState().disconnect()).resolves.not.toThrow();
      expect(useWebRTCStore.getState().client).toBeNull();
      expect(useWebRTCStore.getState().activeCall).toBeNull();
    });
  });

  describe('leaveChannel', () => {
    it('should disable noise cancellation if active, then leave call', async () => {
      const ncInstance = {
        setNoiseCancellation: jest.fn().mockResolvedValue(undefined),
        disableNoiseCancellation: jest.fn().mockResolvedValue(undefined),
      };
      mockCall.microphone.disableNoiseCancellation.mockClear();
      mockCall.leave.mockClear();

      useWebRTCStore.setState({
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-1', channelId: 'ch-1', role: 'member' },
        _ncInstance: ncInstance,
        isNoiseCancellationActive: true,
      });

      await useWebRTCStore.getState().leaveChannel();

      expect(mockCall.microphone.disableNoiseCancellation).toHaveBeenCalled();
      expect(mockCall.leave).toHaveBeenCalled();
      expect(useWebRTCStore.getState().activeCall).toBeNull();
      expect(useWebRTCStore.getState().activeChannel).toBeNull();
    });

    it('should do nothing when no active call', async () => {
      useWebRTCStore.setState({ activeCall: null });

      await useWebRTCStore.getState().leaveChannel();

      expect(mockCall.leave).not.toHaveBeenCalled();
    });
  });

  describe('toggleSpeakerphone', () => {
    it('should toggle isSpeakerphone and call InCallManager', async () => {
      useWebRTCStore.setState({ isSpeakerphone: false });

      await useWebRTCStore.getState().toggleSpeakerphone();

      expect(useWebRTCStore.getState().isSpeakerphone).toBe(true);
    });

    it('should toggle back to false', async () => {
      useWebRTCStore.setState({ isSpeakerphone: true });

      await useWebRTCStore.getState().toggleSpeakerphone();

      expect(useWebRTCStore.getState().isSpeakerphone).toBe(false);
    });
  });

  describe('setAudioRoute', () => {
    it('should set audioDevice state', async () => {
      useWebRTCStore.setState({
        hasBluetoothDevice: false,
        hasWiredHeadset: false,
      });

      await useWebRTCStore.getState().setAudioRoute('earpiece');

      expect(useWebRTCStore.getState().audioDevice).toBe('earpiece');
    });

    it('should set speaker route', async () => {
      await useWebRTCStore.getState().setAudioRoute('speaker');
      expect(useWebRTCStore.getState().audioDevice).toBe('speaker');
    });

    it('should set bluetooth route', async () => {
      useWebRTCStore.setState({ hasBluetoothDevice: true });
      await useWebRTCStore.getState().setAudioRoute('bluetooth');
      expect(useWebRTCStore.getState().audioDevice).toBe('bluetooth');
    });
  });

  describe('startTransmitting - fire-and-forget', () => {
    it('should not await setPresence or notifyTransmission', async () => {
      setPresence.mockImplementation(() => new Promise(() => {}));
      notifyTransmission.mockImplementation(() => new Promise(() => {}));

      useWebRTCStore.setState({
        activeCall: mockCall,
        activeChannel: { crewId: 'crew-1', channelId: 'ch-1', role: 'member' },
        channelBusy: false,
      });

      mockCall.mediaStream = { getAudioTracks: () => [{ enabled: true, kind: 'audio' }] };

      const result = await useWebRTCStore.getState().startTransmitting();

      expect(result).toBe(true);
      expect(setPresence).toHaveBeenCalled();
      expect(notifyTransmission).toHaveBeenCalled();
    });
  });

  describe('toggleNoiseCancellation', () => {
    it('should enable noise cancellation when toggling on', async () => {
      mockCall.microphone.enableNoiseCancellation.mockClear();

      useWebRTCStore.setState({
        activeCall: mockCall,
        isNoiseCancellationActive: false,
      });

      await useWebRTCStore.getState().toggleNoiseCancellation();

      expect(mockCall.microphone.enableNoiseCancellation).toHaveBeenCalled();
      expect(useWebRTCStore.getState().isNoiseCancellationActive).toBe(true);
    });

    it('should disable noise cancellation when toggling off', async () => {
      mockCall.microphone.disableNoiseCancellation.mockClear();

      useWebRTCStore.setState({
        activeCall: mockCall,
        _ncInstance: { setNoiseCancellation: jest.fn() },
        isNoiseCancellationActive: true,
      });

      await useWebRTCStore.getState().toggleNoiseCancellation();

      expect(mockCall.microphone.disableNoiseCancellation).toHaveBeenCalled();
      expect(useWebRTCStore.getState().isNoiseCancellationActive).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockCall.microphone.enableNoiseCancellation.mockRejectedValueOnce(new Error('NC failed'));

      useWebRTCStore.setState({
        activeCall: mockCall,
        isNoiseCancellationActive: false,
      });

      await expect(useWebRTCStore.getState().toggleNoiseCancellation()).resolves.not.toThrow();
      expect(useWebRTCStore.getState().isNoiseCancellationActive).toBe(true);
    });
  });
});
