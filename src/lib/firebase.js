// src/lib/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Real config lives in app.json -> expo.extra.firebase (see README "Security
// Checklist"). Fall back to placeholders only so the app still builds before
// you've pasted your keys.
const firebaseConfig =
  Constants.expoConfig?.extra?.firebase ||
  Constants.manifest?.extra?.firebase ||
  {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  };

if (
  !firebaseConfig?.apiKey ||
  firebaseConfig.apiKey === 'YOUR_API_KEY'
) {
  // Surfaced loudly so misconfiguration is obvious during development.
  console.warn(
    '[Firebase] Using placeholder config. Add your project keys under ' +
      'app.json -> expo.extra.firebase to enable auth + Firestore.'
  );
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
