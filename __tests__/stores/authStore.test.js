// __tests__/stores/authStore.test.js
// Integration tests for src/stores/authStore.js

// --- Mock firebase/auth ---
const mockUser = { uid: 'test-uid-123', email: 'test@example.com', delete: jest.fn().mockResolvedValue(undefined) };
const mockUserCred = { user: mockUser };

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  deleteUser: jest.fn(),
}));

// --- Mock firebase/firestore ---
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((db, ...path) => ({ __type: 'doc', path: path.join('/') })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn((db, ...path) => ({ __type: 'collection', path: path.join('/') })),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  onSnapshot: jest.fn(),
}));

// --- Mock firebase lib ---
jest.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

// --- Mock invite lib ---
jest.mock('../../src/lib/invite', () => ({
  generateInviteCode: jest.fn(() => 'TESTCODE'),
}));

// --- Mock presence lib ---
jest.mock('../../src/lib/presence', () => ({
  setPresence: jest.fn().mockResolvedValue(undefined),
}));

// --- Mock notifications lib ---
jest.mock('../../src/lib/notifications', () => ({
  registerFcmToken: jest.fn().mockResolvedValue(undefined),
  setupFcmListeners: jest.fn(() => () => {}),
}));

// --- Mock expo-constants ---
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      getstream: { apiKey: 'test-key', useDevToken: true, secret: 'test-secret' },
      firebase: { apiKey: 'test-api-key', projectId: 'test-project' },
    },
  },
  manifest: {
    extra: {
      getstream: { apiKey: 'test-key', useDevToken: true, secret: 'test-secret' },
    },
  },
}));

// --- Mock expo-keep-awake ---
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

// --- Mock react-native ---
jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: { OS: 'ios', select: jest.fn((obj) => obj.ios) },
  Alert: { alert: jest.fn() },
  StyleSheet: { create: jest.fn((s) => s) },
  View: 'View',
  Text: 'Text',
}));

// --- Mock react-native-incall-manager ---
jest.mock('react-native-incall-manager', () => ({
  setForceSpeakerphoneOn: jest.fn(),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

// --- Mock Stream Video SDK ---
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
    StreamVideo: jest.fn(() => null),
    __mockCall: mockCall,
  };
});

// --- Mock NoiseCancellation ---
jest.mock('@stream-io/noise-cancellation-react-native', () => ({
  NoiseCancellation: jest.fn().mockImplementation(() => ({
    setNoiseCancellation: jest.fn(),
  })),
}));

// --- Mock expo-audio ---
jest.mock('expo-audio', () => ({
  requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

// --- Mock react-native-volume-manager ---
jest.mock('react-native-volume-manager', () => ({
  getVolume: jest.fn().mockResolvedValue({ volume: 0.65 }),
  setVolume: jest.fn().mockResolvedValue(undefined),
  addVolumeListener: jest.fn(() => ({ remove: jest.fn() })),
  removeVolumeListener: jest.fn(),
  showNativeVolumeUI: jest.fn().mockResolvedValue(true),
  VolumeManager: {
    getVolume: jest.fn().mockResolvedValue({ volume: 0.65 }),
    setVolume: jest.fn().mockResolvedValue(undefined),
    addVolumeListener: jest.fn(() => ({ remove: jest.fn() })),
    removeVolumeListener: jest.fn(),
    showNativeVolumeUI: jest.fn().mockResolvedValue(true),
  },
}), { virtual: true });

// --- Import modules after mocks ---
const {
  auth: firebaseAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
} = require('firebase/auth');
const {
  auth: firebaseAuthInstance,
  doc, getDoc, getDocs, setDoc, collection, addDoc, updateDoc, serverTimestamp, onSnapshot,
} = require('firebase/firestore');

const useAuthStore = require('../../src/stores/authStore').default;

// Helper to reset store state
function resetStore() {
  useAuthStore.setState({
    user: null,
    profile: null,
    crewId: null,
    crew: null,
    crewRole: null,
    loading: false,
    authError: null,
  });
}

describe('authStore - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    getDoc.mockReset();
    getDocs.mockReset();
    setDoc.mockReset();
    addDoc.mockReset();
    updateDoc.mockReset();
    onSnapshot.mockReset();
    doc.mockReset();
    collection.mockReset();
    serverTimestamp.mockReset();
    createUserWithEmailAndPassword.mockReset();
    signInWithEmailAndPassword.mockReset();
    signOut.mockReset();
    onAuthStateChanged.mockReset();
    deleteUser.mockReset();

    doc.mockImplementation((db, ...path) => ({
      __type: 'doc',
      path: path.join('/'),
      delete: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
    }));
    collection.mockImplementation((db, ...path) => ({ __type: 'collection', path: path.join('/') }));
    serverTimestamp.mockImplementation(() => 'SERVER_TIMESTAMP');

    resetStore();
  });

  describe('signUp', () => {
    it('should create user, crew, member doc, channel, and channel member on success', async () => {
      const createUserWithEmailAndPassword = require('firebase/auth').createUserWithEmailAndPassword;
      const { addDoc } = require('firebase/firestore');

      createUserWithEmailAndPassword.mockResolvedValueOnce({
        user: { uid: 'new-user-uid', email: 'newuser@example.com' },
      });

      // addDoc called twice: crew + channel
      addDoc.mockResolvedValueOnce({ id: 'new-crew-id' });
      addDoc.mockResolvedValueOnce({ id: 'new-channel-id' });

      // loadUserProfile: getDoc called 3 times (user doc, member doc, crew doc)
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ displayName: 'New User', email: 'newuser@example.com', crewId: 'new-crew-id' }),
      });
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ crewRole: 'owner', displayName: 'New User' }),
      });
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'My Crew', inviteCode: 'TESTCODE', ownerUid: 'new-user-uid' }),
      });

      const result = await useAuthStore.getState().signUp({
        email: 'newuser@example.com',
        password: 'password123',
        displayName: 'New User',
        crewName: 'My Crew',
      });

      expect(result.uid).toBe('new-user-uid');
      expect(result.crewId).toBe('new-crew-id');
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'newuser@example.com',
        'password123'
      );
      expect(addDoc).toHaveBeenCalledTimes(2); // crew + channel
      expect(setDoc).toHaveBeenCalledTimes(3); // user doc + member doc + channel member doc
      expect(useAuthStore.getState().profile).toMatchObject({ displayName: 'New User', crewId: 'new-crew-id' });
      expect(useAuthStore.getState().crewId).toBe('new-crew-id');
      expect(useAuthStore.getState().crewRole).toBe('owner');
      expect(useAuthStore.getState().crew).toMatchObject({ name: 'My Crew' });
      expect(useAuthStore.getState().authError).toBeNull();
    });

    it('should default crewName to "My Crew" when not provided', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');
      const { addDoc } = require('firebase/firestore');

      createUserWithEmailAndPassword.mockResolvedValueOnce({
        user: { uid: 'uid1', email: 'test@example.com' },
      });
      addDoc.mockResolvedValueOnce({ id: 'crew1' });
      addDoc.mockResolvedValueOnce({ id: 'channel1' });

      getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ displayName: 'T', crewId: 'crew1' }) });
      getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ crewRole: 'owner' }) });
      getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ name: 'My Crew' }) });

      await useAuthStore.getState().signUp({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test',
      });

      const crewCall = addDoc.mock.calls[0];
      expect(crewCall[1].name).toBe('My Crew');
    });

    it('should set authError and throw on auth failure', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');

      const err = new Error('auth/email-already-in-use');
      err.code = 'auth/email-already-in-use';
      createUserWithEmailAndPassword.mockRejectedValueOnce(err);

      await expect(
        useAuthStore.getState().signUp({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test',
          crewName: 'Crew',
        })
      ).rejects.toThrow();

      expect(useAuthStore.getState().authError).toBe(
        'This email is already registered. Try signing in instead.'
      );
      expect(addDoc).not.toHaveBeenCalled();
      expect(setDoc).not.toHaveBeenCalled();
    });

    it('should set authError and throw on Firestore failure', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');
      const { addDoc } = require('firebase/firestore');

      createUserWithEmailAndPassword.mockResolvedValueOnce({
        user: { uid: 'uid1', email: 'test@example.com' },
      });
      addDoc.mockResolvedValueOnce({ id: 'crew-uid1' });
      setDoc.mockRejectedValueOnce(new Error('Firestore write failed'));

      await expect(
        useAuthStore.getState().signUp({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test',
          crewName: 'Crew',
        })
      ).rejects.toThrow('Firestore write failed');

      expect(useAuthStore.getState().authError).toBe('Firestore write failed');
    });
  });

  describe('signUpOnly', () => {
    it('should create auth user and user doc on success', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');
      const { deleteUser } = require('firebase/auth');

      createUserWithEmailAndPassword.mockResolvedValueOnce({
        user: { uid: 'new-uid', email: 'test@example.com', delete: jest.fn().mockResolvedValue(undefined) },
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ displayName: 'Test', email: 'test@example.com', crewId: null }),
      });

      const result = await useAuthStore.getState().signUpOnly({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });

      expect(result.uid).toBe('new-uid');
      expect(createUserWithEmailAndPassword).toHaveBeenCalled();
      expect(setDoc).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().profile).toMatchObject({ displayName: 'Test' });
      expect(useAuthStore.getState().crewId).toBeNull();
    });

    it('should call deleteUser if setDoc fails after auth creation', async () => {
      const { createUserWithEmailAndPassword, deleteUser } = require('firebase/auth');

      const mockCred = {
        user: { uid: 'cleanup-uid', email: 'test@example.com', delete: jest.fn().mockResolvedValue(undefined) },
      };
      createUserWithEmailAndPassword.mockResolvedValueOnce(mockCred);
      setDoc.mockRejectedValueOnce(new Error('Firestore unavailable'));

      await expect(
        useAuthStore.getState().signUpOnly({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test',
        })
      ).rejects.toThrow('Firestore unavailable');

      expect(deleteUser).toHaveBeenCalledWith(mockCred.user);
      expect(useAuthStore.getState().authError).toBe('Firestore unavailable');
    });

    it('should set authError on auth failure', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');

      const err = new Error('auth/weak-password');
      err.code = 'auth/weak-password';
      createUserWithEmailAndPassword.mockRejectedValueOnce(err);

      await expect(
        useAuthStore.getState().signUpOnly({
          email: 'test@example.com',
          password: '123',
          displayName: 'Test',
        })
      ).rejects.toThrow();

      expect(useAuthStore.getState().authError).toBe('Password should be at least 6 characters.');
    });
  });

  describe('joinCrew', () => {
    it('should create user, member doc, validate, create user doc, add to all channels', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');

      createUserWithEmailAndPassword.mockResolvedValueOnce({
        user: { uid: 'join-user-uid', email: 'joiner@example.com' },
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Test Crew', inviteCode: 'ABC12345', ownerUid: 'owner' }),
      });

      getDocs.mockResolvedValueOnce({
        docs: [
          { id: 'ch1', data: () => ({ name: 'Production', type: 'open' }) },
          { id: 'ch2', data: () => ({ name: 'Stage', type: 'open' }) },
        ],
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ displayName: 'Joiner', email: 'joiner@example.com', crewId: 'crew-abc' }),
      });
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ crewRole: 'member' }),
      });
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Test Crew' }),
      });

      const result = await useAuthStore.getState().joinCrew({
        email: 'joiner@example.com',
        password: 'password123',
        displayName: 'Joiner',
        crewId: 'crew-abc',
        code: 'ABC12345',
      });

      expect(result.uid).toBe('join-user-uid');
      expect(result.crewId).toBe('crew-abc');
      // member doc + user doc + 2 channel member docs = 4
      expect(setDoc).toHaveBeenCalledTimes(4);
      expect(useAuthStore.getState().crewId).toBe('crew-abc');
      expect(useAuthStore.getState().authError).toBeNull();
    });

    it('should delete member doc and throw if crew not found', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');

      createUserWithEmailAndPassword.mockResolvedValueOnce({
        user: { uid: 'fail-uid', email: 'fail@example.com' },
      });

      getDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => null,
      });

      await expect(
        useAuthStore.getState().joinCrew({
          email: 'fail@example.com',
          password: 'password123',
          displayName: 'Fail',
          crewId: 'missing-crew',
          code: 'ABC12345',
        })
      ).rejects.toThrow('Crew not found. Check your invite link.');

      expect(doc).toHaveBeenCalledWith(
        {},
        'crews', 'missing-crew', 'members', 'fail-uid'
      );
      expect(useAuthStore.getState().authError).toBe('Crew not found. Check your invite link.');
    });

    it('should delete member doc and throw on invalid invite code', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');

      createUserWithEmailAndPassword.mockResolvedValueOnce({
        user: { uid: 'invalid-uid', email: 'invalid@example.com' },
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Crew', inviteCode: 'CORRECT123' }),
      });

      await expect(
        useAuthStore.getState().joinCrew({
          email: 'invalid@example.com',
          password: 'password123',
          displayName: 'Invalid',
          crewId: 'crew-abc',
          code: 'WRONGCODE',
        })
      ).rejects.toThrow('Invalid or expired invite code.');

      expect(useAuthStore.getState().authError).toBe('Invalid or expired invite code.');
    });

    it('should set authError on auth failure', async () => {
      const { createUserWithEmailAndPassword } = require('firebase/auth');

const err = new Error('auth/wrong-password');
      err.code = 'auth/wrong-password';
      createUserWithEmailAndPassword.mockRejectedValueOnce(err);

      await expect(
        useAuthStore.getState().joinCrew({
          email: 'existing@example.com',
          password: 'wrongpassword',
          displayName: 'Test',
          crewId: 'crew-abc',
          code: 'ABC12345',
        })
      ).rejects.toThrow();

      expect(useAuthStore.getState().authError).toBe('Incorrect password. Please try again.');
    });
  });

  describe('joinCrewAsExistingUser', () => {
    it('should create member doc, validate, update user doc, add to channels', async () => {
      useAuthStore.setState({ user: { uid: 'existing-uid', email: 'existing@example.com' } });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'My Crew', inviteCode: 'ABC12345', ownerUid: 'owner-uid' }),
      });

      getDocs.mockResolvedValueOnce({
        docs: [
          { id: 'ch1', data: () => ({ name: 'Production' }) },
          { id: 'ch2', data: () => ({ name: 'Stage' }) },
        ],
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ displayName: 'Existing', email: 'existing@example.com', crewId: 'crew-abc' }),
      });
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ crewRole: 'member' }),
      });
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'My Crew' }),
      });

      const result = await useAuthStore.getState().joinCrewAsExistingUser({
        crewId: 'crew-abc',
        code: 'ABC12345',
        displayName: 'Updated Name',
      });

expect(result.uid).toBe('existing-uid');
      expect(result.crewId).toBe('crew-abc');
      const memberSetCall = setDoc.mock.calls.find(
        ([docRef]) => docRef?.path === 'crews/crew-abc/members/existing-uid'
      );
      expect(memberSetCall).toBeDefined();
      expect(memberSetCall[1]).toMatchObject({
        crewRole: 'member',
        displayName: 'Updated Name',
      });
      expect(useAuthStore.getState().authError).toBeNull();
    });

    it('should throw if no existing user', async () => {
      useAuthStore.setState({ user: null });

      await expect(
        useAuthStore.getState().joinCrewAsExistingUser({
          crewId: 'crew-abc',
          code: 'ABC12345',
        })
      ).rejects.toThrow('You must be signed in to join a crew.');

      expect(useAuthStore.getState().authError).toBe('You must be signed in to join a crew.');
    });

    it('should delete member doc and throw if crew not found', async () => {
      useAuthStore.setState({ user: { uid: 'existing-uid', email: 'existing@example.com' } });

      getDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => null,
      });

      await expect(
        useAuthStore.getState().joinCrewAsExistingUser({
          crewId: 'missing-crew',
          code: 'ABC12345',
        })
      ).rejects.toThrow('Crew not found. Check your invite link.');

      expect(doc).toHaveBeenCalledWith(
        {},
        'crews', 'missing-crew', 'members', 'existing-uid'
      );
      expect(useAuthStore.getState().authError).toBe('Crew not found. Check your invite link.');
    });

    it('should delete member doc and throw on invalid invite code', async () => {
      useAuthStore.setState({ user: { uid: 'existing-uid', email: 'existing@example.com' } });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Crew', inviteCode: 'CORRECT1' }),
      });

      await expect(
        useAuthStore.getState().joinCrewAsExistingUser({
          crewId: 'crew-abc',
          code: 'WRONGCO',
        })
      ).rejects.toThrow('Invalid or expired invite code.');

      expect(useAuthStore.getState().authError).toBe('Invalid or expired invite code.');
    });

    it('should delete member doc on Firestore failure after creation', async () => {
      useAuthStore.setState({ user: { uid: 'existing-uid', email: 'existing@example.com' } });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Crew', inviteCode: 'ABC12345' }),
      });

      updateDoc.mockRejectedValueOnce(new Error('Firestore update failed'));

      await expect(
        useAuthStore.getState().joinCrewAsExistingUser({
          crewId: 'crew-abc',
          code: 'ABC12345',
          displayName: 'New Name',
        })
      ).rejects.toThrow('Firestore update failed');

      expect(doc).toHaveBeenCalledWith(
        {},
        'crews', 'crew-abc', 'members', 'existing-uid'
      );
      expect(useAuthStore.getState().authError).toBe('Firestore update failed');
    });
  });

  describe('signIn', () => {
    it('should sign in successfully without errors', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');

      signInWithEmailAndPassword.mockResolvedValueOnce();

      await useAuthStore.getState().signIn({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'user@example.com',
        'password123'
      );
      expect(useAuthStore.getState().authError).toBeNull();
    });

    it('should set authError and throw on wrong password', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');

const err = new Error('auth/wrong-password');
      err.code = 'auth/wrong-password';
      signInWithEmailAndPassword.mockRejectedValueOnce(err);

      await expect(
        useAuthStore.getState().signIn({
          email: 'user@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow();

      expect(useAuthStore.getState().authError).toBe('Incorrect password. Please try again.');
    });

    it('should set authError and throw on user not found', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');

const err = new Error('auth/user-not-found');
      err.code = 'auth/user-not-found';
      signInWithEmailAndPassword.mockRejectedValueOnce(err);

      await expect(
        useAuthStore.getState().signIn({
          email: 'unknown@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();

      expect(useAuthStore.getState().authError).toBe('No account found with this email.');
    });
  });

  describe('logOut', () => {
    it('should set presence offline and sign out when crewId and user exist', async () => {
      const { signOut } = require('firebase/auth');

      useAuthStore.setState({
        user: { uid: 'logout-uid', email: 'logout@example.com' },
        crewId: 'crew-to-leave',
      });

      signOut.mockResolvedValueOnce();

      await useAuthStore.getState().logOut();

      expect(require('../../src/lib/presence').setPresence).toHaveBeenCalledWith('crew-to-leave', 'logout-uid', 'offline');
      expect(signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().authError).toBeNull();
    });

    it('should still sign out when no crewId', async () => {
      const { signOut } = require('firebase/auth');

      useAuthStore.setState({
        user: { uid: 'logout-uid', email: 'logout@example.com' },
        crewId: null,
      });

      signOut.mockResolvedValueOnce();

      await useAuthStore.getState().logOut();

      expect(signOut).toHaveBeenCalled();
      expect(useAuthStore.getState().authError).toBeNull();
    });

    it('should set authError and throw on signOut failure', async () => {
      const { signOut } = require('firebase/auth');

      useAuthStore.setState({
        user: { uid: 'logout-uid', email: 'logout@example.com' },
        crewId: null,
      });

const err = new Error('auth/network-request-failed');
      err.code = 'auth/network-request-failed';
      signOut.mockRejectedValueOnce(err);

      await expect(useAuthStore.getState().logOut()).rejects.toThrow();

      expect(useAuthStore.getState().authError).toBe('Network error. Please check your internet connection.');
    });
  });

  describe('loadUserProfile', () => {
    it('should load profile, crewId, crewRole, crew data, and set presence', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ displayName: 'Profile User', email: 'profile@example.com', crewId: 'crew-123' }),
      });
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ crewRole: 'admin' }),
      });
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ name: 'Test Crew' }),
      });

      await useAuthStore.getState().loadUserProfile('profile-uid');

      expect(useAuthStore.getState().profile).toMatchObject({ displayName: 'Profile User' });
      expect(useAuthStore.getState().crewId).toBe('crew-123');
      expect(useAuthStore.getState().crewRole).toBe('admin');
      expect(useAuthStore.getState().crew).toMatchObject({ name: 'Test Crew' });
      expect(require('../../src/lib/presence').setPresence).toHaveBeenCalledWith('crew-123', 'profile-uid', 'online');
    });

    it('should clear profile if user doc does not exist', async () => {
      getDoc.mockResolvedValueOnce({ exists: () => false });

      await useAuthStore.getState().loadUserProfile('nonexistent-uid');

      expect(useAuthStore.getState().profile).toBeNull();
      expect(useAuthStore.getState().crewId).toBeNull();
      expect(useAuthStore.getState().crewRole).toBeNull();
      expect(useAuthStore.getState().crew).toBeNull();
    });

    it('should load profile without crew data if user has no crewId', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ displayName: 'No Crew', email: 'nocrew@example.com' }),
      });

      await useAuthStore.getState().loadUserProfile('no-crew-uid');

      expect(useAuthStore.getState().profile).toMatchObject({ displayName: 'No Crew' });
      expect(useAuthStore.getState().crewId).toBeNull();
      expect(useAuthStore.getState().crewRole).toBeNull();
      expect(useAuthStore.getState().crew).toBeNull();
      expect(require('../../src/lib/presence').setPresence).not.toHaveBeenCalled();
    });

    it('should clear crewRole when member doc does not exist', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ displayName: 'User', crewId: 'crew-123' }),
      });
      getDoc.mockResolvedValueOnce({
        exists: () => false,
        data: () => null,
      });

      await useAuthStore.getState().loadUserProfile('user-uid');

      expect(useAuthStore.getState().crewRole).toBeNull();
      expect(useAuthStore.getState().crew).toBeNull();
      expect(require('../../src/lib/presence').setPresence).not.toHaveBeenCalled();
    });
  });

  describe('setAuthError', () => {
    it('should set and clear authError', () => {
      useAuthStore.getState().setAuthError('Test error message');
      expect(useAuthStore.getState().authError).toBe('Test error message');

      useAuthStore.getState().setAuthError(null);
      expect(useAuthStore.getState().authError).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().loading).toBe(true);

      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().loading).toBe(false);
    });
  });

  describe('toFriendlyError (via authError)', () => {
    it('should return friendly message for auth/code errors', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');

const err = new Error('auth/too-many-requests');
      err.code = 'auth/too-many-requests';
      signInWithEmailAndPassword.mockRejectedValueOnce(err);

      await expect(
        useAuthStore.getState().signIn({ email: 'test@example.com', password: 'pass' })
      ).rejects.toThrow();

      expect(useAuthStore.getState().authError).toBe('Too many attempts. Please try again later.');
    });

    it('should fall back to error.message for non-auth errors', async () => {
      const { signInWithEmailAndPassword } = require('firebase/auth');

const err = new Error('Custom error without code');
      signInWithEmailAndPassword.mockRejectedValueOnce(err);

      await expect(
        useAuthStore.getState().signIn({ email: 'test@example.com', password: 'pass' })
      ).rejects.toThrow('Custom error without code');

      expect(useAuthStore.getState().authError).toBe('Custom error without code');
    });
  });
});
