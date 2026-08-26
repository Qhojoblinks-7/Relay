// src/navigation/AuthStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import the screens
import GetStartedScreen from '../screens/auth/GetStartedScreen';
import JoinCrewScreen from '../screens/auth/JoinCrewScreen';
import CreateAccountScreen from '../screens/auth/CreateAccountScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
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
    </Stack.Navigator>
  );
}