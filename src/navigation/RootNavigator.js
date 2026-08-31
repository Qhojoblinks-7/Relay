// src/navigation/RootNavigator.js
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useEffect, useRef, useState } from "react";
import useAuthStore from "../stores/authStore";
import { COLORS } from "../constants/theme";
import AuthStack from "./AuthStack";
import MainStack from "./MainStack";
import logo from "../assets/icon-1024.png";

export default function RootNavigator({ onReady, onGetStarted }) {
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);
  const readyRef = useRef(false);
  const [splashDismissed, setSplashDismissed] = useState(false);

  useEffect(() => {
    if (!loading && !readyRef.current && onReady) {
      readyRef.current = true;
      onReady();
    }
  }, [loading, onReady]);

  if (loading || !splashDismissed) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
        <Image source={logo} style={{ width: 500, height: 500, marginBottom: 12, marginTop: -60 }} />
        <TouchableOpacity onPress={() => { setSplashDismissed(true); onGetStarted?.(); }}>
          <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: "900" }}>Get Started</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return user ? <MainStack /> : <AuthStack />;
}
