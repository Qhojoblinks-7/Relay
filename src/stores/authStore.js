import { create } from 'zustand';
import { AppState } from 'react-native';
import { auth, db } from '../lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { generateInviteCode } from '../lib/invite';
import { setPresence } from '../lib/presence';
import { registerFcmToken, setupFcmListeners } from '../lib/notifications';

const FRIENDLY_ERRORS = {
  'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/operation-not-allowed': 'Email and password sign-in is currently disabled.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your internet connection.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled. Please try again.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled. Please try again.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
  'auth/provider-already-linked': 'This account is already linked to another provider.',
  'auth/credential-already-in-use': 'This credential is already associated with a different account.',
  'auth/requires-recent-login': 'Please sign in again to complete this action.',
  'auth/expired-action-code': 'This action link has expired. Please request a new one.',
  'auth/invalid-action-code': 'This action link is invalid or has already been used.',
  'auth/missing-android-pkg-name': 'Missing Android package name.',
  'auth/missing-continue-uri': 'Missing continue URL.',
  'auth/missing-ios-bundle-id': 'Missing iOS bundle ID.',
  'auth/invalid-continue-uri': 'Invalid continue URL.',
  'auth/unauthorized-continue-uri': 'Unauthorized continue URL.',
  'auth/code-expired': 'The action code has expired.',
  'auth/invalid-message-payload': 'Invalid email action payload.',
  'auth/email-change-needs-verification': 'Please verify your email before changing it.',
  'auth/internal-error': 'An internal error occurred. Please try again later.',
  'auth/invalid-api-key': 'Invalid API key. Please contact support.',
  'auth/app-not-authorized': 'This app is not authorized to use Firebase Auth.',
  'auth/keychain-error': 'A keychain error occurred. Please try again.',
  'auth/tenant-id-mismatch': 'Tenant ID mismatch. Please contact support.',
};

const toFriendlyError = (error) => {
  if (!error || !error.message) return 'Something went wrong. Please try again.';
  const code = error.code || '';
  if (FRIENDLY_ERRORS[code]) return FRIENDLY_ERRORS[code];
  if (error.message && FRIENDLY_ERRORS[error.message]) return FRIENDLY_ERRORS[error.message];
  return error.message;
};

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  crewId: null,
  crew: null,
  crewRole: null,
  loading: true,
  authError: null,

  setAuthError: (error) => set({ authError: error }),
  setLoading: (loading) => set({ loading }),

  loadUserProfile: async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      set({ profile: null, crew: null, crewRole: null });
      return;
    }

    const data = userDoc.data();
    set({ profile: data, crewId: data.crewId || null });

    if (data.crewId) {
      const memberDoc = await getDoc(doc(db, 'crews', data.crewId, 'members', uid));
      if (memberDoc.exists()) {
        set({ crewRole: memberDoc.data().crewRole });
        const crewDoc = await getDoc(doc(db, 'crews', data.crewId));
        if (crewDoc.exists()) set({ crew: crewDoc.data() });
        setPresence(data.crewId, uid, 'online');
      } else {
        set({ crew: null, crewRole: null });
      }
    } else {
      set({ crew: null, crewRole: null });
    }
  },

  signUp: async ({ email, password, displayName, crewName }) => {
    const { setAuthError } = get();
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      const crewRef = await addDoc(collection(db, 'crews'), {
        name: crewName,
        ownerUid: uid,
        inviteCode: generateInviteCode(),
        createdAt: serverTimestamp(),
      });
      const crewId = crewRef.id;

      await setDoc(doc(db, 'users', uid), {
        displayName,
        email,
        crewId,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'crews', crewId, 'members', uid), {
        crewRole: 'owner',
        displayName,
        joinedAt: serverTimestamp(),
      });

      const channelRef = await addDoc(collection(db, 'crews', crewId, 'channels'), {
        name: 'Production',
        type: 'open',
        createdBy: uid,
        createdAt: serverTimestamp(),
      });
      await setDoc(
        doc(db, 'crews', crewId, 'channels', channelRef.id, 'members', uid),
        { role: 'admin', joinedAt: serverTimestamp() }
      );

      await get().loadUserProfile(uid);
      return { uid, crewId };
    } catch (err) {
      setAuthError(toFriendlyError(err));
      throw err;
    }
  },

  signUpOnly: async ({ email, password, displayName }) => {
    const { setAuthError } = get();
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      await setDoc(doc(db, 'users', uid), {
        displayName,
        email,
        createdAt: serverTimestamp(),
      });

      await get().loadUserProfile(uid);
      return { uid };
    } catch (err) {
      setAuthError(toFriendlyError(err));
      throw err;
    }
  },

  joinCrew: async ({ email, password, displayName, crewId, code }) => {
    const { setAuthError } = get();
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      await setDoc(doc(db, 'crews', crewId, 'members', uid), {
        crewRole: 'member',
        displayName,
        joinedAt: serverTimestamp(),
      });

      const crewDoc = await getDoc(doc(db, 'crews', crewId));
      if (!crewDoc.exists()) {
        await doc(db, 'crews', crewId, 'members', uid).delete();
        throw new Error('Crew not found. Check your invite link.');
      }
      if (crewDoc.data().inviteCode !== code) {
        await doc(db, 'crews', crewId, 'members', uid).delete();
        throw new Error('Invalid or expired invite code.');
      }

      await setDoc(doc(db, 'users', uid), {
        displayName,
        email,
        crewId,
        createdAt: serverTimestamp(),
      });

      const channelsSnap = await getDocs(collection(db, 'crews', crewId, 'channels'));
      for (const ch of channelsSnap.docs) {
        await setDoc(
          doc(db, 'crews', crewId, 'channels', ch.id, 'members', uid),
          { role: 'member', joinedAt: serverTimestamp() }
        );
      }

      await get().loadUserProfile(uid);
      return { uid, crewId };
    } catch (err) {
      setAuthError(toFriendlyError(err));
      throw err;
    }
  },

  joinCrewAsExistingUser: async ({ crewId, code, displayName }) => {
    const { user, setAuthError } = get();
    setAuthError(null);
    try {
      if (!user) {
        throw new Error('You must be signed in to join a crew.');
      }

      const uid = user.uid;

      await setDoc(doc(db, 'crews', crewId, 'members', uid), {
        crewRole: 'member',
        displayName: displayName || user.email,
        joinedAt: serverTimestamp(),
      });

      const crewDoc = await getDoc(doc(db, 'crews', crewId));
      if (!crewDoc.exists()) {
        await doc(db, 'crews', crewId, 'members', uid).delete();
        throw new Error('Crew not found. Check your invite link.');
      }
      if (crewDoc.data().inviteCode !== code) {
        await doc(db, 'crews', crewId, 'members', uid).delete();
        throw new Error('Invalid or expired invite code.');
      }

      await updateDoc(doc(db, 'users', uid), {
        crewId,
        ...(displayName ? { displayName } : {}),
      });

      const channelsSnap = await getDocs(collection(db, 'crews', crewId, 'channels'));
      for (const ch of channelsSnap.docs) {
        await setDoc(
          doc(db, 'crews', crewId, 'channels', ch.id, 'members', uid),
          { role: 'member', joinedAt: serverTimestamp() }
        );
      }

      await get().loadUserProfile(uid);
      return { uid, crewId };
    } catch (err) {
      setAuthError(toFriendlyError(err));
      throw err;
    }
  },

  signIn: async ({ email, password }) => {
    const { setAuthError } = get();
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(toFriendlyError(err));
      throw err;
    }
  },

  logOut: async () => {
    const { crewId, user, setAuthError } = get();
    setAuthError(null);
    try {
      if (crewId && user) await setPresence(crewId, user.uid, 'offline');
      await signOut(auth);
    } catch (err) {
      setAuthError(toFriendlyError(err));
      throw err;
    }
  },
}));

export const initializeAuth = () => {
  const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
    useAuthStore.getState().setAuthError(null);
    if (fbUser) {
      useAuthStore.setState({ user: fbUser });
      await useAuthStore.getState().loadUserProfile(fbUser.uid);
    } else {
      useAuthStore.setState({
        user: null,
        profile: null,
        crewId: null,
        crew: null,
        crewRole: null,
      });
    }
    useAuthStore.getState().setLoading(false);
  });

  const { user, crewId } = useAuthStore.getState();
  const sub = AppState.addEventListener('change', (next) => {
    const { user: currentUser, crewId: currentCrewId } = useAuthStore.getState();
    if (!currentUser || !currentCrewId) return;
    if (next === 'active') setPresence(currentCrewId, currentUser.uid, 'online');
    else setPresence(currentCrewId, currentUser.uid, 'offline');
  });

  let crewUnsub;
  const crewEffect = () => {
    const currentCrewId = useAuthStore.getState().crewId;
    if (!currentCrewId) {
      useAuthStore.setState({ crew: null });
      return;
    }
    crewUnsub = onSnapshot(doc(db, 'crews', currentCrewId), (snap) => {
      if (snap.exists()) useAuthStore.setState({ crew: snap.data() });
      else useAuthStore.setState({ crew: null });
    });
  };
  crewEffect();

  let fcmUnsub;
  const fcmEffect = async () => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;
    await registerFcmToken(currentUser.uid);
    fcmUnsub = setupFcmListeners((msg) => {
      console.log('[FCM] received:', msg?.notification?.title);
    });
  };

  const unsubCrewId = useAuthStore.subscribe(
    (state) => state.crewId,
    () => {
      crewUnsub?.();
      crewEffect();
    }
  );

  const unsubUser = useAuthStore.subscribe(
    (state) => state.user,
    (user) => {
      if (user) fcmEffect();
      else {
        fcmUnsub?.();
        fcmUnsub = null;
      }
    }
  );

  return () => {
    unsubAuth();
    sub.remove();
    unsubCrewId();
    unsubUser();
    crewUnsub?.();
    fcmUnsub?.();
  };
};

export default useAuthStore;
