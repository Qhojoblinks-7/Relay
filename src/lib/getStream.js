// src/lib/getStream.js
//
// GetStream voice helpers. The audio "room" for a crew channel is a GetStream
// call whose id is `{crewId}:{channelId}`. Tokens MUST be issued by a backend
// (see functions/getStreamToken) scoped to the channels the caller belongs to.
// A dev-token fallback is provided so the prototype runs before the function
// is deployed — it is NOT secure and must be removed for production.

import { httpsCallable, getFunctions } from 'firebase/functions';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from './firebase';
import { StreamVideoClient } from '@stream-io/video-react-native-sdk';

// Map a crew channel to its GetStream call id.
export function callIdFor(crewId, channelId) {
  return `${crewId}:${channelId}`;
}

// Look up the caller's channel-scoped role (admin | member | observer) or null.
export async function getChannelRole(crewId, channelId, uid) {
  if (!crewId || !channelId || !uid) return null;
  const memberDoc = await getDoc(
    doc(db, 'crews', crewId, 'channels', channelId, 'members', uid)
  );
  return memberDoc.exists() ? memberDoc.data().role : null;
}

// Fetch a GetStream token.
// Production: Cloud Function `getStreamToken` issues a token scoped to the
//   caller's member channels (call_cids) using the server-side API secret.
// Dev fallback: a dev token (no channel scoping) so the app runs locally.
export async function fetchStreamToken(uid) {
  try {
    const functions = getFunctions();
    const getStreamToken = httpsCallable(functions, 'getStreamToken');
    const res = await getStreamToken({ uid });
    if (res?.data?.token) return res.data.token;
  } catch (err) {
    console.warn(
      '[GetStream] Cloud Function token unavailable, using DEV token:',
      err?.message
    );
  }
  // DEV-ONLY: tokens must be server-issued in production.
  return StreamVideoClient.devToken(uid);
}
