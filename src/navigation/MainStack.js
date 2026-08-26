// src/navigation/MainStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppTabs from './AppTabs';
import PTTScreen from '../screens/main/PTTScreen';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      <Stack.Screen 
        name="PTT" 
        component={PTTScreen} 
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} 
      />
    </Stack.Navigator>
  );
}