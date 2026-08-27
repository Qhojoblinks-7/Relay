// src/navigation/RootNavigator.js
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants/theme";
import AuthStack from "./AuthStack";
import MainStack from "./MainStack";

export default function RootNavigator() {
  const { loading, user } = useAuth();

  // While Firebase restores the persisted session, show a minimal splash.
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  // Once authenticated, mount the main app; otherwise show the auth flow.
  return user ? <MainStack /> : <AuthStack />;
}
