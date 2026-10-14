// src/lib/invite.js
//
// Invite link helpers. The canonical share format uses HTTPS so links
// appear as clickable hyperlinks in messages, email, and social apps:
//   https://relay.app/join?c={crewId}&code={inviteCode}
// Deep link handlers accept both https:// and relay:// schemes.
// iOS requires associated domains + Android requires assetlinks.json for
// universal/App Links to open the app directly from HTTPS.

export function buildInviteLink(crewId, code) {
  return `https://relay.app/join?c=${encodeURIComponent(crewId)}&code=${encodeURIComponent(code)}`;
}

// Generate a short, human-shareable invite token (reusable, admin-rotatable).
export function generateInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

// Extract crewId (`c`) and invite code (`code`) from an invite link or raw code.
// Returns { crewId, code, raw }. When only a raw token is pasted, crewId is ''.
// Supports:
//   1. Deep link:    relay://join?c={crewId}&code={code}
//   2. HTTPS link:   relay.app/join?c={crewId}&code={code}
//   3. Space-sep:    {crewId} {code}  (short, human-readable)
export function parseInvite(input) {
  if (!input) return { crewId: '', code: '', raw: input };
  const cMatch = input.match(/[?&]c=([^&\s#]+)/);
  const codeMatch = input.match(/[?&]code=([^&\s#]+)/);
  if (cMatch && codeMatch) {
    return {
      crewId: decodeURIComponent(cMatch[1]),
      code: decodeURIComponent(codeMatch[1]),
      raw: input,
    };
  }
  // A link may carry only the `code` param (no crew id `c`); extract it.
  if (codeMatch) {
    return { crewId: '', code: decodeURIComponent(codeMatch[1]), raw: input };
  }
  // No query params: try space-separated "crewId code" format.
  const parts = input.trim().split(/\s+/);
  if (parts.length === 2) {
    const [crewId, code] = parts;
    // Sanity-check length ranges: Firestore doc IDs are ~20 chars, invite codes ~8.
    if (crewId.length >= 10 && code.length >= 4) {
      return { crewId: decodeURIComponent(crewId), code: decodeURIComponent(code), raw: input };
    }
  }
  // Fall back: treat the whole string as a raw invite code.
  return { crewId: '', code: input.trim(), raw: input };
}
