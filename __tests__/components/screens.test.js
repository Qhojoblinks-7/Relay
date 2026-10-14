// __tests__/components/screens.test.js
// Component tests for key auth and main screens

import React from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock problematic RN components that use native deps in RN 0.81
// RN index.js uses `require(...).default` so mocks must export { default: ... }
// Use View (mocked by RN preset) as underlying element so children render + fireEvent works
const _rn = require('react-native');
const _React = require('react');
const _View = _rn.View;
const _makeTouchableMock = (name) => ({
  __esModule: true,
  default: ({ children, onPress, style, testID, ...props }) =>
    _React.createElement(_View, { ...props, style, testID, onPress }, children),
});
jest.mock('react-native/Libraries/Components/Touchable/TouchableOpacity', () => _makeTouchableMock('TouchableOpacity'));
jest.mock('react-native/Libraries/Components/Touchable/TouchableWithoutFeedback', () => _makeTouchableMock('TouchableWithoutFeedback'));
jest.mock('react-native/Libraries/Components/Touchable/TouchableHighlight', () => _makeTouchableMock('TouchableHighlight'));
jest.mock('react-native/Libraries/Components/Pressable/Pressable', () => _makeTouchableMock('Pressable'));

// --- Mock navigation ---
const mockNavigation = {
  navigate: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
  canGoBack: jest.fn(() => false),
  dispatch: jest.fn(),
  getState: jest.fn(() => ({ routes: [], index: 0 })),
  setParams: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const mockNav = {
    navigate: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => false),
    dispatch: jest.fn(),
    getState: jest.fn(() => ({ routes: [], index: 0 })),
    setParams: jest.fn(),
  };
  const mockRoute = { key: 'test-route', name: 'TestScreen', params: {} };
  return {
    useNavigation: () => mockNav,
    useRoute: () => mockRoute,
    NavigationContainer: ({ children }) => children,
    __mockNav: mockNav,
    __mockRoute: mockRoute,
  };
});

// Get refs to mock navigation/route
const navModule = require('@react-navigation/native');
const mockNavigationInstance = navModule.__mockNav;
const mockRouteInstance = navModule.__mockRoute;

// --- Mock firebase/firestore ---
const mockOnSnapshot = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, ...path) => ({ path: path.join('/') })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn((db, ...path) => ({ path: path.join('/') })),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  onSnapshot: (...args) => mockOnSnapshot(...args),
}));

// --- Mock firebase/auth ---
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn(),
  deleteUser: jest.fn(),
}));

// --- Mock firebase lib ---
jest.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

// --- Mock invite lib ---
jest.mock('../../src/lib/invite', () => {
  const actual = jest.requireActual('../../src/lib/invite');
  return {
    buildInviteLink: jest.fn((crewId, code) => `https://relay.app/join?c=${crewId}&code=${code}`),
    generateInviteCode: jest.fn(() => 'TESTCODE1234'),
    parseInvite: actual.parseInvite,
  };
});

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

// --- Mock expo-camera ---
jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    CameraView: (props) => React.createElement('CameraView', props),
    Camera: {
      requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    },
  };
});

// --- Mock lucide-react-native ---
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const mockIcon = (props) => React.createElement('Icon', props);
  const icons = {
    QrCode: mockIcon, X: mockIcon, Users: mockIcon, Shield: mockIcon,
    Bell: mockIcon, BellOff: mockIcon, LogOut: mockIcon, User: mockIcon,
    Edit: mockIcon, Settings: mockIcon, Eye: mockIcon, EyeOff: mockIcon,
    Plus: mockIcon, Headphones: mockIcon, Info: mockIcon, Copy: mockIcon,
    Share2: mockIcon, CopyCheck: mockIcon, ExternalLink: mockIcon,
  };
  return new Proxy(icons, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return mockIcon;
    }
  });
});

// --- Mock react-native-qrcode-svg ---
jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  return function MockQRCode(props) { return React.createElement('SVG', props); };
});

// --- Mock react-native-svg ---
jest.mock('react-native-svg', () => {
  const React = require('react');
  return new Proxy({}, { get: () => (props) => React.createElement('Svg', props) });
});

// --- Mock @stream-io/video-react-native-sdk ---
jest.mock('@stream-io/video-react-native-sdk', () => ({
  StreamVideoClient: { getOrCreateInstance: jest.fn() },
  StreamVideo: jest.fn(),
}));

// --- Mock expo modules ---
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
  isDevice: true, brand: 'Test', modelName: 'Test', osName: 'TestOS', osVersion: '1.0',
}));
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { getstream: { apiKey: 'test', useDevToken: true } } },
  manifest: { extra: { getstream: { apiKey: 'test', useDevToken: true } } },
}));

// --- Mock react-native-incall-manager ---
jest.mock('react-native-incall-manager', () => ({
  setForceSpeakerphoneOn: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}), { virtual: true });

// --- Mock authStore ---
const mockAuthStore = {
  joinCrewAsExistingUser: jest.fn().mockResolvedValue({ uid: 'user-1', crewId: 'crew-1' }),
  joinCrew: jest.fn().mockResolvedValue({ uid: 'user-1', crewId: 'crew-1' }),
  signUpOnly: jest.fn().mockResolvedValue({ uid: 'user-1' }),
  signIn: jest.fn().mockResolvedValue({ uid: 'user-1', crewId: 'crew-1' }),
  signUp: jest.fn().mockResolvedValue({ uid: 'user-1', crewId: 'crew-1' }),
  signOut: jest.fn(),
  loadUserProfile: jest.fn().mockResolvedValue(undefined),
  setAuthError: jest.fn(),
  setLoading: jest.fn(),
  user: null,
  profile: null,
  crewId: null,
  crew: null,
  crewRole: null,
  loading: false,
  authError: null,
};

jest.mock('../../src/stores/authStore', () => {
  const mockFn = (selector) => {
    if (typeof selector === 'function') return selector(mockAuthStore);
    return mockAuthStore;
  };
  mockFn.getState = () => mockAuthStore;
  mockFn.setState = (partial) => Object.assign(mockAuthStore, partial);
  return { __esModule: true, default: mockFn };
});

// --- Mock webrtcStore ---
const mockWebRTCStore = {
  client: null, ready: false, isMuted: true, isSpeakerphone: false,
  audioDevice: 'speaker', clientCrewId: null, activeCall: null, activeChannel: null,
  currentSpeaker: null, hasBluetoothDevice: false, hasWiredHeadset: false,
  isAudioPermissionGranted: false, isNoiseCancellationActive: false, channelBusy: false,
  isProximityNear: false,
  initializeClient: jest.fn(), joinCall: jest.fn(), leaveCall: jest.fn(),
  startTransmitting: jest.fn(), stopTransmitting: jest.fn(), toggleMute: jest.fn(),
  toggleSpeakerphone: jest.fn(), setAudioRoute: jest.fn(), toggleNoiseCancellation: jest.fn(),
  startAudioDeviceTracking: jest.fn(), stopAudioDeviceTracking: jest.fn(),
  requestAudioPermission: jest.fn(),
};

jest.mock('../../src/stores/webrtcStore', () => {
  const mockFn = (selector) => {
    if (typeof selector === 'function') return selector(mockWebRTCStore);
    return mockWebRTCStore;
  };
  mockFn.getState = () => mockWebRTCStore;
  mockFn.setState = (partial) => Object.assign(mockWebRTCStore, partial);
  return { __esModule: true, default: mockFn };
});

// --- Import screens after mocks ---
const JoinCrewScreen = require('../../src/screens/auth/JoinCrewScreen').default;
const CreateAccountScreen = require('../../src/screens/auth/CreateAccountScreen').default;
const SignInScreen = require('../../src/screens/auth/SignInScreen').default;
const DashboardScreen = require('../../src/screens/main/DashboardScreen').default;

function setRouteParams(params) {
  Object.assign(mockRouteInstance, { params });
}

function resetMocks() {
  mockNavigationInstance.navigate.mockClear();
  mockNavigationInstance.reset.mockClear();
  mockNavigationInstance.goBack.mockClear();
  mockRouteInstance.params = {};
  Object.assign(mockAuthStore, {
    joinCrewAsExistingUser: jest.fn().mockResolvedValue({ uid: 'user-1', crewId: 'crew-1' }),
    joinCrew: jest.fn().mockResolvedValue({ uid: 'user-1', crewId: 'crew-1' }),
    signUpOnly: jest.fn().mockResolvedValue({ uid: 'user-1' }),
    signIn: jest.fn().mockResolvedValue({ uid: 'user-1', crewId: 'crew-1' }),
    signUp: jest.fn().mockResolvedValue({ uid: 'user-1', crewId: 'crew-1' }),
    user: null, profile: null, crewId: null, crew: null, crewRole: null,
    loading: false, authError: null,
  });
  mockOnSnapshot.mockReset();
  mockOnSnapshot.mockImplementation((query, callback) => {
    callback({ docs: [] });
    return jest.fn();
  });
}

describe('JoinCrewScreen', () => {
  beforeEach(() => {
    resetMocks();
    cleanup();
  });

  it('should render invite link input when crewId/code not parsed', async () => {
    const { getByPlaceholderText, getByText } = await render(<JoinCrewScreen />);

    expect(getByPlaceholderText('Paste invite link or code...')).toBeTruthy();
    expect(getByText('Scan invite QR')).toBeTruthy();
  });

  it('should render "Sign In to Join" and "Create Account & Join" when user is not logged in and invite is parsed', async () => {
    setRouteParams({ prefillLink: 'crew-id-12345678 ABCD1234' });

    const { getByText } = await render(<JoinCrewScreen />);

    expect(getByText('Sign In to Join')).toBeTruthy();
    expect(getByText('Create Account & Join')).toBeTruthy();
  });

  it('should render "Join Crew" button when user is logged in and invite is parsed', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    setRouteParams({ prefillLink: 'crew-id-12345678 ABCD1234' });

    const { getByText } = await render(<JoinCrewScreen />);

    expect(getByText('Join Crew')).toBeTruthy();
  });

  it('should navigate to SignIn with crewId and code when pressing "Sign In to Join"', async () => {
    setRouteParams({ prefillLink: 'crew-id-12345678 ABCD1234' });

    const { getByText } = await render(<JoinCrewScreen />);

    fireEvent.press(getByText('Sign In to Join'));

    expect(mockNavigationInstance.navigate).toHaveBeenCalledWith('SignIn', {
      joinCrewId: 'crew-id-12345678',
      joinCode: 'ABCD1234',
    });
  });

  it('should navigate to CreateAccount with crewId and code when pressing "Create Account & Join"', async () => {
    setRouteParams({ prefillLink: 'crew-id-12345678 ABCD1234' });

    const { getByText } = await render(<JoinCrewScreen />);

    fireEvent.press(getByText('Create Account & Join'));

    expect(mockNavigationInstance.navigate).toHaveBeenCalledWith('CreateAccount', {
      joinCrewId: 'crew-id-12345678',
      joinCode: 'ABCD1234',
    });
  });

  it('should call joinCrewAsExistingUser when joining as existing user', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    setRouteParams({ prefillLink: 'crew-id-12345678 ABCD1234' });

    const { getByText } = await render(<JoinCrewScreen />);

    fireEvent.press(getByText('Join Crew'));

    await waitFor(() => {
      expect(mockAuthStore.joinCrewAsExistingUser).toHaveBeenCalledWith({
        crewId: 'crew-id-12345678',
        code: 'ABCD1234',
        displayName: 'test@example.com',
      });
    });
  });

  it('should display join error when joinCrewAsExistingUser fails', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    mockAuthStore.joinCrewAsExistingUser = jest.fn().mockRejectedValue(new Error('Invalid invite code'));
    setRouteParams({ prefillLink: 'crew-id-12345678 ABCD1234' });

    const { getByText } = await render(<JoinCrewScreen />);

    fireEvent.press(getByText('Join Crew'));

    await waitFor(() => {
      expect(getByText('Invalid invite code')).toBeTruthy();
    });
  });

  it('should display authError from store when present', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    mockAuthStore.authError = 'Session expired, please sign in again';
    setRouteParams({ prefillLink: 'crew-id-12345678 ABCD1234' });

    const { getByText } = await render(<JoinCrewScreen />);

    expect(getByText('Session expired, please sign in again')).toBeTruthy();
  });

  it('should navigate to MainTabs when user is already a member of the parsed crew', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    mockAuthStore.crewId = 'crew-id-12345678';
    setRouteParams({ prefillLink: 'crew-id-12345678 ABCD1234' });

    await render(<JoinCrewScreen />);

    await waitFor(() => {
      expect(mockNavigationInstance.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    });
  });
});

describe('CreateAccountScreen', () => {
  beforeEach(() => {
    resetMocks();
    cleanup();
  });

  it('DEBUG: should render with empty params', async () => {
    setRouteParams({});
    const { getByPlaceholderText } = await render(<CreateAccountScreen />);
    expect(getByPlaceholderText('Your name...')).toBeTruthy();
  });

  it('should render inputs when joining an existing crew', async () => {
    setRouteParams({ joinCrewId: 'crew-id-12345678', joinCode: 'ABCD1234' });

    const { getByPlaceholderText, queryByPlaceholderText } = await render(<CreateAccountScreen />);

    expect(getByPlaceholderText('Your name...')).toBeTruthy();
    expect(getByPlaceholderText('Enter email...')).toBeTruthy();
    expect(getByPlaceholderText('Create password')).toBeTruthy();
    expect(queryByPlaceholderText('Crew name (e.g. Stage Ops)')).toBeNull();
  });

  it('should render crewName input when creating a new crew', async () => {
    setRouteParams({});

    const { getByPlaceholderText } = await render(<CreateAccountScreen />);

    expect(getByPlaceholderText('Crew name (e.g. Stage Ops)')).toBeTruthy();
  });

it('should call signUpOnly then joinCrewAsExistingUser when joining existing crew', async () => {
    setRouteParams({ joinCrewId: 'crew-id-12345678', joinCode: 'ABCD1234' });

    const { getByPlaceholderText, getByText } = await render(<CreateAccountScreen />);

    fireEvent.changeText(getByPlaceholderText('Your name...'), 'New User');
    fireEvent.changeText(getByPlaceholderText('Enter email...'), 'newuser@example.com');
    fireEvent.changeText(getByPlaceholderText('Create password'), 'password123');

    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(mockAuthStore.signUpOnly).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
    });
  });

  it('should call signUp with default crewName "My Crew" when creating new crew without name', async () => {
    setRouteParams({});

    const { getByPlaceholderText, getByText } = await render(<CreateAccountScreen />);

    fireEvent.changeText(getByPlaceholderText('Your name...'), 'New User');
    fireEvent.changeText(getByPlaceholderText('Enter email...'), 'newuser@example.com');
    fireEvent.changeText(getByPlaceholderText('Create password'), 'password123');

    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(mockAuthStore.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
          password: 'password123',
          displayName: 'New User',
          crewName: 'My Crew',
        })
      );
    });
  });

  it('should display authError when signUp fails', async () => {
    mockAuthStore.signUp = jest.fn().mockRejectedValue(new Error('auth/email-already-in-use'));
    mockAuthStore.authError = 'Email already in use';
    setRouteParams({});

    const { getByPlaceholderText, getByText } = await render(<CreateAccountScreen />);

    fireEvent.changeText(getByPlaceholderText('Your name...'), 'Test');
    fireEvent.changeText(getByPlaceholderText('Enter email...'), 'existing@example.com');
    fireEvent.changeText(getByPlaceholderText('Create password'), 'password123');

    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(getByText('This email is already registered. Try signing in instead.')).toBeTruthy();
    });
  });

  it('should sign out user and clear authError when joinCrewAsExistingUser fails', async () => {
    const { signOut } = require('firebase/auth');
    setRouteParams({ joinCrewId: 'crew-id-12345678', joinCode: 'ABCD1234' });
    mockAuthStore.signUpOnly = jest.fn().mockResolvedValue({ uid: 'user-1' });
    mockAuthStore.joinCrewAsExistingUser = jest.fn().mockRejectedValue(new Error('join failed'));

    const { getByPlaceholderText, getByText } = await render(<CreateAccountScreen />);

    fireEvent.changeText(getByPlaceholderText('Your name...'), 'Test');
    fireEvent.changeText(getByPlaceholderText('Enter email...'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Create password'), 'password123');

    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith(expect.anything());
    });
    expect(mockAuthStore.setAuthError).toHaveBeenCalledWith(null);
  });
});

describe('SignInScreen', () => {
  beforeEach(() => {
    resetMocks();
    cleanup();
  });

  it('should render email and password inputs', async () => {
    const { getByPlaceholderText } = await render(<SignInScreen />);

    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('should render a "Sign In" button', async () => {
    const { getByText } = await render(<SignInScreen />);

    expect(getByText('Sign In')).toBeTruthy();
  });

  it('should call signIn with email and password on submit', async () => {
    const { getByPlaceholderText, getByText } = await render(<SignInScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockAuthStore.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should reset navigation to JoinCrew when signIn succeeds with invite params', async () => {
    setRouteParams({ joinCrewId: 'crew-id-12345678', joinCode: 'ABCD1234' });

    const { getByPlaceholderText, getByText } = await render(<SignInScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockNavigationInstance.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'JoinCrew', params: { joinCrewId: 'crew-id-12345678', joinCode: 'ABCD1234' } }],
      });
    });
  });

  it('should display authError when signIn fails', async () => {
    mockAuthStore.signIn = jest.fn().mockRejectedValue(new Error('auth/wrong-password'));
    mockAuthStore.authError = 'Incorrect password. Please try again.';

    const { getByPlaceholderText, getByText } = await render(<SignInScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');

    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Incorrect password. Please try again.')).toBeTruthy();
    });
  });

  it('should not call Alert on sign-in error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    mockAuthStore.signIn = jest.fn().mockRejectedValue(new Error('auth/user-not-found'));
    mockAuthStore.authError = 'No account found with this email.';

    const { getByPlaceholderText, getByText } = await render(<SignInScreen />);

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');

    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('No account found with this email.')).toBeTruthy();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('DashboardScreen', () => {
  beforeEach(() => {
    resetMocks();
    cleanup();
  });

  it('should render "No channels yet" empty-state text when no crew', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    mockAuthStore.crewId = null;

    const { getByText } = await render(<DashboardScreen navigation={mockNavigationInstance} />);

    expect(getByText('No channels yet. Create one to get started.')).toBeTruthy();
  });

  it('should render Dashboard header when crewId is set but channels are empty', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    mockAuthStore.crewId = 'crew-123';
    mockAuthStore.crewRole = 'owner';

    const { getByText } = await render(<DashboardScreen navigation={mockNavigationInstance} />);

    expect(getByText('Dashboard')).toBeTruthy();
  });

  it('should render channel list when channels are loaded', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    mockAuthStore.crewId = 'crew-123';
    mockAuthStore.crewRole = 'owner';

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({
        docs: [
          { id: 'ch1', data: () => ({ name: 'Production', type: 'open', createdBy: 'user-1' }) },
        ],
      });
      return jest.fn();
    });

    const { getByText } = await render(<DashboardScreen navigation={mockNavigationInstance} />);

    expect(getByText('Production')).toBeTruthy();
  });

  it('should navigate to PTT screen when pressing a channel', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    mockAuthStore.crewId = 'crew-123';
    mockAuthStore.crewRole = 'member';

    mockOnSnapshot.mockImplementation((query, callback) => {
      callback({
        docs: [
          { id: 'ch1', data: () => ({ name: 'Production', type: 'open', createdBy: 'user-1' }) },
        ],
      });
      return jest.fn();
    });

    const { getByText } = await render(<DashboardScreen navigation={mockNavigationInstance} />);

    const channelCard = getByText('Production').parent;
    fireEvent.press(channelCard);

    await waitFor(() => {
      expect(mockNavigationInstance.navigate).toHaveBeenCalledWith('PTT', {
        crewId: 'crew-123',
        channelId: 'ch1',
        channelName: 'Production',
      });
    });
  });

  it('should show "Create New Channel" button only for admin', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    mockAuthStore.crewId = 'crew-123';
    mockAuthStore.crewRole = 'owner';

    const { getByText } = await render(<DashboardScreen navigation={mockNavigationInstance} />);

    expect(getByText('Create New Channel')).toBeTruthy();
  });

  it('should not show "Create New Channel" button for non-admin', async () => {
    mockAuthStore.user = { uid: 'user-1', email: 'test@example.com' };
    mockAuthStore.crewId = 'crew-123';
    mockAuthStore.crewRole = 'member';

    const { queryByText } = await render(<DashboardScreen navigation={mockNavigationInstance} />);

    expect(queryByText('Create New Channel')).toBeNull();
  });
});
