// src/lib/presence.js
//
// Live presence is stored on the crew member doc (so the roster can read it
// with a single listener). States: 'online' | 'busy' (transmitting or DND)
// | 'offline'. `transmittingChannel` records which channel is live.

import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function setPresence(crewId, uid, status, transmittingChannel = null) {
  if (!crewId || !uid) return;
  try {
    await updateDoc(doc(db, 'crews', crewId, 'members', uid), {
      presence: status,
      transmittingChannel: status === 'busy' ? transmittingChannel : null,
    });
  } catch (e) {
    console.warn('[presence] update failed:', e?.message);
  }
}
