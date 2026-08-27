// src/lib/getStream.js
//
// GetStream voice helpers. The audio "room" for a crew channel is a GetStream
// call whose id is `{crewId}:{channelId}`. Tokens MUST be issued by a backend
// (see functions/getStreamToken) scoped to the channels the caller belongs to.
// A dev-token fallback (runtime-minted for the signed-in uid) lets the
// prototype run before the function is deployed — it is unrestricted and NOT
// secure; deploy getStreamToken for production.

import { httpsCallable, getFunctions } from 'firebase/functions';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from './firebase';
import Constants from 'expo-constants';
import { createDevToken } from './devToken';

// Map a crew channel to its GetStream call id. GetStream call ids may only
// contain a-z, 0-9, _ and - (no ':'), so use '_' to join crew + channel.
export function callIdFor(crewId, channelId) {
  return `${crewId}_${channelId}`;
}

// Look up the caller's channel-scoped role (admin | member | observer) or null.
export async function getChannelRole(crewId, channelId, uid) {
  if (!crewId || !channelId || !uid) return null;
  const memberDoc = await getDoc(
    doc(db, 'crews', crewId, 'channels', channelId, 'members', uid)
  );
  const role = memberDoc.exists() ? memberDoc.data().role : null;
  console.log('[getStream] getChannelRole', { crewId, channelId, uid, exists: memberDoc.exists(), role });
  if (!role && memberDoc.exists()) {
    console.warn('[getStream] member doc exists but role is missing, defaulting to member');
    return 'member';
  }
  return role;
}

// Fetch a GetStream token.
// Production: Cloud Function `getStreamToken` issues a token scoped to the
//   caller's member channels (call_cids) using the server-side API secret.
// Dev mode (extra.getstream.useDevToken) uses a runtime dev token; otherwise it
// calls the Cloud Function and falls back to a dev token if that fails.
export async function fetchStreamToken(uid, crewId) {
  // Dev mode: skip the backend token function entirely (e.g. when Cloud Functions
  // can't be deployed — they require the Blaze plan / a card). Dev tokens are
  // unrestricted, so this is fine for a prototype but NOT for production.
  const useDevToken =
    Constants.expoConfig?.extra?.getstream?.useDevToken ||
    Constants.manifest?.extra?.getstream?.useDevToken;
  const devSecret =
    process.env.EXPO_PUBLIC_GETSTREAM_SECRET ||
    Constants.expoConfig?.extra?.getstream?.secret ||
    Constants.manifest?.extra?.getstream?.secret;
  if (useDevToken) {
    console.warn('[GetStream] dev mode: using client dev token for', uid);
    return createDevToken(uid, devSecret);
  }

  try {
    const functions = getFunctions();
    console.log('[GetStream] getFunctions region:', functions?.region || 'unknown');
    const getStreamToken = httpsCallable(functions, 'getStreamToken');
    console.log('[GetStream] calling Cloud Function getStreamToken for', uid);
    const res = await getStreamToken({ uid, crewId });
    console.log('[GetStream] Cloud Function response:', res?.data);
    if (res?.data?.token) return res.data.token;
  } catch (err) {
    console.warn(
      '[GetStream] Cloud Function token unavailable, using DEV token:',
      err?.message,
      err?.code
    );
  }

  // Dev fallback: mint a token for THIS user's id so the prototype runs without
  // the Cloud Function. A static/copied dev token will NOT match the signed-in
  // uid and fails with "userToken does not have a user_id or is not matching".
  // Dev tokens are unrestricted (no call_cids) — deploy getStreamToken for
  // production-grade, channel-scoped security.
  console.warn(
    '[GetStream] Using client dev token for',
    uid,
    '- deploy the getStreamToken Cloud Function for production security.'
  );
  return createDevToken(uid, devSecret);
}
