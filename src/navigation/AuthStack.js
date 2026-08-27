// src/navigation/AuthStack.js
import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

// Import the screens
import GetStartedScreen from '../screens/auth/GetStartedScreen';
import JoinCrewScreen from '../screens/auth/JoinCrewScreen';
import CreateAccountScreen from '../screens/auth/CreateAccountScreen';
import SignInScreen from '../screens/auth/SignInScreen';

// Route to JoinCrew (pre-filled) when an invite deep link is opened.
function useInviteDeepLink() {
  const navigation = useNavigation();

  useEffect(() => {
    const handleUrl = (url) => {
      if (!url || !url.includes('c=') || !url.includes('code=')) return;
      navigation.navigate('JoinCrew', { prefillLink: url });
    };

    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => sub.remove();
  }, [navigation]);
}

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  useInviteDeepLink();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // Hides the default white header
        animation: 'slide_from_right' // Smooth modern transition
      }}
    >
      <Stack.Screen name="GetStarted" component={GetStartedScreen} />
      <Stack.Screen name="JoinCrew" component={JoinCrewScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
    </Stack.Navigator>
  );
}
