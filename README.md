# Relay — Walkie‑Talkie (PTT) Crew Comms App

Relay is a push‑to‑talk (PTT) mobile app for crews (productions, events, field teams).
A **Crew** is a closed radio network; **Channels** are the individual frequencies;
**Membership + role** is what gives a person a radio and the right to talk.

> Current status: polished front‑end prototype. Auth, backend, and real
> permission enforcement are not yet implemented (see "Current State").

---

## Core Concept

| Concept  | Radio analogy        | In the app                          |
|----------|----------------------|------------------------------------|
| Crew     | A closed radio network | `crews/{crewId}`                 |
| Channel  | A frequency          | `channels/{channelId}` (Production, Main Cam…) |
| Member   | Someone with a radio | `crewMembers/{uid}` with a `role` |
| Talk     | Press‑to‑transmit    | PTT screen → GetStream audio       |

**Principle:** membership and the right to listen/speak MUST be enforced on the
server (Firestore Security Rules + GetStream call auth), not just hidden in the UI.

---

## Current State

Working:
- Navigation shell (auth ↔ main, bottom tabs, PTT modal)
- UI/theme, animations, haptics, bottom sheet, QR scanner component
- Real WebRTC audio via GetStream (mic enable/disable, level meter) on the default channel
- Share‑sheet invite

Missing / stubbed:
- `AuthContext` is a fake `useState(false)` boolean — no user, no session, no persistence
- `src/lib/firebase.js` is initialized but imported nowhere
- Invite link is hardcoded (`relay.app/join/crew-prod-1`); no validation, no deep linking
- QR scan only writes text into a name field — no invite handshake
- GetStream uses a dev token with a random `user_xxx` id
- `Dashboard` opens PTT but never calls `joinChannel()` (stays on "Production")
- No role system; "Admin Operator" is hardcoded text in Settings
- `logout()` does not disconnect the GetStream call
- All crew/channel/member data is hardcoded `useState`

---

## Data Model (Firestore)

There are **two independent role layers** so a user can be an Admin of one channel
while remaining a Member or Observer of another:

1. **Crew role** — administrative authority over the *whole crew*
   (invite people, create/delete channels, rotate invite token). One per crew,
   stored on `crews/{crewId}/members/{uid}`.
2. **Channel role** — authority over a *single channel* (manage that feed).
   Stored per channel on `channels/{channelId}/members/{uid}`.

```
users/{uid}
  displayName: string
  email: string
  fcmToken: string
  createdAt: timestamp

crews/{crewId}
  name: string
  ownerUid: string
  inviteCode: string        // generated on creation, rotatable by admin
  createdAt: timestamp

crews/{crewId}/members/{uid}          // CREW-LEVEL role (one per crew)
  crewRole: "owner" | "admin" | "member" | "observer"
  displayName: string
  joinedAt: timestamp

crews/{crewId}/channels/{channelId}
  name: string
  type: "open" | "private" | "adhoc"
  createdBy: string
  createdAt: timestamp

crews/{crewId}/channels/{channelId}/members/{uid}   // CHANNEL-SCOPED role
  role: "admin" | "member" | "observer"
  // admin  -> can manage THIS channel (rename, add/remove members, sub-talk)
  // member -> can listen + talk (PTT)
  // observer -> receive-only, mic never enabled
```

Talk permission is derived from the channel role (`observer` = listen‑only);
mere membership is enough to listen.

---

## Roles & Permissions

### Crew‑level (who runs the crew)
| Capability                | owner | admin | member | observer |
|---------------------------|:-----:|:-----:|:------:|:--------:|
| Create crew               |  ✅   |  ❌   |  ❌    |   ❌     |
| Invite / add members      |  ✅   |  ✅   |  ❌    |   ❌     |
| Create / delete channels  |  ✅   |  ✅   | ❌(adhoc only) | ❌ |
| Rotate invite token       |  ✅   |  ✅   |  ❌    |   ❌     |
| Remove members (crew)     |  ✅   |  ✅*  |  ❌    |   ❌     |

\* admins cannot remove the owner.

### Channel‑level (who runs a specific feed)
| Capability                | admin | member | observer |
|---------------------------|:-----:|:------:|:--------:|
| Listen                    |  ✅   |  ✅    |   ✅     |
| Talk (PTT)                |  ✅   |  ✅    |   ❌     |
| Rename channel            |  ✅   |  ❌    |   ❌     |
| Add / remove channel members | ✅ |  ❌    |   ❌     |
| Create sub‑talk groups    |  ✅   |  ❌    |   ❌     |
| Kick inactive members     |  ✅   |  ❌    |   ❌     |

### Real‑World Example
- **Camera Team Channel:** you are **Admin** — create sub‑talk groups, invite
  operators, kick inactive members, rename the channel.
- **Stage Manager All‑Call Channel:** you are a **Member** — press‑to‑talk and
  listen, but cannot rename or add/remove others.
- **Executive Overview Channel:** you are an **Observer** — listen to updates,
  cannot transmit or manage settings.

UI gating is convenience only. Real enforcement = Firestore Rules + GetStream tokens.

### Firestore Rule Enforcement (channel‑scoped)
```javascript
// True if the caller is an admin of the specific channel
function isChannelAdmin(channelId) {
  return get(/databases/$(database)/documents
    /crews/$(crewId)/channels/$(channelId)/members/$(request.auth.uid))
    .data.role == 'admin';
}

// Example: only channel admins may rename a channel
match /crews/{crewId}/channels/{channelId} {
  allow update: if isChannelAdmin(channelId);
}
```

---

## Invite / Join Flow (crew‑bound)

1. Owner/admin taps "Share Invite" → generate/ensure `crew.inviteCode`.
2. Build link: `relay.app/join?c={crewId}&code={inviteCode}` (QR encodes the same).
3. Member taps link (deep link) or scans QR → `JoinCrew` pre‑filled.
4. Validate `code` against `crew.inviteCode`.
   - valid → create `crewMembers/{uid}` (role: member) → login → MainTabs
   - invalid/expired → show error, do not grant access.

---

## Voice Layer (GetStream)

- Map a crew channel → a GetStream call: `callId = "{crewId}:{channelId}"`.
- Issue GetStream tokens from a **backend** (Cloud Function), scoped with
  `call_cids` = only channels the user is a member of.
- Bind token identity to the Firebase `uid` (no more random `user_xxx`).
- Fix `Dashboard` → PTT so it calls `joinChannel(callId)` instead of only
  passing `channelName` to the UI.
- `logout()` must disconnect the active call / client.

---

## Implementation Roadmap

### Step 1 — Identity + Crew + Membership
**Goal:** real, persistent auth and a crew the user belongs to.
**What's needed:**
- Wire Firebase Auth into `AuthContext` (`login`, `logout`, `signup`, `user`, persistence via `AsyncStorage`).
- Create `users/{uid}` and `crews/{crewId}` + `crews/{crewId}/members/{uid}` on signup/create.
- Replace the mock boolean + hardcoded "Admin Operator" with real user/role data.
**Files:** `src/context/AuthContext.js`, `src/lib/firebase.js` (now used),
`CreateAccountScreen.js`, `JoinCrewScreen.js`, `SettingsScreen.js`, `App.js`.
**Done when:** reload keeps you logged in; user has a real uid + crew + role.

### Step 2 — Invites (links + QR + deep linking)
**Goal:** members join a *specific* crew via link or QR.
**What's needed:**
- Generate/store `crew.inviteCode`; build `relay.app/join?c=&code=`.
- Add deep linking (Expo `expo-linking` / `app.json` scheme) → `JoinCrew` prefilled.
- Validate code before writing membership; repurpose `QRScannerScreen.onScanned`
  to parse invite payloads, not just names.
**Files:** `JoinCrewScreen.js`, `MyCrewScreen.js`, `QRScannerScreen.js`,
`AddMemberBottomSheet.js`, `app.json`, `AuthStack.js`.
**Done when:** a member using a real invite lands inside the correct crew; bad codes fail.

### Step 3 — Channels + Secure Voice
**Goal:** talk on the right channel, only if allowed.
**What's needed:**
- `crews/{crewId}/channels/{channelId}` + channel members.
- Backend GetStream token issuance scoped to channel membership.
- `joinChannel(crewId:channelId)` called from `Dashboard` → `PTT`.
- Bind GetStream identity to Firebase uid; disconnect on logout.
**Files:** `WebRTCContext.js`, `DashboardScreen.js`, `PTTScreen.js`,
new Cloud Function for tokens.
**Done when:** selecting a channel actually switches the audio room; non‑members can't get a token.

### Step 4 — Roles & Server Enforcement
**Goal:** admin powers are real and protected.
**What's needed:**
- UI gating: show Add Member / Create Channel / Share Invite only for
  `role ∈ {owner, admin}`.
- Firestore Security Rules: crew access requires `crewRole` on
  `crews/{crewId}/members/{uid}`; channel management requires the channel‑scoped
  `role: "admin"` on `crews/{crewId}/channels/{channelId}/members/{uid}`
  (use the `isChannelAdmin(channelId)` helper); talk requires `role != "observer"`.
- GetStream call auth restricting `call_cids` to member channels.
**Files:** `MyCrewScreen.js`, `DashboardScreen.js`, `SettingsScreen.js`,
`firestore.rules`, Cloud Function.
**Done when:** a member cannot see/modify crew admin functions or join private audio.

### Step 5 — Presence & Notifications (polish)
**Goal:** feel like live radio.
**What's needed:**
- Presence (online/busy/offline) from Firestore/RTDB; `busy` = transmitting or DND.
- FCM notifications: incoming/missed PTT, "X joined crew".
- Profile/crew settings editing; remove members; rotate invite.
**Files:** `MyCrewScreen.js`, `SettingsScreen.js`, Cloud Function (FCM), presence listener.
**Done when:** statuses are live and crew receives transmission pings.

---

## Security Checklist (non‑negotiable for PTT)
- [ ] Auth required for every screen (already routed via `RootNavigator`).
- [ ] Firestore Rules deny access without a membership doc.
- [ ] GetStream tokens issued server‑side, scoped to member channels only.
- [ ] Invite codes validated; support rotation/expiry.
- [ ] `logout` disconnects active audio.
- [ ] No secrets/API keys in client (move to `app.json` `extra` / env).

---

## Resolved Decisions

The four open questions are resolved with the following production‑oriented defaults.

### 1. Invite Token Strategy
- **Decision:** Reusable invite token with an admin reset switch.
- **Why:** In high‑pressure event environments, single‑use links slow down setup.
  A reusable QR code (e.g. printed on a sound‑desk badge) lets crew join instantly.
- **Implementation:** store an active `inviteToken` on the `crews/{crewId}` doc; admins
  can regenerate it to invalidate all prior links after the show. No expiry by default;
  rotation is the invalidation mechanism.

### 2. Channel Creation Permissions
- **Decision:** Admins own top‑level channels; operators may spin up temporary ad‑hoc sub‑channels.
- **Why:** Radio clutter destroys coordination. Restrict core channels
  (*Stage Ops*, *Audio Booth*) to admins, but allow operators to open direct 1:1 or
  private sub‑talk channels that auto‑cleanup when all members disconnect.
- **Implementation:** `type: "open" | "private" | "adhoc"`; `adhoc` channels are created
  by any member and deleted via a Cloud Function when `channelMembers` is empty.

### 3. Listen‑Only (Observer) Roles
- **Decision:** Add a dedicated channel‑scoped `observer` role.
- **Why:** Exec producers, client reps, and trainees need to monitor feeds without
  accidentally keying the mic.
- **Implementation:** `role: "observer"` in `channels/{channelId}/members/{uid}` disables
  the PTT button in the UI and locks the WebRTC stream to receive‑only (mic never enabled).
  A user can be `observer` on one channel and `admin`/`member` on another.

### 4. Cross‑Crew Communication
- **Decision:** Multi‑channel monitoring with an "All‑Call" priority override.
- **Why:** Sound/lighting leads stay on their primary feed while remaining reachable by
  the Stage Manager.
- **Implementation:** use WebRTC multi‑stream to play background channels at ~40% volume
  and bump an emergency "All‑Call" transmission to 100% volume.

---

## Role Summary

Roles are **two‑layered** (see "Roles & Permissions" above):

- **Crew level** (`crewRole` on `crews/{crewId}/members/{uid}`): `owner` › `admin` ›
  `member` › `observer` — controls crew administration (invite, create channels, rotate token).
- **Channel level** (`role` on `channels/{channelId}/members/{uid}`): `admin` › `member` ›
  `observer` — controls a single feed. A user can be **Admin of one channel and Member or
  Observer of another**. Observer is always receive‑only.
