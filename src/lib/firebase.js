// src/lib/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Real config: env vars (EXPO_PUBLIC_FIREBASE_*) take priority, then app.json,
// then placeholders so the app still builds before you've pasted your keys.
const fromAppJson =
  Constants.expoConfig?.extra?.firebase ||
  Constants.manifest?.extra?.firebase ||
  {};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || fromAppJson.apiKey || 'YOUR_API_KEY',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || fromAppJson.authDomain || 'YOUR_PROJECT.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || fromAppJson.projectId || 'YOUR_PROJECT_ID',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || fromAppJson.storageBucket || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || fromAppJson.messagingSenderId || 'YOUR_SENDER_ID',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || fromAppJson.appId || 'YOUR_APP_ID',
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
