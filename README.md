# Relay — Production Push-to-Talk Communications Platform

Relay is a production-grade push-to-talk (PTT) mobile application enabling real-time voice communication for production crews, event teams, and field operations. Built with **React Native** and **Expo**, it provides role-based channel access, team management, and low-latency WebRTC audio over private networks.

**Status:** Active Development | **Platform:** iOS & Android | **Language:** JavaScript

---

## Overview

Relay solves field team communication challenges through:

- **Instant Voice Transmission** — Push-to-talk (PTT) model with low-latency WebRTC audio
- **Organized Team Structure** — Crews with role-based access control (owner, admin, member)
- **Flexible Channels** — Public, private, and ad-hoc communication channels per crew
- **Secure Authentication** — Firebase-backed auth with biometric support and friendly error handling
- **Real-Time Presence** — Online/offline/busy status tracking for all team members
- **Push Notifications** — Firebase Cloud Messaging for transmissions and crew events
- **Team Invitations** — QR code-based crew invites for seamless onboarding

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Low-Latency PTT Audio** | WebRTC-powered voice transmission via GetStream Video SDK |
| **Crew & Channel Management** | Create crews, add members, organize communication channels |
| **Hierarchical Permissions** | Two-tier role system: crew-level and channel-level access control |
| **QR Code Invitations** | Share or scan crew invite codes for instant member onboarding |
| **Presence Tracking** | Real-time status visibility (online, offline, busy) |
| **Push Alerts** | FCM-powered notifications for transmissions and crew updates |
| **Skeleton Loading** | Optimistic UI states for fast perceived performance |
| **Biometric-Aware Auth** | Password toggle, autofill support, contextual error messages |

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| **Framework** | React Native 0.81 / Expo SDK 54 |
| **Language** | JavaScript (100%) |
| **State Management** | Zustand |
| **Navigation** | React Navigation 7 |
| **Backend** | Firebase Authentication + Firestore |
| **Real-Time Audio** | GetStream Video SDK / WebRTC |
| **Push Notifications** | Firebase Cloud Messaging (FCM) |
| **Build & Deploy** | EAS Build / Expo Dev Client |

---

## Prerequisites

- **Node.js** 18 or later
- **npm** or **yarn**
- **Expo CLI** — Install via `npm install -g expo-cli`
- **EAS CLI** — Install via `npm install -g eas-cli`
- **Android Studio** (for Android builds)
- **Xcode** (for iOS builds; macOS required)

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/Qhojoblinks-7/Relay.git
cd Relay
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root with your service credentials:

```env
# GetStream Configuration
EXPO_PUBLIC_GETSTREAM_API_KEY=your_getstream_api_key
EXPO_PUBLIC_GETSTREAM_SECRET=your_getstream_secret

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Firebase Setup

Configure your Firebase project:

1. Enable **Email/Password** authentication
2. Create a **Firestore Database** (production rules recommended)
3. Configure **Firebase Cloud Messaging** (FCM)
4. Download credentials:
   - `google-services.json` (place in Android project)
   - `GoogleService-Info.plist` (place in iOS project)

### 4. Run Locally

**Development Server:**
```bash
npm start
```

**On Android:**
```bash
npm run android
```

**On iOS:**
```bash
npm run ios
```

**Web Preview:**
```bash
npm run web
```

### 5. Build for Production

**Prebuild Native Projects:**
```bash
npx expo prebuild --clean
```

**EAS Production Builds:**
```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## Project Structure

```
src/
├── assets/                    # Images, icons, splash screens
├── components/                # Reusable UI components
│   ├── AuthBackground.js
│   ├── AuthHeader.js
│   ├── AddMemberBottomSheet.js
│   ├── QRCodeModal.js
│   ├── QRScannerScreen.js
│   └── Skeleton.js
├── constants/                 # Theme and global configuration
│   ├── theme.js
│   └── globalStyles.js
├── context/                   # React Context providers
│   ├── AuthContext.js
│   └── WebRTCContext.js
├── lib/                       # Business logic and integrations
│   ├── firebase.js
│   ├── getStream.js
│   ├── invite.js
│   ├── notifications.js
│   ├── presence.js
│   └── devToken.js
├── navigation/                # Navigation configuration
│   ├── AuthStack.js
│   ├── MainStack.js
│   ├── AppTabs.js
│   └── RootNavigator.js
├── screens/                   # Screen components
│   ├── auth/
│   │   ├── GetStartedScreen.js
│   │   ├── SignInScreen.js
│   │   ├── CreateAccountScreen.js
│   │   └── JoinCrewScreen.js
│   └── main/
│       ├── DashboardScreen.js
│       ├── MyCrewScreen.js
│       ├── PTTScreen.js
│       └── SettingsScreen.js
├── stores/                    # Zustand state management
│   ├── authStore.js
│   └── webrtcStore.js
└── app.json                   # Expo configuration
```

---

## Architecture

### Authentication Flow

1. **App Launch** → Native splash screen displays
2. **Session Check** → Firebase auth listener evaluates existing session
3. **Navigation Decision** → Route to `MainStack` (authenticated) or `AuthStack` (new user)
4. **Team Assignment** → Prompt user to create or join a crew

```
Start
  ↓
[Firebase Auth Initialized]
  ├─→ Session Valid? → MainStack (Dashboard)
  └─→ No Session? → AuthStack (Get Started)
```

### Data Model

```
users/{uid}
├── displayName: string
├── email: string
├── fcmToken: string
└── createdAt: timestamp

crews/{crewId}
├── name: string
├── ownerUid: string
├── inviteCode: string
└── createdAt: timestamp

crews/{crewId}/members/{uid}          [Crew-level role]
├── crewRole: "owner" | "admin" | "member"
├── displayName: string
└── joinedAt: timestamp

crews/{crewId}/channels/{channelId}
├── name: string
├── type: "open" | "private" | "adhoc"
├── createdBy: string
└── createdAt: timestamp

crews/{crewId}/channels/{channelId}/members/{uid}  [Channel-level role]
├── role: "admin" | "member" | "observer"
└── joinedAt: timestamp
```

### Voice Architecture

- **Channel-to-Call Mapping:** Each crew channel maps to a unique GetStream call ID (`{crewId}:{channelId}`)
- **Token Issuance:** Backend Cloud Function generates scoped access tokens
- **WebRTC Transport:** Peer-to-peer audio with noise cancellation enabled
- **PTT Mode:** Push-to-talk UI activates microphone only during transmission

---

## Security Considerations

✓ **Firestore Security Rules** enforce crew and channel membership  
✓ **GetStream Tokens** scoped to user's channel memberships only  
✓ **Role-Based Access** validated server-side (client-side UI gating is convenience only)  
✓ **No Client Secrets** — All sensitive credentials stored in environment variables  
✓ **Firebase Auth** — Password-based with optional biometric unlock

**Note:** Before production deployment, ensure Security Rules are audited and deployed to Firestore.

---

## Development Roadmap

- [x] Firebase Authentication with friendly error messages
- [x] Custom splash screen with branding
- [x] Skeleton loading states (Dashboard, My Crew)
- [x] QR code-based crew invitations
- [ ] Firestore Security Rules deployment
- [ ] Backend GetStream token issuance (Cloud Functions)
- [ ] Ad-hoc channel auto-cleanup
- [ ] Multi-channel monitoring (background audio)
- [ ] User profile editing
- [ ] Offline mode support

---

## Contributing

Relay is a private project maintained internally. For team contributors:

1. **Branch Strategy** — Create a feature branch from `main` with descriptive naming
2. **Code Style** — Follow existing conventions (ESLint config included)
3. **Testing** — Validate on physical Android and iOS devices before submission
4. **Pull Requests** — Include a clear description, screenshots of UI changes, and testing notes

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Build fails with Expo prebuild** | Run `npx expo prebuild --clean` to force regeneration of native projects |
| **Firebase config not loading** | Verify `.env` file exists in project root and all `EXPO_PUBLIC_*` variables are set |
| **GetStream audio not working** | Confirm API key/secret are valid and the call ID format is `{crewId}:{channelId}` |
| **Notifications not arriving** | Ensure FCM is configured and the app has notification permissions granted |

---

## License

**Proprietary** — All rights reserved. Unauthorized copying or distribution is prohibited.

---

## Support & Contact

For issues, feature requests, or questions, contact the Relay development team via your internal communication channel.

---

**Last Updated:** September 2026 | **Version:** Production  
**Repository:** [Qhojoblinks-7/Relay](https://github.com/Qhojoblinks-7/Relay)
