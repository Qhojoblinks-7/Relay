// src/navigation/MainStack.js
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppTabs from './AppTabs';
import PTTScreen from '../screens/main/PTTScreen';
import JoinCrewScreen from '../screens/auth/JoinCrewScreen';

const Stack = createNativeStackNavigator();

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

export default function MainStack() {
  useInviteDeepLink();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={AppTabs} />
      <Stack.Screen 
        name="PTT" 
        component={PTTScreen} 
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} 
      />
      <Stack.Screen name="JoinCrew" component={JoinCrewScreen} />
    </Stack.Navigator>
  );
}