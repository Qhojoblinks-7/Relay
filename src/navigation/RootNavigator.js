// src/navigation/RootNavigator.js
import { ActivityIndicator, Image, View } from "react-native";
import { useEffect, useRef } from "react";
import useAuthStore from "../stores/authStore";
import { COLORS } from "../constants/theme";
import AuthStack from "./AuthStack";
import MainStack from "./MainStack";
import logo from "../assets/icon-1024.png";

export default function RootNavigator({ onReady }) {
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!loading && !readyRef.current && onReady) {
      readyRef.current = true;
      onReady();
    }
  }, [loading, onReady]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
        <Image source={logo} style={{ width: 120, height: 120, marginBottom: 24 }} />
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return user ? <MainStack /> : <AuthStack />;
}
