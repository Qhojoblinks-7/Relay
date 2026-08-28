// src/navigation/RootNavigator.js
import { ActivityIndicator, View } from "react-native";
import useAuthStore from "../stores/authStore";
import { COLORS } from "../constants/theme";
import AuthStack from "./AuthStack";
import MainStack from "./MainStack";

export default function RootNavigator() {
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return user ? <MainStack /> : <AuthStack />;
}
