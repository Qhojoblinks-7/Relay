// jest.mocks.js - Global mocks for Relay tests
import { jest } from '@jest/globals';

// Mock React Native modules that aren't available in test environment
jest.mock('react-native/Libraries/Animated/Animated', () => {
  const ActualAnimated = jest.requireActual('react-native/Libraries/Animated/Animated');
  return {
    ...ActualAnimated,
    Value: jest.fn().mockImplementation((val) => ({
      setValue: jest.fn(),
      interpolate: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      stopAnimation: jest.fn((cb) => cb && cb(val)),
      _value: val,
    })),
    timing: jest.fn().mockImplementation((value, config) => ({
      start: jest.fn((cb) => cb && cb()),
      stop: jest.fn(),
    })),
    spring: jest.fn().mockImplementation((value, config) => ({
      start: jest.fn((cb) => cb && cb()),
      stop: jest.fn(),
    })),
    parallel: jest.fn().mockImplementation((animations) => ({
      start: jest.fn((cb) => cb && cb()),
      stop: jest.fn(),
    })),
  };
});

// Mock expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      getstream: {
        apiKey: 'test-api-key',
        useDevToken: true,
        secret: 'test-secret',
      },
      firebase: {
        apiKey: 'test-api-key',
        project_id: 'test-project',
      },
    },
  },
  manifest: {
    extra: {
      getstream: {
        apiKey: 'test-api-key',
        useDevToken: true,
        secret: 'test-secret',
      },
    },
  },
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Test',
  modelName: 'Test Device',
  osName: 'TestOS',
  osVersion: '1.0',
}));

// Mock @react-native-firebase/messaging
 jest.mock('@react-native-firebase/messaging', () => ({
   default: jest.fn().mockImplementation(() => ({
     requestPermission: jest.fn().mockResolvedValue(1),
     getToken: jest.fn().mockResolvedValue('test-fcm-token'),
     onTokenRefresh: jest.fn(),
     onMessage: jest.fn(),
     setBackgroundMessageHandler: jest.fn(),
  })),
}), { virtual: true });

// Mock react-native-incall-manager
 jest.mock('react-native-incall-manager', () => ({
   setForceSpeakerphoneOn: jest.fn(),
   addEventListener: jest.fn(() => ({ remove: jest.fn() })),
   removeEventListener: jest.fn(),
 }), { virtual: true });

// Mock @stream-io/video-react-native-sdk
jest.mock('@stream-io/video-react-native-sdk', () => {
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

  return {
    StreamVideoClient: {
      getOrCreateInstance: jest.fn(() => ({
        disconnectUser: jest.fn().mockResolvedValue(undefined),
        call: jest.fn(() => mockCall),
        state: { connectedUser: { id: 'test-user' } },
      })),
    },
    StreamVideo: jest.fn(() => ({
      call: jest.fn(() => mockCall),
    })),
    __mockCall: mockCall,
  };
});

// Mock @stream-io/noise-cancellation-react-native
jest.mock('@stream-io/noise-cancellation-react-native', () => ({
  NoiseCancellation: jest.fn().mockImplementation(() => ({
    setNoiseCancellation: jest.fn(),
  })),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => {
  const mockIcon = jest.fn(() => null);
  return new Proxy({}, {
    get: () => mockIcon,
  });
});

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  return function MockQRCode() {
    return null;
  };
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  return function MockSvg() {
    return null;
  };
});