// src/lib/notifications.js
//
// FCM client wiring for Step 5 push ("X joined crew", transmission pings).
//
// @react-native-firebase/messaging is a NATIVE module. It is required lazily
// inside try/catch so the app still builds/runs before `npx expo install`
// adds it (push is simply disabled until then). Once installed and the native
// google-services / APNs config is in place, this module activates.

import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { httpsCallable, getFunctions } from 'firebase/functions';

let messaging = null;
try {
  // eslint-disable-next-line global-require
  messaging = require('@react-native-firebase/messaging').default;
} catch (e) {
  console.warn('[FCM] @react-native-firebase/messaging not installed — push disabled.');
}

export function isMessagingAvailable() {
  return !!messaging;
}

// Register this device's FCM token on the user doc (read by the Cloud
// Functions to target the crew). Also keeps it fresh across token refreshes.
export async function registerFcmToken(uid) {
  if (!messaging || !uid) return;
  try {
    const authStatus = await messaging().requestPermission();
    // -1 / denied => skip. On iOS <12 requestPermission returns a boolean.
    if (authStatus === -1 || authStatus === false) return;

    const token = await messaging().getToken();
    if (token) {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token });
    }

    messaging().onTokenRefresh((newToken) => {
      if (newToken) updateDoc(doc(db, 'users', uid), { fcmToken: newToken });
    });
  } catch (e) {
    console.warn('[FCM] token registration failed:', e?.message);
  }
}

// Foreground messages (app open). The in-app presence banner already shows
// who's transmitting; this is the hook for toasts/alerts if you want one.
export function setupFcmListeners(onMessage) {
  if (!messaging) return () => {};
  const unsub = messaging().onMessage(async (remoteMessage) => {
    console.log('[FCM] foreground message:', remoteMessage?.notification);
    onMessage?.(remoteMessage);
  });
  return unsub;
}

// Must be registered once at app startup (module scope) to handle messages
// while the app is backgrounded/killed.
export function setupBackgroundFcm() {
  if (!messaging) return;
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCM] background message:', remoteMessage?.notification);
  });
}

// Ask the backend to ping the crew that this user started transmitting.
export async function notifyTransmission({ crewId, channelId, displayName }) {
  if (!crewId || !channelId) return;
  try {
    const fn = httpsCallable(getFunctions(), 'notifyTransmission');
    await fn({ crewId, channelId, displayName });
  } catch (e) {
    console.warn('[FCM] notifyTransmission failed:', e?.message);
  }
}
