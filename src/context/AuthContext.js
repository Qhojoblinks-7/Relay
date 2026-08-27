// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
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
} from 'firebase/firestore';
import { generateInviteCode } from '../lib/invite';
import { setPresence } from '../lib/presence';
import { registerFcmToken, setupFcmListeners } from '../lib/notifications';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Firebase auth user
  const [profile, setProfile] = useState(null); // users/{uid}
  const [crewId, setCrewId] = useState(null); // users/{uid}.crewId
  const [crew, setCrew] = useState(null); // crews/{crewId}
  const [crewRole, setCrewRole] = useState(null); // crewRole on crew member doc
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Reload the user's Firestore profile + crew membership.
  const loadUserProfile = async (uid) => {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      setProfile(null);
      setCrew(null);
      setCrewRole(null);
      return;
    }

    const data = userDoc.data();
    setProfile(data);
    setCrewId(data.crewId || null);

    if (data.crewId) {
      const memberDoc = await getDoc(
        doc(db, 'crews', data.crewId, 'members', uid)
      );
      if (memberDoc.exists()) {
        setCrewRole(memberDoc.data().crewRole);
        const crewDoc = await getDoc(doc(db, 'crews', data.crewId));
        if (crewDoc.exists()) setCrew(crewDoc.data());
        // Mark the user present now that we know they belong to this crew.
        setPresence(data.crewId, uid, 'online');
      } else {
        setCrew(null);
        setCrewRole(null);
      }
    } else {
      setCrew(null);
      setCrewRole(null);
    }
  };

  // Persist the session across reloads (AsyncStorage persistence in firebase.js).
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setAuthError(null);
      if (fbUser) {
        setUser(fbUser);
        await loadUserProfile(fbUser.uid);
      } else {
        setUser(null);
        setProfile(null);
        setCrewId(null);
        setCrew(null);
        setCrewRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Reflect foreground/background state into presence.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (!user || !crewId) return;
      if (next === 'active') setPresence(crewId, user.uid, 'online');
      else setPresence(crewId, user.uid, 'offline');
    });
    return () => sub.remove();
  }, [user, crewId]);

  // Register this device for FCM push + listen for foreground messages.
  useEffect(() => {
    if (!user) return;
    let unsub;
    (async () => {
      await registerFcmToken(user.uid);
      unsub = setupFcmListeners((msg) => {
        // Transmission/join pings arrive here while the app is open.
        // The in-app presence banner already reflects transmitting state.
        console.log('[FCM] received:', msg?.notification?.title);
      });
    })();
    return () => unsub?.();
  }, [user]);

  // Create a new account AND a brand new crew (caller becomes the owner).
  const signUp = async ({ email, password, displayName, crewName }) => {
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

      // Seed a default "Production" channel and make the owner its admin.
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

      await loadUserProfile(uid);
      return { uid, crewId };
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Join an existing crew via an invite code (caller becomes a member).
  const joinCrew = async ({ email, password, displayName, crewId, code }) => {
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

      // Add the new member to every existing channel so they can listen + talk.
      const channelsSnap = await getDocs(collection(db, 'crews', crewId, 'channels'));
      for (const ch of channelsSnap.docs) {
        await setDoc(
          doc(db, 'crews', crewId, 'channels', ch.id, 'members', uid),
          { role: 'member', joinedAt: serverTimestamp() }
        );
      }

      await loadUserProfile(uid);
      return { uid, crewId };
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Sign in with existing credentials.
  const signIn = async ({ email, password }) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const logOut = async () => {
    setAuthError(null);
    try {
      // Go offline before tearing down the session.
      if (crewId && user) await setPresence(crewId, user.uid, 'offline');
      await signOut(auth);
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        crewId,
        crew,
        crewRole,
        loading,
        authError,
        signUp,
        joinCrew,
        signIn,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
