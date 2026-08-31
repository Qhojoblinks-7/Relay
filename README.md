# Relay — Push-to-Talk Crew Communications

Relay is a production-grade push-to-talk (PTT) mobile app built with React Native and Expo. It enables production crews, event teams, and field operations to communicate over private, role-based audio channels in real time.

## Features

- **Push-to-Talk (PTT) Audio** — Low-latency WebRTC voice via GetStream Video SDK
- **Crew Management** — Create crews, invite members, assign roles
- **Channel-Based Communication** — Open, private, and ad-hoc channels per crew
- **Role-Based Access Control** — Two-layer permissions: crew-level and channel-level
- **QR Code Invites** — Share or scan crew invite codes for instant onboarding
- **Presence Tracking** — Real-time online/offline/busy status
- **Push Notifications** — FCM-powered alerts for transmissions and crew events
- **Skeleton Loading** — Optimistic loading states on Dashboard and My Crew
- **Biometric-Aware Auth** — Password visibility toggle, autofill support, friendly error messages

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.81 / Expo SDK 54 |
| Language | JavaScript |
| State Management | Zustand |
| Navigation | React Navigation 7 |
| Backend | Firebase Auth + Firestore |
| Real-Time Audio | GetStream Video SDK / WebRTC |
| Notifications | Firebase Cloud Messaging |
| Build | EAS Build / Expo Dev Client |

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

## Environment Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root:

```env
EXPO_PUBLIC_GETSTREAM_API_KEY=your_getstream_api_key
EXPO_PUBLIC_GETSTREAM_SECRET=your_getstream_secret
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

4. Add your Firebase config to `app.json` under `expo.extra.firebase` or ensure `.env` values are loaded.

5. Configure Firebase in your project:
   - Enable Email/Password authentication
   - Create Firestore database
   - Set up Firebase Cloud Messaging
   - Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

## Running the App

### Development

```bash
# Start Expo dev server
npm start

# Run on Android emulator/device
npm run android

# Run on iOS simulator
npm run ios

# Run in web browser
npm run web
```

### Build

```bash
# Prebuild native projects
npx expo prebuild --clean

# Run development build on Android
npx expo run:android

# Run development build on iOS
npx expo run:ios

# Production build via EAS
eas build --platform android --profile production
eas build --platform ios --profile production
```

## Project Structure

```
src/
  assets/              # Images, icons, splash screens
  components/          # Reusable UI components
    AuthBackground.js
    AuthHeader.js
    AddMemberBottomSheet.js
    QRCodeModal.js
    QRScannerScreen.js
    Skeleton.js
  constants/           # Theme and global styles
    theme.js
    globalStyles.js
  context/             # React contexts
    AuthContext.js
    WebRTCContext.js
  lib/                 # Business logic and integrations
    firebase.js
    getStream.js
    invite.js
    notifications.js
    presence.js
    devToken.js
  navigation/          # Navigation configuration
    AuthStack.js
    MainStack.js
    AppTabs.js
    RootNavigator.js
  screens/
    auth/              # Authentication screens
      GetStartedScreen.js
      SignInScreen.js
      CreateAccountScreen.js
      JoinCrewScreen.js
    main/              # Main app screens
      DashboardScreen.js
      MyCrewScreen.js
      PTTScreen.js
      SettingsScreen.js
  stores/              # Zustand state stores
    authStore.js
    webrtcStore.js
```

## Architecture

### Authentication Flow

1. App launches → native splash screen displayed
2. `RootNavigator` initializes Firebase auth listener
3. If user session exists → `MainStack` (Dashboard)
4. If no session → `AuthStack` (Get Started → Sign In / Create Account)
5. Post-auth → crew assignment or dashboard

### Data Model

```
users/{uid}
  displayName, email, fcmToken, createdAt

crews/{crewId}
  name, ownerUid, inviteCode, createdAt

crews/{crewId}/members/{uid}         # Crew-level role
  crewRole: "owner" | "admin" | "member"
  displayName, joinedAt

crews/{crewId}/channels/{channelId}
  name, type: "open" | "private" | "adhoc"
  createdBy, createdAt

crews/{crewId}/channels/{channelId}/members/{uid}  # Channel-level role
  role: "admin" | "member" | "observer"
```

### Voice Architecture

- Crew channels map to GetStream call IDs: `{crewId}:{channelId}`
- Backend issues scoped tokens via Cloud Functions
- WebRTC handles peer-to-peer audio with noise cancellation
- PTT mode enables mic only while transmitting

## Security

- Firestore Security Rules enforce crew/channel membership
- GetStream tokens scoped to user's channel memberships
- Client-side role gating for UI convenience only
- No secrets stored in client code

## Roadmap

- [x] Firebase Auth with friendly error messages
- [x] Splash screen with logo and "Get Started" interaction
- [x] Skeleton loading states
- [ ] Firestore Security Rules deployment
- [ ] Backend GetStream token issuance
- [ ] Ad-hoc channel auto-cleanup
- [ ] Multi-channel monitoring (background audio)
- [ ] Profile editing
- [ ] Offline mode support

## Contributing

This is a private project. For internal contributors:

1. Create a feature branch from `main`
2. Make changes following existing code conventions
3. Test on physical Android/iOS devices
4. Submit PR with description and screenshots

## License

Proprietary — All rights reserved.
