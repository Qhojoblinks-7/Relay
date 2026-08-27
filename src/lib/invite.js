// src/lib/invite.js
//
// Invite link helpers. The canonical share format is:
//   relay.app/join?c={crewId}&code={inviteCode}
// For local deep-linking in the prototype we use the `relay://` custom scheme
// (production should serve the relay.app universal link + associated domains).

export function buildInviteLink(crewId, code) {
  return `relay://join?c=${encodeURIComponent(crewId)}&code=${encodeURIComponent(code)}`;
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
export function parseInvite(input) {
  if (!input) return { crewId: '', code: '', raw: '' };
  const cMatch = input.match(/[?&]c=([^&\s#]+)/);
  const codeMatch = input.match(/[?&]code=([^&\s#]+)/);
  if (cMatch && codeMatch) {
    return {
      crewId: decodeURIComponent(cMatch[1]),
      code: decodeURIComponent(codeMatch[1]),
      raw: input,
    };
  }
  // No query params: treat the whole string as a raw invite code.
  return { crewId: '', code: input.trim(), raw: input };
}
