// App.js
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import { AuthProvider } from "./src/context/AuthContext";
import { WebRTCProvider } from "./src/context/WebRTCContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { COLORS } from "./src/constants/theme";
import { setupBackgroundFcm } from "./src/lib/notifications";

SplashScreen.preventAutoHideAsync();

setupBackgroundFcm();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  const onReady = useCallback(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  return (
    <AuthProvider>
      <WebRTCProvider>
        <StatusBar style="light" backgroundColor={COLORS.background} />

        <NavigationContainer>
          <RootNavigator onReady={onReady} />
        </NavigationContainer>
      </WebRTCProvider>
    </AuthProvider>
  );
}
