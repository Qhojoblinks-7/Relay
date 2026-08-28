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
      setAuthError(err.message);
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
      setAuthError(err.message);
      throw err;
    }
  },

  joinCrew: async ({ email, password, displayName, crewId, code }) => {
    const { setAuthError } = get();
    setAuthError(null);
    try {
      const crewDoc = await getDoc(doc(db, 'crews', crewId));
      if (!crewDoc.exists()) {
        throw new Error('Crew not found. Check your invite link.');
      }
      if (crewDoc.data().inviteCode !== code) {
        throw new Error('Invalid or expired invite code.');
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      await setDoc(doc(db, 'users', uid), {
        displayName,
        email,
        crewId,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'crews', crewId, 'members', uid), {
        crewRole: 'member',
        displayName,
        joinedAt: serverTimestamp(),
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
      setAuthError(err.message);
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

      const crewDoc = await getDoc(doc(db, 'crews', crewId));
      if (!crewDoc.exists()) {
        throw new Error('Crew not found. Check your invite link.');
      }
      if (crewDoc.data().inviteCode !== code) {
        throw new Error('Invalid or expired invite code.');
      }

      const uid = user.uid;

      await updateDoc(doc(db, 'users', uid), {
        crewId,
        ...(displayName ? { displayName } : {}),
      });

      await setDoc(doc(db, 'crews', crewId, 'members', uid), {
        crewRole: 'member',
        displayName: displayName || user.email,
        joinedAt: serverTimestamp(),
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
      setAuthError(err.message);
      throw err;
    }
  },

  signIn: async ({ email, password }) => {
    const { setAuthError } = get();
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(err.message);
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
      setAuthError(err.message);
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
