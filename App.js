// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/context/AuthContext";
import { WebRTCProvider } from "./src/context/WebRTCContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { COLORS } from "./src/constants/theme";

export default function App() {
  return (
    <AuthProvider>
      <WebRTCProvider>
        {/* Forces the phone's top status bar (battery, time) to be white on your dark background */}
        <StatusBar style="light" backgroundColor={COLORS.background} />

        <NavigationContainer>
          {/* Switches between the auth flow and the main app based on auth state */}
          <RootNavigator />
        </NavigationContainer>
      </WebRTCProvider>
    </AuthProvider>
  );
}
