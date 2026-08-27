// functions/index.js
//
// Backend GetStream token issuance (Step 3 / Step 4 enforcement) + FCM (Step 5).
//
// The client must NEVER mint its own GetStream token. This Cloud Function
// issues a token scoped to the exact channels the caller is a member of
// (`call_cids`), so a non-member literally cannot get a token for a channel
// they don't belong to. It also reads the caller's Firebase uid and binds the
// GetStream identity to it (no more random client ids).
//
// Config (modern `params` API — no deprecated functions.config()):
//   - GETSTREAM_API_KEY  : defineString, supplied via functions/.env
//   - GETSTREAM_API_SECRET: defineSecret, supplied via
//       firebase functions:secrets:set GETSTREAM_API_SECRET
// Deploy:
//   cd functions && npm install
//   firebase deploy --only functions

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { StreamClient } = require('@stream-io/node-sdk');
const { defineString } = require('firebase-functions/params');

admin.initializeApp();

// Both supplied via functions/.env (defineString) — this avoids the Blaze-only
// Secret Manager requirement. For stronger protection on the Blaze plan, switch
// getstreamApiSecret to defineSecret() and set it with
// `firebase functions:secrets:set GETSTREAM_API_SECRET`.
const getstreamApiKey = defineString('GETSTREAM_API_KEY');
const getstreamApiSecret = defineString('GETSTREAM_API_SECRET');

exports.getStreamToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required.');
  }
  const uid = context.auth.uid;

  const apiKey = getstreamApiKey.value();
  const apiSecret = getstreamApiSecret.value();
  const streamClient = new StreamClient(apiKey, apiSecret);

  // Resolve the caller's crew (fall back to the provided crewId).
  const userSnap = await admin
    .firestore()
    .doc(`users/${uid}`)
    .get();
  const crewId = data.crewId || userSnap.data()?.crewId;
  if (!crewId) {
    throw new functions.https.HttpsError('failed-precondition', 'No crew found.');
  }

  // Collect only the channels the caller is a member of.
  const channelsSnap = await admin
    .firestore()
    .collection(`crews/${crewId}/channels`)
    .get();
  const callCids = [];
  for (const ch of channelsSnap.docs) {
    const memberSnap = await admin
      .firestore()
      .doc(`crews/${crewId}/channels/${ch.id}/members/${uid}`)
      .get();
    if (memberSnap.exists()) {
      callCids.push(`${crewId}:${ch.id}`);
    }
  }

  const token = streamClient.generateUserToken({
    user_id: uid,
    call_cids: callCids,
  });

  return { token };
});

// ---------------------------------------------------------------------------
// Step 5 — FCM notifications (production push path).
//
// These require @react-native-firebase/messaging on the client to receive the
// push (register the FCM token to users/{uid}.fcmToken) — not wired in the
// prototype because the native messaging SDK isn't installed. The functions
// are the server-side source of truth for "X joined crew" and transmission
// pings.
// ---------------------------------------------------------------------------

// When a new crew member doc is created, ping the rest of the crew.
exports.onMemberJoined = functions.firestore
  .document('crews/{crewId}/members/{memberId}')
  .onCreate(async (snap, context) => {
    const { crewId, memberId } = context.params;
    const joinedName = snap.data().displayName || 'A new member';
    const membersSnap = await admin
      .firestore()
      .collection(`crews/${crewId}/members`)
      .get();
    const tokens = [];
    for (const m of membersSnap.docs) {
      if (m.id === memberId) continue;
      const userSnap = await admin.firestore().doc(`users/${m.id}`).get();
      const token = userSnap.data()?.fcmToken;
      if (token) tokens.push(token);
    }
    if (tokens.length === 0) return;
    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'New crew member',
        body: `${joinedName} joined the crew`,
      },
    });
  });

// Called by the client when a user starts transmitting on a channel, so crew
// members get a "transmission" ping even when the app is backgrounded.
exports.notifyTransmission = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required.');
  }
  const { crewId, channelId, displayName } = data;
  if (!crewId || !channelId) return null;
  const membersSnap = await admin
    .firestore()
    .collection(`crews/${crewId}/members`)
    .get();
  const tokens = [];
  for (const m of membersSnap.docs) {
    if (m.id === context.auth.uid) continue;
    const userSnap = await admin.firestore().doc(`users/${m.id}`).get();
    const token = userSnap.data()?.fcmToken;
    if (token) tokens.push(token);
  }
  if (tokens.length === 0) return null;
  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: 'Transmission',
      body: `${displayName || 'Someone'} is talking on ${channelId}`,
    },
  });
  return { sent: tokens.length };
});
